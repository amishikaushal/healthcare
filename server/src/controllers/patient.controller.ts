import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'
import { calculateAndSaveRecoveryScore } from '../services/recoveryScore.service'

// ── Get all medication schedules for a patient ────────────────────────────────
export const getMedications = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { rows } = await db.query(
      `SELECT
         ms.id, ms.dosage, ms.frequency, ms.times_per_day, ms.scheduled_times,
         ms.with_food, ms.start_date, ms.end_date, ms.is_active, ms.notes, ms.refill_reminder,
         m.id AS medication_id, m.name, m.generic_name, m.drug_class, m.description,
         m.side_effects, m.contraindications,
         -- Today's logs for this schedule
         json_agg(
           json_build_object(
             'id', ml.id,
             'scheduledTime', ml.scheduled_time,
             'takenAt', ml.taken_at,
             'status', ml.status,
             'skippedReason', ml.skipped_reason
           ) ORDER BY ml.scheduled_time
         ) FILTER (WHERE ml.id IS NOT NULL) AS today_logs
       FROM medication_schedules ms
       JOIN medications m ON m.id = ms.medication_id
       LEFT JOIN medication_logs ml ON ml.medication_schedule_id = ms.id
         AND ml.scheduled_time::date = CURRENT_DATE
       WHERE ms.patient_id = $1
         AND ms.deleted_at IS NULL
         AND ms.is_active = TRUE
         AND ms.start_date <= CURRENT_DATE
         AND (ms.end_date IS NULL OR ms.end_date >= CURRENT_DATE)
       GROUP BY ms.id, m.id
       ORDER BY ms.scheduled_times[1] ASC NULLS LAST`,
      [patientId]
    )

    // Compute weekly adherence (last 7 days)
    const { rows: adherenceRows } = await db.query(
      `SELECT
         to_char(d.day, 'Dy') AS date_label,
         d.day::date AS date,
         COUNT(ml.id) FILTER (WHERE ml.status = 'taken') AS taken,
         COUNT(ml.id) AS total
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d(day)
       LEFT JOIN medication_logs ml
         ON ml.scheduled_time::date = d.day::date
         AND ml.medication_schedule_id IN (
           SELECT id FROM medication_schedules WHERE patient_id=$1 AND deleted_at IS NULL
         )
       GROUP BY d.day
       ORDER BY d.day`,
      [patientId]
    )

    const adherence = adherenceRows.map((r: any) => ({
      date: r.date_label,
      pct:  r.total > 0 ? Math.round((Number(r.taken) / Number(r.total)) * 100) : 0,
      taken: Number(r.taken),
      total: Number(r.total),
    }))

    res.json({
      success: true,
      data: { medications: rows, adherence },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Mark a medication dose as taken ──────────────────────────────────────────
export const markMedicationTaken = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { scheduleId } = req.params
    const patientId = req.user!.patientId
    const { scheduledTime } = req.body

    // Verify ownership
    const { rows: [schedule] } = await db.query(
      'SELECT id FROM medication_schedules WHERE id=$1 AND patient_id=$2 AND deleted_at IS NULL',
      [scheduleId, patientId]
    )
    if (!schedule) throw new ApiError(404, 'Medication schedule not found')

    // Upsert the log
    const { rows: [log] } = await db.query(
      `INSERT INTO medication_logs
         (id, patient_id, medication_schedule_id, scheduled_time, taken_at, status, created_by)
       VALUES ($1, $2, $3, $4, NOW(), 'taken', $5)
       ON CONFLICT (medication_schedule_id, scheduled_time)
       DO UPDATE SET taken_at=NOW(), status='taken'
       RETURNING *`,
      [uuidv4(), patientId, scheduleId, scheduledTime, req.user!.userId]
    )

    res.json({ success: true, data: log } as ApiResponse)
    calculateAndSaveRecoveryScore(patientId!).catch(() => {})
  } catch (err) { next(err) }
}

// ── Get exercises for patient (today's plan) ──────────────────────────────────
export const getExercises = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    // Get active care plan's exercises
    const { rows } = await db.query(
      `SELECT
         e.id, e.name, e.description, e.category, e.difficulty,
         e.sets, e.reps, e.duration_mins, e.muscle_groups, e.instructions,
         e.video_url, e.contraindications,
         el.id AS log_id,
         el.completed, el.sets_completed, el.reps_completed,
         el.duration_mins AS duration_completed, el.pain_during, el.difficulty_felt, el.notes AS log_notes
       FROM exercises e
       LEFT JOIN exercise_logs el ON el.exercise_id=e.id
         AND el.patient_id=$1 AND el.log_date=CURRENT_DATE AND el.deleted_at IS NULL
       WHERE e.id IN (
         SELECT DISTINCT unnest(
           ARRAY(
             SELECT e2.id FROM exercises e2
             JOIN care_phases cp ON TRUE
             JOIN care_plans cap ON cap.id=cp.care_plan_id
               AND cap.patient_id=$1 AND cap.status='active' AND cap.deleted_at IS NULL
             WHERE cp.status='active' AND cp.deleted_at IS NULL
             LIMIT 20
           )
         )
       )
       OR el.patient_id=$1
       ORDER BY e.name`,
      [patientId]
    )

    // Simpler fallback: get all exercises with today's logs
    const { rows: exerciseLogs } = await db.query(
      `SELECT
         e.id, e.name, e.description, e.category, e.difficulty,
         e.sets, e.reps, e.duration_mins, e.muscle_groups, e.instructions,
         e.video_url,
         el.id AS log_id,
         COALESCE(el.completed, false) AS completed,
         el.sets_completed, el.reps_completed, el.pain_during,
         el.difficulty_felt, el.notes AS log_notes
       FROM exercise_logs el
       JOIN exercises e ON e.id=el.exercise_id
       WHERE el.patient_id=$1 AND el.log_date=CURRENT_DATE AND el.deleted_at IS NULL
       ORDER BY e.name`,
      [patientId]
    )

    res.json({
      success: true,
      data: exerciseLogs.length > 0 ? exerciseLogs : [],
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Log exercise completion ────────────────────────────────────────────────────
export const logExercise = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { exerciseId } = req.params
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { setsCompleted, repsCompleted, durationMins, painDuring, difficultyFelt, notes, carePlanId } = req.body

    const { rows: [log] } = await db.query(
      `INSERT INTO exercise_logs
         (id, patient_id, exercise_id, care_plan_id, log_date, sets_completed, reps_completed,
          duration_mins, pain_during, difficulty_felt, completed, notes, created_by)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,TRUE,$10,$11)
       ON CONFLICT (patient_id, exercise_id, log_date)
       DO UPDATE SET
         sets_completed=$5, reps_completed=$6, duration_mins=$7,
         pain_during=$8, difficulty_felt=$9, completed=TRUE, notes=$10, updated_at=NOW()
       RETURNING *`,
      [uuidv4(), patientId, exerciseId, carePlanId||null,
       setsCompleted||null, repsCompleted||null, durationMins||null,
       painDuring||null, difficultyFelt||null, notes||null, req.user!.userId]
    )

    res.json({ success: true, data: log } as ApiResponse)
    calculateAndSaveRecoveryScore(patientId!).catch(() => {})
  } catch (err) { next(err) }
}

// ── Get appointments ───────────────────────────────────────────────────────────
export const getAppointments = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { rows } = await db.query(
      `SELECT a.id, a.title, a.description, a.appointment_type, a.status,
              a.scheduled_at, a.duration_mins, a.location, a.meeting_url,
              a.pre_notes, a.post_notes, a.cancellation_reason, a.created_at,
              u.first_name || ' ' || u.last_name AS doctor_name,
              d.id AS doctor_id, d.specialty, d.sub_specialty,
              u.first_name AS doctor_first, u.last_name AS doctor_last
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE a.patient_id = $1 AND a.deleted_at IS NULL
       ORDER BY a.scheduled_at DESC`,
      [patientId]
    )

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id:           r.id,
        title:        r.title,
        description:  r.description,
        type:         r.appointment_type,
        status:       r.status,
        scheduledAt:  r.scheduled_at,
        durationMins: r.duration_mins,
        location:     r.location,
        meetingUrl:   r.meeting_url,
        preNotes:     r.pre_notes,
        postNotes:    r.post_notes,
        cancellationReason: r.cancellation_reason,
        doctor: {
          id:        r.doctor_id,
          name:      r.doctor_name,
          firstName: r.doctor_first,
          lastName:  r.doctor_last,
          specialty: r.specialty,
          subSpecialty: r.sub_specialty,
          initials:  `${r.doctor_first[0]}${r.doctor_last[0]}`,
        },
      })),
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Cancel appointment ────────────────────────────────────────────────────────
export const cancelAppointment = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { appointmentId } = req.params
    const patientId = req.user!.patientId
    const { reason } = req.body

    const { rows: [appt] } = await db.query(
      `UPDATE appointments SET status='cancelled', cancellation_reason=$1, updated_at=NOW()
       WHERE id=$2 AND patient_id=$3 AND status IN ('scheduled','confirmed') AND deleted_at IS NULL
       RETURNING id, status`,
      [reason||'Cancelled by patient', appointmentId, patientId]
    )
    if (!appt) throw new ApiError(404, 'Appointment not found or cannot be cancelled')

    res.json({ success: true, message: 'Appointment cancelled' } as ApiResponse)

    calculateAndSaveRecoveryScore(patientId!).catch(() => {})
  } catch (err) { next(err) }
}

// ── Get care plan ──────────────────────────────────────────────────────────────
export const getCarePlan = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { rows: [carePlan] } = await db.query(
      `SELECT cp.id, cp.title, cp.description, cp.goals, cp.status,
              cp.start_date, cp.end_date, cp.duration_weeks, cp.ai_generated, cp.created_at,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty,
              cond.name AS condition_name, cond.icd_code, cond.severity AS condition_severity
       FROM care_plans cp
       LEFT JOIN doctors d ON d.id=cp.doctor_id
       LEFT JOIN users u ON u.id=d.user_id
       LEFT JOIN conditions cond ON cond.id=cp.condition_id AND cond.deleted_at IS NULL
       WHERE cp.patient_id=$1 AND cp.status='active' AND cp.deleted_at IS NULL
       ORDER BY cp.created_at DESC LIMIT 1`,
      [patientId]
    )

    if (!carePlan) {
      res.json({ success: true, data: null } as ApiResponse)
      return
    }

    // Get phases
    const { rows: phases } = await db.query(
      `SELECT id, name, description, phase_order, status, start_date, end_date, duration_days, goals, milestones
       FROM care_phases
       WHERE care_plan_id=$1 AND deleted_at IS NULL
       ORDER BY phase_order ASC`,
      [carePlan.id]
    )

    res.json({
      success: true,
      data: {
        ...carePlan,
        phases,
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get weekly reports ────────────────────────────────────────────────────────
export const getWeeklyReports = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { rows } = await db.query(
      `SELECT wr.id, wr.week_start, wr.week_end,
              wr.avg_pain_score, wr.avg_mood_score, wr.avg_energy_score,
              wr.medication_adherence, wr.exercise_adherence, wr.overall_progress,
              wr.highlights, wr.concerns, wr.ai_summary, wr.ai_recommendations,
              wr.doctor_notes, wr.is_reviewed, wr.reviewed_at, wr.created_at,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM weekly_reports wr
       LEFT JOIN doctors d ON d.id=wr.doctor_id
       LEFT JOIN users u ON u.id=d.user_id
       WHERE wr.patient_id=$1 AND wr.deleted_at IS NULL
       ORDER BY wr.week_start DESC`,
      [patientId]
    )

    // For the latest report, get daily logs to build chart data
    let dailyData: any[] = []
    if (rows.length > 0) {
      const latest = rows[0]
      const { rows: logs } = await db.query(
        `SELECT to_char(log_date,'Dy') AS day, log_date,
                COALESCE(pain_level,0) AS pain,
                COALESCE(overall_feeling,0) AS mood,
                COALESCE(energy_level,0) AS energy
         FROM recovery_logs
         WHERE patient_id=$1
           AND log_date BETWEEN $2 AND $3
           AND deleted_at IS NULL
         ORDER BY log_date`,
        [patientId, latest.week_start, latest.week_end]
      )
      dailyData = logs
    }

    // Build radar breakdown from latest score
    const { rows: [latestScore] } = await db.query(
      `SELECT medication_score, exercise_score, sleep_score, mobility_score, mood_score
       FROM recovery_scores WHERE patient_id=$1 ORDER BY score_date DESC LIMIT 1`,
      [patientId]
    )

    const radarData = latestScore ? [
      { subject: 'Medication',  A: Math.round(Number(latestScore.medication_score)||0) },
      { subject: 'Exercise',    A: Math.round(Number(latestScore.exercise_score)||0) },
      { subject: 'Sleep',       A: Math.round(Number(latestScore.sleep_score)||0) },
      { subject: 'Mobility',    A: Math.round(Number(latestScore.mobility_score)||0) },
      { subject: 'Mood',        A: Math.round(Number(latestScore.mood_score)||0) },
    ] : []

    res.json({
      success: true,
      data: { reports: rows, dailyData, radarData },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get risk alerts ───────────────────────────────────────────────────────────
export const getRiskAlerts = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new ApiError(404, 'Patient profile not found')

    const { rows } = await db.query(
      `SELECT id, alert_type, severity, title, description, trigger_data,
              is_resolved, resolved_at, resolution_note, created_at
       FROM risk_alerts
       WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY is_resolved ASC, created_at DESC`,
      [patientId]
    )

    res.json({ success: true, data: rows } as ApiResponse)
  } catch (err) { next(err) }
}
