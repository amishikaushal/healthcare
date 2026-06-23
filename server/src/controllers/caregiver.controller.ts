import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'

function getCaregiverId(req: Request): string {
  // caregivers table stores user_id, not a separate id token field
  // We look up via userId
  return req.user!.userId
}

// ── GET /caregiver/dashboard ──────────────────────────────────────────────────
export const getCaregiverDashboard = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = getCaregiverId(req)

    // All patients linked to this caregiver
    const { rows: patients } = await db.query(
      `SELECT DISTINCT
         p.id AS patient_id,
         u.first_name || ' ' || u.last_name AS name,
         u.first_name, u.last_name,
         p.date_of_birth,
         cg.relationship,
         -- is linked in caregivers table?
         EXISTS(
           SELECT 1 FROM caregivers c2
           WHERE c2.user_id=$1 AND c2.patient_id=p.id AND c2.deleted_at IS NULL
         ) AS is_linked,
         -- latest recovery score
         (SELECT rs.overall_score FROM recovery_scores rs WHERE rs.patient_id=p.id ORDER BY rs.score_date DESC LIMIT 1) AS score,
         -- unresolved alerts
         (SELECT COUNT(*) FROM risk_alerts ra WHERE ra.patient_id=p.id AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL) AS alert_count,
         -- last log date
         (SELECT rl.log_date FROM recovery_logs rl WHERE rl.patient_id=p.id AND rl.deleted_at IS NULL ORDER BY rl.log_date DESC LIMIT 1) AS last_log_date,
         -- condition
         (SELECT c.name FROM conditions c WHERE c.patient_id=p.id AND c.status='active' AND c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 1) AS condition_name,
         -- active care plan
         (SELECT cp.title FROM care_plans cp WHERE cp.patient_id=p.id AND cp.status='active' AND cp.deleted_at IS NULL ORDER BY cp.created_at DESC LIMIT 1) AS care_plan_title,
         -- active phase
         (SELECT ph.name FROM care_phases ph JOIN care_plans cp ON cp.id=ph.care_plan_id WHERE cp.patient_id=p.id AND ph.status='active' AND ph.deleted_at IS NULL LIMIT 1) AS phase_name
       FROM patients p
       JOIN users u ON u.id=p.user_id AND u.deleted_at IS NULL
       LEFT JOIN caregivers cg ON cg.patient_id=p.id AND cg.user_id=$1 AND cg.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       ORDER BY is_linked DESC, name ASC`,
      [userId]
    )

    // Today's exercise completions across linked patients
    const linkedIds = patients.filter((p: any) => p.is_linked).map((p: any) => p.patient_id)

    let exerciseStats = { total: 0, completed: 0 }
    if (linkedIds.length > 0) {
      const { rows: [ex] } = await db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE completed=TRUE) AS completed
         FROM exercise_logs
         WHERE patient_id = ANY($1::uuid[]) AND log_date = CURRENT_DATE AND deleted_at IS NULL`,
        [linkedIds]
      )
      exerciseStats = { total: Number(ex.total), completed: Number(ex.completed) }
    }

    // Active alerts for linked patients
    const { rows: alerts } = linkedIds.length > 0 ? await db.query(
      `SELECT ra.id, ra.alert_type, ra.severity, ra.title, ra.description, ra.created_at,
              u.first_name || ' ' || u.last_name AS patient_name, p.id AS patient_id
       FROM risk_alerts ra
       JOIN patients p ON p.id=ra.patient_id
       JOIN users u ON u.id=p.user_id
       WHERE ra.patient_id = ANY($1::uuid[])
         AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL
       ORDER BY ra.created_at DESC LIMIT 10`,
      [linkedIds]
    ) : { rows: [] }

    const totalPatients = patients.length
    const linkedCount = patients.filter((p: any) => p.is_linked).length
    const alertCount = alerts.length

    const enriched = patients.map((p: any) => {
      const alertCnt = Number(p.alert_count)
      const dob = p.date_of_birth
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
      const riskLevel = alertCnt >= 2 ? 'high' : alertCnt === 1 ? 'medium' : 'low'
      const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase()
      return {
        patientId: p.patient_id,
        name: p.name,
        age,
        initials,
        relationship: p.relationship || null,
        isLinked: Boolean(p.is_linked),
        conditionName: p.condition_name || 'Not specified',
        phaseName: p.phase_name || null,
        carePlanTitle: p.care_plan_title || null,
        score: p.score ? Math.round(Number(p.score)) : null,
        alertCount: alertCnt,
        riskLevel,
        lastLogDate: p.last_log_date || null,
      }
    })

    res.json({
      success: true,
      data: {
        stats: { totalPatients, linkedCount, alertCount, exerciseStats },
        patients: enriched,
        alerts,
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── GET /caregiver/patients ───────────────────────────────────────────────────
export const getCaregiverPatients = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = getCaregiverId(req)

    const { rows } = await db.query(
      `SELECT DISTINCT
         p.id AS patient_id,
         u.first_name || ' ' || u.last_name AS name,
         u.first_name, u.last_name, u.email,
         p.date_of_birth, p.gender,
         cg.relationship,
         EXISTS(
           SELECT 1 FROM caregivers c2
           WHERE c2.user_id=$1 AND c2.patient_id=p.id AND c2.deleted_at IS NULL
         ) AS is_linked,
         (SELECT rs.overall_score FROM recovery_scores rs WHERE rs.patient_id=p.id ORDER BY rs.score_date DESC LIMIT 1) AS score,
         (SELECT COUNT(*) FROM risk_alerts ra WHERE ra.patient_id=p.id AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL) AS alert_count,
         (SELECT rl.log_date FROM recovery_logs rl WHERE rl.patient_id=p.id AND rl.deleted_at IS NULL ORDER BY rl.log_date DESC LIMIT 1) AS last_log_date,
         (SELECT c.name FROM conditions c WHERE c.patient_id=p.id AND c.status='active' AND c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 1) AS condition_name,
         (SELECT ph.name FROM care_phases ph JOIN care_plans cp ON cp.id=ph.care_plan_id WHERE cp.patient_id=p.id AND ph.status='active' AND ph.deleted_at IS NULL LIMIT 1) AS phase_name
       FROM patients p
       JOIN users u ON u.id=p.user_id AND u.deleted_at IS NULL
       LEFT JOIN caregivers cg ON cg.patient_id=p.id AND cg.user_id=$1 AND cg.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       ORDER BY is_linked DESC, name ASC`,
      [userId]
    )

    const patients = rows.map((p: any) => {
      const alertCnt = Number(p.alert_count)
      const dob = p.date_of_birth
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
      const riskLevel = alertCnt >= 2 ? 'high' : alertCnt === 1 ? 'medium' : 'low'
      const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase()
      return {
        patientId: p.patient_id,
        name: p.name,
        email: p.email,
        age,
        initials,
        relationship: p.relationship || null,
        isLinked: Boolean(p.is_linked),
        conditionName: p.condition_name || 'Not specified',
        phaseName: p.phase_name || null,
        score: p.score ? Math.round(Number(p.score)) : null,
        alertCount: alertCnt,
        riskLevel,
        lastLogDate: p.last_log_date || null,
      }
    })

    res.json({ success: true, data: patients } as ApiResponse)
  } catch (err) { next(err) }
}

// ── POST /caregiver/patients/:patientId/link ──────────────────────────────────
export const linkPatient = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = getCaregiverId(req)
    const { patientId } = req.params
    const { relationship } = req.body

    // Check patient exists
    const { rows: [patient] } = await db.query(
      `SELECT id FROM patients WHERE id=$1 AND deleted_at IS NULL`, [patientId]
    )
    if (!patient) throw new ApiError(404, 'Patient not found')

    // Upsert caregiver link — check if already exists first
    const { rows: [existing] } = await db.query(
      `SELECT id FROM caregivers WHERE user_id=$1 AND patient_id=$2 AND deleted_at IS NULL`,
      [userId, patientId]
    )
    if (existing) {
      await db.query(
        `UPDATE caregivers SET relationship=$1, updated_at=NOW() WHERE id=$2`,
        [relationship || 'caregiver', existing.id]
      )
      res.status(200).json({ success: true, data: existing } as ApiResponse)
      return
    }
    const { rows: [cg] } = await db.query(
      `INSERT INTO caregivers (id, user_id, patient_id, relationship, is_primary, created_by)
       VALUES ($1, $2, $3, $4, FALSE, $2) RETURNING id`,
      [uuidv4(), userId, patientId, relationship || 'caregiver']
    )

    res.status(201).json({ success: true, data: cg } as ApiResponse)
  } catch (err) { next(err) }
}

// ── GET /caregiver/patients/:patientId ────────────────────────────────────────
export const getCaregiverPatientDetail = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = getCaregiverId(req)
    const { patientId } = req.params

    // Patient info
    const { rows: [patient] } = await db.query(
      `SELECT u.first_name, u.last_name, u.email, u.phone,
              p.id, p.date_of_birth, p.gender, p.blood_type,
              p.height_cm, p.weight_kg, p.allergies, p.notes
       FROM patients p JOIN users u ON u.id=p.user_id
       WHERE p.id=$1 AND p.deleted_at IS NULL`,
      [patientId]
    )
    if (!patient) throw new ApiError(404, 'Patient not found')

    // Is this caregiver linked?
    const { rows: [link] } = await db.query(
      `SELECT relationship FROM caregivers WHERE user_id=$1 AND patient_id=$2 AND deleted_at IS NULL`,
      [userId, patientId]
    )

    // Today's exercises
    const { rows: todayExercises } = await db.query(
      `SELECT e.id, e.name, e.category, e.difficulty, e.sets, e.reps, e.duration_mins, e.description,
              el.id AS log_id,
              COALESCE(el.completed, false) AS completed,
              el.sets_completed, el.reps_completed, el.pain_during, el.difficulty_felt,
              el.notes AS log_notes, el.created_at AS logged_at
       FROM exercise_logs el
       JOIN exercises e ON e.id=el.exercise_id
       WHERE el.patient_id=$1 AND el.log_date=CURRENT_DATE AND el.deleted_at IS NULL
       ORDER BY e.name`,
      [patientId]
    )

    // Exercise history (last 7 days)
    const { rows: exHistory } = await db.query(
      `SELECT to_char(log_date,'Dy') AS day, log_date,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE completed=TRUE) AS completed
       FROM exercise_logs
       WHERE patient_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '6 days' AND deleted_at IS NULL
       GROUP BY log_date
       ORDER BY log_date ASC`,
      [patientId]
    )

    // All exercises ever logged for this patient (library)
    const { rows: exerciseHistory } = await db.query(
      `SELECT DISTINCT e.id, e.name, e.category, e.difficulty, e.sets, e.reps, e.duration_mins, e.description
       FROM exercise_logs el
       JOIN exercises e ON e.id=el.exercise_id
       WHERE el.patient_id=$1 AND el.deleted_at IS NULL
       ORDER BY e.name`,
      [patientId]
    )

    // All exercises in the catalogue
    const { rows: exerciseCatalogue } = await db.query(
      `SELECT id, name, category, difficulty, sets, reps, duration_mins, description, muscle_groups
       FROM exercises WHERE deleted_at IS NULL ORDER BY name ASC`,
      []
    )

    // Active medications
    const { rows: medications } = await db.query(
      `SELECT ms.id, ms.dosage, ms.frequency, ms.times_per_day, ms.start_date,
              m.name, m.drug_class,
              (SELECT COUNT(*) FROM medication_logs ml
               WHERE ml.medication_schedule_id=ms.id
               AND ml.scheduled_time::date=CURRENT_DATE AND ml.status='taken') AS taken_today
       FROM medication_schedules ms
       JOIN medications m ON m.id=ms.medication_id
       WHERE ms.patient_id=$1 AND ms.is_active=TRUE AND ms.deleted_at IS NULL
       ORDER BY ms.created_at DESC`,
      [patientId]
    )

    // Unresolved alerts
    const { rows: alerts } = await db.query(
      `SELECT id, alert_type, severity, title, description, created_at
       FROM risk_alerts
       WHERE patient_id=$1 AND is_resolved=FALSE AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [patientId]
    )

    // Latest recovery score
    const { rows: [latestScore] } = await db.query(
      `SELECT overall_score, medication_score, exercise_score, mood_score
       FROM recovery_scores WHERE patient_id=$1 ORDER BY score_date DESC LIMIT 1`,
      [patientId]
    )

    // Pain trend last 7 days
    const { rows: painTrend } = await db.query(
      `SELECT to_char(log_date,'Dy') AS day,
              COALESCE(pain_level,0) AS pain,
              COALESCE(overall_feeling,0) AS mood,
              COALESCE(energy_level,0) AS energy
       FROM recovery_logs
       WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY log_date DESC LIMIT 7`,
      [patientId]
    )

    const dob = patient.date_of_birth
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
    const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()
    const score = latestScore ? Math.round(Number(latestScore.overall_score)) : null
    const alertCount = alerts.length
    const riskLevel = alertCount >= 2 ? 'high' : alertCount === 1 ? 'medium' : 'low'

    res.json({
      success: true,
      data: {
        patient: {
          patientId,
          name: `${patient.first_name} ${patient.last_name}`,
          firstName: patient.first_name,
          lastName: patient.last_name,
          email: patient.email,
          phone: patient.phone,
          age,
          initials,
          gender: patient.gender,
          bloodType: patient.blood_type,
          allergies: patient.allergies,
        },
        isLinked: Boolean(link),
        relationship: link?.relationship || null,
        score,
        riskLevel,
        alertCount,
        alerts,
        medications,
        todayExercises,
        exHistory: exHistory.map((r: any) => ({
          day: r.day,
          total: Number(r.total),
          completed: Number(r.completed),
        })),
        exerciseHistory,
        exerciseCatalogue,
        painTrend: painTrend.reverse(),
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── POST /caregiver/patients/:patientId/exercises ─────────────────────────────
// Caregiver logs an exercise for a patient (or creates one from scratch)
export const logExerciseForPatient = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = getCaregiverId(req)
    const { patientId } = req.params
    const {
      exerciseName, category, difficulty,
      sets, reps, durationMins,
      setsCompleted, repsCompleted,
      painDuring, difficultyFelt, notes,
      completed,
    } = req.body

    if (!exerciseName) throw new ApiError(400, 'exerciseName is required')

    // Find or create exercise in catalogue
    let exerciseId: string
    const { rows: [existing] } = await db.query(
      `SELECT id FROM exercises WHERE LOWER(name)=LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [exerciseName]
    )
    if (existing) {
      exerciseId = existing.id
    } else {
      const { rows: [newEx] } = await db.query(
        `INSERT INTO exercises (id, name, category, difficulty, sets, reps, duration_mins, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [uuidv4(), exerciseName, category || 'general', difficulty || 'beginner',
         sets || null, reps || null, durationMins || null, userId]
      )
      exerciseId = newEx.id
    }

    // Insert a new exercise log for today (allow multiple logs per exercise per day)
    const { rows: [log] } = await db.query(
      `INSERT INTO exercise_logs
         (id, patient_id, exercise_id, log_date, sets_completed, reps_completed,
          duration_mins, pain_during, difficulty_felt, completed, notes, created_by)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        uuidv4(), patientId, exerciseId,
        setsCompleted ?? null, repsCompleted ?? null, durationMins ?? null,
        painDuring ?? null, difficultyFelt ?? null,
        completed !== undefined ? completed : true,
        notes ?? null, userId,
      ]
    )

    res.status(201).json({
      success: true,
      data: { ...log, exerciseName, exerciseId },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /caregiver/patients/:patientId/exercises/:logId ─────────────────────
export const updateExerciseLog = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { logId, patientId } = req.params
    const { setsCompleted, repsCompleted, durationMins, painDuring, difficultyFelt, notes, completed } = req.body

    const { rows: [log] } = await db.query(
      `UPDATE exercise_logs SET
         sets_completed=COALESCE($1, sets_completed),
         reps_completed=COALESCE($2, reps_completed),
         duration_mins=COALESCE($3, duration_mins),
         pain_during=COALESCE($4, pain_during),
         difficulty_felt=COALESCE($5, difficulty_felt),
         notes=COALESCE($6, notes),
         completed=COALESCE($7, completed),
         updated_at=NOW()
       WHERE id=$8 AND patient_id=$9 AND deleted_at IS NULL
       RETURNING *`,
      [setsCompleted ?? null, repsCompleted ?? null, durationMins ?? null,
       painDuring ?? null, difficultyFelt ?? null, notes ?? null,
       completed ?? null, logId, patientId]
    )
    if (!log) throw new ApiError(404, 'Exercise log not found')

    res.json({ success: true, data: log } as ApiResponse)
  } catch (err) { next(err) }
}
