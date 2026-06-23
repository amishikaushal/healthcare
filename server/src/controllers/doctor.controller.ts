import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'

// ── Helper: verify doctor ─────────────────────────────────────────────────────
function getDoctorId(req: Request): string {
  const id = req.user?.doctorId
  if (!id) throw new ApiError(403, 'Doctor profile not found')
  return id
}

// ── GET /doctor/dashboard ─────────────────────────────────────────────────────
export const getDoctorDashboard = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)

    // ALL registered patients — regardless of care plan assignment
    const { rows: patients } = await db.query(
      `SELECT DISTINCT
         p.id AS patient_id,
         u.first_name || ' ' || u.last_name AS name,
         u.first_name, u.last_name,
         p.date_of_birth,
         -- is this patient assigned to this doctor via a care plan?
         EXISTS(
           SELECT 1 FROM care_plans cp
           WHERE cp.patient_id=p.id AND cp.doctor_id=$1 AND cp.deleted_at IS NULL
         ) AS is_assigned,
         -- latest recovery score
         (SELECT rs.overall_score FROM recovery_scores rs WHERE rs.patient_id=p.id ORDER BY rs.score_date DESC LIMIT 1) AS score,
         -- unresolved alerts count
         (SELECT COUNT(*) FROM risk_alerts ra WHERE ra.patient_id=p.id AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL) AS alert_count,
         -- last recovery log date
         (SELECT rl.log_date FROM recovery_logs rl WHERE rl.patient_id=p.id AND rl.deleted_at IS NULL ORDER BY rl.log_date DESC LIMIT 1) AS last_log_date,
         -- active care plan
         (SELECT cp.id FROM care_plans cp WHERE cp.patient_id=p.id AND cp.status='active' AND cp.deleted_at IS NULL ORDER BY cp.created_at DESC LIMIT 1) AS care_plan_id,
         (SELECT cp.title FROM care_plans cp WHERE cp.patient_id=p.id AND cp.status='active' AND cp.deleted_at IS NULL ORDER BY cp.created_at DESC LIMIT 1) AS care_plan_title,
         -- active phase
         (SELECT ph.name FROM care_phases ph JOIN care_plans cp ON cp.id=ph.care_plan_id WHERE cp.patient_id=p.id AND ph.status='active' AND ph.deleted_at IS NULL LIMIT 1) AS phase_name,
         -- condition
         (SELECT c.name FROM conditions c WHERE c.patient_id=p.id AND c.status='active' AND c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 1) AS condition_name,
         -- next appointment with this doctor
         (SELECT a.scheduled_at FROM appointments a WHERE a.patient_id=p.id AND a.doctor_id=$1 AND a.scheduled_at > NOW() AND a.status IN ('scheduled','confirmed') AND a.deleted_at IS NULL ORDER BY a.scheduled_at ASC LIMIT 1) AS next_appt
       FROM patients p
       JOIN users u ON u.id=p.user_id AND u.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       ORDER BY is_assigned DESC, alert_count DESC, name ASC`,
      [doctorId]
    )

    // Today's appointments
    const { rows: todayAppts } = await db.query(
      `SELECT a.id, a.title, a.scheduled_at, a.duration_mins, a.appointment_type, a.status,
              u.first_name || ' ' || u.last_name AS patient_name
       FROM appointments a
       JOIN patients p ON p.id=a.patient_id
       JOIN users u ON u.id=p.user_id
       WHERE a.doctor_id=$1
         AND a.scheduled_at::date = CURRENT_DATE
         AND a.deleted_at IS NULL
       ORDER BY a.scheduled_at ASC`,
      [doctorId]
    )

    // Active alerts across all patients
    const { rows: alerts } = await db.query(
      `SELECT ra.id, ra.alert_type, ra.severity, ra.title, ra.description, ra.created_at,
              u.first_name || ' ' || u.last_name AS patient_name, p.id AS patient_id
       FROM risk_alerts ra
       JOIN patients p ON p.id=ra.patient_id
       JOIN users u ON u.id=p.user_id
       WHERE ra.patient_id IN (
         SELECT DISTINCT cp.patient_id FROM care_plans cp WHERE cp.doctor_id=$1 AND cp.deleted_at IS NULL
       )
       AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL
       ORDER BY ra.created_at DESC
       LIMIT 10`,
      [doctorId]
    )

    const totalPatients = patients.length
    const alertCount = alerts.length
    const todayCount = todayAppts.length
    const avgScore = patients.length > 0
      ? Math.round(patients.reduce((s: number, p: any) => s + Number(p.score || 0), 0) / patients.length)
      : 0

    const enriched = patients.map((p: any) => {
      const score = p.score ? Math.round(Number(p.score)) : null
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
        isAssigned: Boolean(p.is_assigned),
        conditionName: p.condition_name || 'Not specified',
        phaseName: p.phase_name || null,
        carePlanTitle: p.care_plan_title || null,
        carePlanId: p.care_plan_id || null,
        score,
        alertCount: alertCnt,
        riskLevel,
        lastLogDate: p.last_log_date || null,
        nextAppt: p.next_appt || null,
      }
    })

    res.json({
      success: true,
      data: {
        stats: { totalPatients, alertCount, todayAppointments: todayCount, avgRecoveryScore: avgScore },
        patients: enriched,
        todayAppointments: todayAppts,
        alerts,
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── GET /doctor/patients ──────────────────────────────────────────────────────
export const getDoctorPatients = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)

    // ALL registered patients — regardless of care plan assignment
    const { rows } = await db.query(
      `SELECT DISTINCT
         p.id AS patient_id,
         u.first_name || ' ' || u.last_name AS name,
         u.first_name, u.last_name, u.email,
         p.date_of_birth, p.gender,
         -- is this patient assigned to this doctor?
         EXISTS(
           SELECT 1 FROM care_plans cp
           WHERE cp.patient_id=p.id AND cp.doctor_id=$1 AND cp.deleted_at IS NULL
         ) AS is_assigned,
         (SELECT rs.overall_score FROM recovery_scores rs WHERE rs.patient_id=p.id ORDER BY rs.score_date DESC LIMIT 1) AS score,
         (SELECT COUNT(*) FROM risk_alerts ra WHERE ra.patient_id=p.id AND ra.is_resolved=FALSE AND ra.deleted_at IS NULL) AS alert_count,
         (SELECT rl.log_date FROM recovery_logs rl WHERE rl.patient_id=p.id AND rl.deleted_at IS NULL ORDER BY rl.log_date DESC LIMIT 1) AS last_log_date,
         (SELECT c.name FROM conditions c WHERE c.patient_id=p.id AND c.status='active' AND c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 1) AS condition_name,
         (SELECT ph.name FROM care_phases ph JOIN care_plans cp ON cp.id=ph.care_plan_id WHERE cp.patient_id=p.id AND ph.status='active' AND ph.deleted_at IS NULL LIMIT 1) AS phase_name,
         (SELECT cp.id FROM care_plans cp WHERE cp.patient_id=p.id AND cp.status='active' AND cp.deleted_at IS NULL ORDER BY cp.created_at DESC LIMIT 1) AS care_plan_id
       FROM patients p
       JOIN users u ON u.id=p.user_id AND u.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       ORDER BY is_assigned DESC, name ASC`,
      [doctorId]
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
        isAssigned: Boolean(p.is_assigned),
        conditionName: p.condition_name || 'Not specified',
        phaseName: p.phase_name || null,
        carePlanId: p.care_plan_id || null,
        score: p.score ? Math.round(Number(p.score)) : null,
        alertCount: alertCnt,
        riskLevel,
        lastLogDate: p.last_log_date || null,
      }
    })

    res.json({ success: true, data: patients } as ApiResponse)
  } catch (err) { next(err) }
}

// ── GET /doctor/patients/:patientId ──────────────────────────────────────────
export const getDoctorPatientDetail = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)
    const { patientId } = req.params

    // Any doctor can view any patient (to assign care plans)
    // If already assigned to this doctor, they can also manage appointments/meds

    // Patient info
    const { rows: [patient] } = await db.query(
      `SELECT u.first_name, u.last_name, u.email, u.phone,
              p.id, p.date_of_birth, p.gender, p.blood_type,
              p.height_cm, p.weight_kg, p.allergies, p.notes,
              p.emergency_contact
       FROM patients p JOIN users u ON u.id=p.user_id
       WHERE p.id=$1 AND p.deleted_at IS NULL`,
      [patientId]
    )
    if (!patient) throw new ApiError(404, 'Patient not found')

    // Recovery scores trend (last 7 days)
    const { rows: scoreTrend } = await db.query(
      `SELECT to_char(score_date,'Dy') AS day, score_date, overall_score AS score
       FROM recovery_scores
       WHERE patient_id=$1
       ORDER BY score_date DESC LIMIT 7`,
      [patientId]
    )

    // Pain trend from recovery_logs (last 7 days)
    const { rows: painTrend } = await db.query(
      `SELECT to_char(log_date,'Dy') AS day, log_date,
              COALESCE(pain_level,0) AS pain,
              COALESCE(overall_feeling,0) AS mood
       FROM recovery_logs
       WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY log_date DESC LIMIT 7`,
      [patientId]
    )

    // Latest recovery score
    const { rows: [latestScore] } = await db.query(
      `SELECT overall_score, medication_score, exercise_score, mood_score, sleep_score
       FROM recovery_scores WHERE patient_id=$1 ORDER BY score_date DESC LIMIT 1`,
      [patientId]
    )

    // Active condition
    const { rows: [condition] } = await db.query(
      `SELECT name, icd_code, severity, diagnosed_at FROM conditions
       WHERE patient_id=$1 AND status='active' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    )

    // Active care plan + phase
    const { rows: [carePlan] } = await db.query(
      `SELECT cp.id, cp.title, cp.start_date, cp.duration_weeks, cp.status,
              ph.name AS phase_name, ph.phase_order
       FROM care_plans cp
       LEFT JOIN care_phases ph ON ph.care_plan_id=cp.id AND ph.status='active' AND ph.deleted_at IS NULL
       WHERE cp.patient_id=$1 AND cp.doctor_id=$2 AND cp.status='active' AND cp.deleted_at IS NULL
       ORDER BY cp.created_at DESC LIMIT 1`,
      [patientId, doctorId]
    )

    // Unresolved alerts
    const { rows: alerts } = await db.query(
      `SELECT id, alert_type, severity, title, description, created_at
       FROM risk_alerts
       WHERE patient_id=$1 AND is_resolved=FALSE AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [patientId]
    )

    // Appointments with this doctor
    const { rows: appointments } = await db.query(
      `SELECT id, title, appointment_type, status, scheduled_at, duration_mins, location, pre_notes, post_notes
       FROM appointments
       WHERE patient_id=$1 AND doctor_id=$2 AND deleted_at IS NULL
       ORDER BY scheduled_at DESC LIMIT 10`,
      [patientId, doctorId]
    )

    // Active medications
    const { rows: medications } = await db.query(
      `SELECT ms.id, ms.dosage, ms.frequency, ms.times_per_day, ms.start_date, ms.end_date, ms.is_active,
              m.name, m.drug_class
       FROM medication_schedules ms
       JOIN medications m ON m.id=ms.medication_id
       WHERE ms.patient_id=$1 AND ms.is_active=TRUE AND ms.deleted_at IS NULL
       ORDER BY ms.created_at DESC`,
      [patientId]
    )

    // Medication adherence last 7 days
    const { rows: medAdherenceRows } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status='taken') AS taken, COUNT(*) AS total
       FROM medication_logs ml
       WHERE ml.patient_id=$1 AND ml.scheduled_time >= NOW() - INTERVAL '7 days'`,
      [patientId]
    )
    const medAdherence = medAdherenceRows[0]?.total > 0
      ? Math.round((Number(medAdherenceRows[0].taken) / Number(medAdherenceRows[0].total)) * 100)
      : null

    // Exercise adherence last 7 days
    const { rows: exAdherenceRows } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE completed=TRUE) AS done, COUNT(*) AS total
       FROM exercise_logs
       WHERE patient_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '6 days' AND deleted_at IS NULL`,
      [patientId]
    )
    const exAdherence = exAdherenceRows[0]?.total > 0
      ? Math.round((Number(exAdherenceRows[0].done) / Number(exAdherenceRows[0].total)) * 100)
      : null

    // Avg sleep last 7 days
    const { rows: [sleepRow] } = await db.query(
      `SELECT ROUND(AVG(sleep_hours)::numeric, 1) AS avg_sleep
       FROM recovery_logs
       WHERE patient_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '6 days' AND deleted_at IS NULL`,
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
          heightCm: patient.height_cm,
          weightKg: patient.weight_kg,
          allergies: patient.allergies,
          notes: patient.notes,
          emergencyContact: patient.emergency_contact,
        },
        score,
        riskLevel,
        alertCount,
        conditionName: condition?.name || 'Not specified',
        condition,
        carePlan,
        stats: {
          medAdherence,
          exAdherence,
          avgSleep: sleepRow?.avg_sleep ? Number(sleepRow.avg_sleep) : null,
        },
        painTrend: painTrend.reverse(),
        scoreTrend: scoreTrend.reverse(),
        alerts,
        appointments,
        medications,
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── POST /doctor/patients/:patientId/appointments ─────────────────────────────
export const createAppointment = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)
    const { patientId } = req.params
    const { title, appointmentType, scheduledAt, durationMins, location, preNotes, description } = req.body

    if (!scheduledAt) throw new ApiError(400, 'scheduledAt is required')

    // Any doctor can book an appointment for any patient
    // (no care plan required — booking is how they start the relationship)

    const { rows: [appt] } = await db.query(
      `INSERT INTO appointments
         (id, patient_id, doctor_id, title, description, appointment_type,
          scheduled_at, duration_mins, location, pre_notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        uuidv4(), patientId, doctorId,
        title || 'Follow-up',
        description || null,
        appointmentType || 'in_person',
        scheduledAt,
        durationMins || 30,
        location || null,
        preNotes || null,
        req.user!.userId,
      ]
    )

    res.status(201).json({ success: true, data: appt } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /doctor/appointments/:appointmentId ─────────────────────────────────
export const updateAppointment = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)
    const { appointmentId } = req.params
    const { status, postNotes, cancellationReason } = req.body

    const { rows: [appt] } = await db.query(
      `UPDATE appointments SET
         status = COALESCE($1, status),
         post_notes = COALESCE($2, post_notes),
         cancellation_reason = COALESCE($3, cancellation_reason),
         updated_at = NOW()
       WHERE id=$4 AND doctor_id=$5 AND deleted_at IS NULL
       RETURNING *`,
      [status || null, postNotes || null, cancellationReason || null, appointmentId, doctorId]
    )
    if (!appt) throw new ApiError(404, 'Appointment not found')

    res.json({ success: true, data: appt } as ApiResponse)
  } catch (err) { next(err) }
}

// ── POST /doctor/patients/:patientId/medications ──────────────────────────────
export const prescribeMedication = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)
    const { patientId } = req.params
    const { medicationName, dosage, frequency, timesPerDay, startDate, endDate, withFood, notes, scheduledTimes } = req.body

    if (!medicationName || !dosage) throw new ApiError(400, 'medicationName and dosage are required')

    // Any doctor can prescribe medication for any patient

    // Upsert medication (global catalogue)
    let medId: string
    const { rows: [existingMed] } = await db.query(
      `SELECT id FROM medications WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [medicationName]
    )
    if (existingMed) {
      medId = existingMed.id
    } else {
      const { rows: [newMed] } = await db.query(
        `INSERT INTO medications (id, name) VALUES ($1, $2) RETURNING id`,
        [uuidv4(), medicationName]
      )
      medId = newMed.id
    }

    // Create schedule
    const { rows: [schedule] } = await db.query(
      `INSERT INTO medication_schedules
         (id, patient_id, medication_id, doctor_id, dosage, frequency, times_per_day,
          scheduled_times, with_food, start_date, end_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        uuidv4(), patientId, medId, doctorId,
        dosage,
        frequency || 'daily',
        timesPerDay || 1,
        scheduledTimes || null,
        withFood || false,
        startDate || new Date().toISOString().split('T')[0],
        endDate || null,
        notes || null,
        req.user!.userId,
      ]
    )

    res.status(201).json({
      success: true,
      data: { ...schedule, medicationName },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── DELETE /doctor/patients/:patientId/medications/:scheduleId ────────────────
export const stopMedication = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getDoctorId(req)
    const { patientId, scheduleId } = req.params

    const { rows: [s] } = await db.query(
      `UPDATE medication_schedules SET is_active=FALSE, updated_at=NOW()
       WHERE id=$1 AND patient_id=$2 AND doctor_id=$3 AND deleted_at IS NULL
       RETURNING id`,
      [scheduleId, patientId, doctorId]
    )
    if (!s) throw new ApiError(404, 'Schedule not found')

    res.json({ success: true, message: 'Medication stopped' } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /doctor/patients/:patientId/alerts/:alertId/resolve ─────────────────
export const resolveAlert = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { alertId } = req.params
    const { resolutionNote } = req.body

    const { rows: [alert] } = await db.query(
      `UPDATE risk_alerts SET
         is_resolved=TRUE, resolved_at=NOW(), resolved_by=$1,
         resolution_note=$2, updated_at=NOW()
       WHERE id=$3 AND deleted_at IS NULL
       RETURNING id, is_resolved`,
      [req.user!.userId, resolutionNote || 'Resolved by doctor', alertId]
    )
    if (!alert) throw new ApiError(404, 'Alert not found')

    res.json({ success: true, data: alert } as ApiResponse)
  } catch (err) { next(err) }
}
