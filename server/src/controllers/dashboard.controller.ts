import { Request, Response, NextFunction } from 'express'
import { db } from '../database/db'
import { ApiResponse } from '../types'

// ── Patient Dashboard Summary ─────────────────────────────────────────────────
export const getDashboardSummary = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const patientId = req.user!.patientId
    if (!patientId) throw new Error('Patient profile not found')

    // ── Today's log ───────────────────────────────────────────────────────────
    const { rows: [todayLog] } = await db.query(
      `SELECT pain_level, overall_feeling, energy_level, sleep_hours, sleep_quality, mobility_score, ai_insights
       FROM recovery_logs
       WHERE patient_id=$1 AND log_date=CURRENT_DATE AND deleted_at IS NULL`,
      [patientId]
    )

    // ── Latest recovery score ─────────────────────────────────────────────────
    const { rows: [latestScore] } = await db.query(
      `SELECT overall_score, pain_score, mobility_score, medication_score, exercise_score, mood_score, sleep_score, trend, ai_analysis, breakdown
       FROM recovery_scores
       WHERE patient_id=$1
       ORDER BY score_date DESC LIMIT 1`,
      [patientId]
    )

    // ── Previous week score for delta ─────────────────────────────────────────
    const { rows: [prevScore] } = await db.query(
      `SELECT overall_score FROM recovery_scores
       WHERE patient_id=$1
       ORDER BY score_date DESC LIMIT 1 OFFSET 1`,
      [patientId]
    )

    // ── This week's pain & mood trend (last 7 days) ───────────────────────────
    const { rows: weekTrend } = await db.query(
      `SELECT to_char(log_date,'Dy') AS day,
              COALESCE(pain_level,0) AS pain,
              COALESCE(overall_feeling,0) AS mood,
              COALESCE(energy_level,0) AS energy,
              log_date
       FROM recovery_logs
       WHERE patient_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '6 days' AND deleted_at IS NULL
       ORDER BY log_date ASC`,
      [patientId]
    )

    // ── This week's score trend (last 7 days) ──────────────────────────────────
    const { rows: scoreTrend } = await db.query(
      `SELECT to_char(score_date,'Dy') AS day,
              overall_score AS score,
              score_date
       FROM recovery_scores
       WHERE patient_id=$1 AND score_date >= CURRENT_DATE - INTERVAL '6 days'
       ORDER BY score_date ASC`,
      [patientId]
    )

    // ── Today's medications ───────────────────────────────────────────────────
    const { rows: medications } = await db.query(
      `SELECT ms.id, m.name, ms.dosage, ms.times_per_day, ms.scheduled_times, ms.with_food, ms.frequency,
              m.drug_class,
              (SELECT COUNT(*) FROM medication_logs ml
               WHERE ml.medication_schedule_id=ms.id
               AND ml.scheduled_time::date=CURRENT_DATE AND ml.status='taken') AS taken_count
       FROM medication_schedules ms
       JOIN medications m ON m.id=ms.medication_id
       WHERE ms.patient_id=$1 AND ms.is_active=TRUE AND ms.deleted_at IS NULL
       AND ms.start_date<=CURRENT_DATE AND (ms.end_date IS NULL OR ms.end_date>=CURRENT_DATE)
       ORDER BY ms.scheduled_times[1] ASC`,
      [patientId]
    )

    // ── Today's exercises ─────────────────────────────────────────────────────
    const { rows: exercises } = await db.query(
      `SELECT e.id, e.name, e.category, e.difficulty, e.sets, e.reps, e.duration_mins,
              el.id AS log_id, el.completed, el.sets_completed, el.reps_completed, el.pain_during
       FROM exercise_logs el
       JOIN exercises e ON e.id=el.exercise_id
       WHERE el.patient_id=$1 AND el.log_date=CURRENT_DATE AND el.deleted_at IS NULL
       ORDER BY e.name`,
      [patientId]
    )

    // ── Upcoming appointment ──────────────────────────────────────────────────
    const { rows: [nextAppt] } = await db.query(
      `SELECT a.id, a.title, a.scheduled_at, a.duration_mins, a.appointment_type, a.status, a.location,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM appointments a
       JOIN doctors d ON d.id=a.doctor_id
       JOIN users u ON u.id=d.user_id
       WHERE a.patient_id=$1 AND a.scheduled_at > NOW()
       AND a.status IN ('scheduled','confirmed') AND a.deleted_at IS NULL
       ORDER BY a.scheduled_at ASC LIMIT 1`,
      [patientId]
    )

    // ── Active risk alerts ────────────────────────────────────────────────────
    const { rows: alerts } = await db.query(
      `SELECT id, alert_type, severity, title, description
       FROM risk_alerts
       WHERE patient_id=$1 AND is_resolved=FALSE AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 5`,
      [patientId]
    )

    // ── Active care plan ──────────────────────────────────────────────────────
    const { rows: [carePlan] } = await db.query(
      `SELECT cp.id, cp.title, cp.start_date, cp.duration_weeks,
              cp.status,
              ph.name AS phase_name, ph.phase_order,
              (SELECT COUNT(*)+1 FROM care_phases p2
               WHERE p2.care_plan_id=cp.id AND p2.phase_order < ph.phase_order) AS week_number
       FROM care_plans cp
       LEFT JOIN care_phases ph ON ph.care_plan_id=cp.id AND ph.status='active' AND ph.deleted_at IS NULL
       WHERE cp.patient_id=$1 AND cp.status='active' AND cp.deleted_at IS NULL
       ORDER BY cp.created_at DESC LIMIT 1`,
      [patientId]
    )

    const medTaken = medications.reduce((s: number, m: any) => s + Number(m.taken_count), 0)
    const medTotal = medications.reduce((s: number, m: any) => s + Number(m.times_per_day), 0)
    const exDone   = exercises.filter((e: any) => e.completed).length

    res.json({
      success: true,
      data: {
        today: {
          painLevel:     todayLog?.pain_level    ?? null,
          moodScore:     todayLog?.overall_feeling ?? null,
          energyLevel:   todayLog?.energy_level  ?? null,
          sleepHours:    todayLog?.sleep_hours    ?? null,
          sleepQuality:  todayLog?.sleep_quality  ?? null,
          mobilityScore: todayLog?.mobility_score ?? null,
          hasLoggedToday: !!todayLog,
        },
        recoveryScore: latestScore
          ? {
              score:      Math.round(Number(latestScore.overall_score)),
              pain:       latestScore.pain_score       ? Math.round(Number(latestScore.pain_score))       : null,
              mobility:   latestScore.mobility_score   ? Math.round(Number(latestScore.mobility_score))   : null,
              medication: latestScore.medication_score ? Math.round(Number(latestScore.medication_score)) : null,
              exercise:   latestScore.exercise_score   ? Math.round(Number(latestScore.exercise_score))   : null,
              mood:       latestScore.mood_score       ? Math.round(Number(latestScore.mood_score))       : null,
              delta:      prevScore ? Math.round(Number(latestScore.overall_score) - Number(prevScore.overall_score)) : null,
              trend:      latestScore.trend,
              breakdown:  latestScore.breakdown,
            }
          : null,
        weekTrend,
        scoreTrend,
        medications: medications.map((m: any) => ({
          id:           m.id,
          name:         m.name,
          dosage:       m.dosage,
          frequency:    m.frequency,
          drugClass:    m.drug_class,
          withFood:     m.with_food,
          timesPerDay:  m.times_per_day,
          takenCount:   Number(m.taken_count),
        })),
        medicationStats: { taken: medTaken, total: medTotal },
        exercises: exercises.map((e: any) => ({
          id:            e.id,
          logId:         e.log_id,
          name:          e.name,
          category:      e.category,
          difficulty:    e.difficulty,
          sets:          e.sets,
          reps:          e.reps,
          durationMins:  e.duration_mins,
          completed:     e.completed,
          setsCompleted: e.sets_completed,
          repsCompleted: e.reps_completed,
          painDuring:    e.pain_during,
        })),
        exerciseStats: { done: exDone, total: exercises.length },
        nextAppointment: nextAppt ? {
          id:          nextAppt.id,
          title:       nextAppt.title,
          scheduledAt: nextAppt.scheduled_at,
          durationMins:nextAppt.duration_mins,
          type:        nextAppt.appointment_type,
          status:      nextAppt.status,
          location:    nextAppt.location,
          doctorName:  nextAppt.doctor_name,
          specialty:   nextAppt.specialty,
        } : null,
        alerts: alerts.map((a: any) => ({
          id:          a.id,
          type:        a.alert_type,
          severity:    a.severity,
          title:       a.title,
          description: a.description,
        })),
        carePlan: carePlan ? {
          id:          carePlan.id,
          title:       carePlan.title,
          phaseName:   carePlan.phase_name,
          phaseOrder:  carePlan.phase_order,
          weekNumber:  carePlan.week_number,
          startDate:   carePlan.start_date,
          durationWeeks: carePlan.duration_weeks,
        } : null,
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Patient Profile ───────────────────────────────────────────────────────────
export const getProfile = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { rows: [profile] } = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.avatar_url,
              u.role, u.is_email_verified, u.created_at, u.last_login_at,
              p.id AS patient_id, p.date_of_birth, p.gender, p.blood_type,
              p.height_cm, p.weight_kg, p.allergies, p.emergency_contact,
              p.insurance_info, p.address, p.notes
       FROM users u
       JOIN patients p ON p.user_id=u.id AND p.deleted_at IS NULL
       WHERE u.id=$1 AND u.deleted_at IS NULL`,
      [req.user!.userId]
    )
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
}

// ── Update Profile ────────────────────────────────────────────────────────────
export const updateProfile = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, bloodType, heightCm, weightKg, allergies, emergencyContact, address, notes } = req.body
    const userId = req.user!.userId
    const patientId = req.user!.patientId

    // Update users table
    await db.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, updated_at=NOW()
       WHERE id=$4 AND deleted_at IS NULL`,
      [firstName, lastName, phone || null, userId]
    )

    // Update patients table
    if (patientId) {
      await db.query(
        `UPDATE patients SET date_of_birth=$1, gender=$2, blood_type=$3,
         height_cm=$4, weight_kg=$5, allergies=$6, emergency_contact=$7, address=$8, notes=$9,
         updated_at=NOW(), updated_by=$10
         WHERE id=$11 AND deleted_at IS NULL`,
        [dateOfBirth||null, gender||null, bloodType||null,
         heightCm||null, weightKg||null,
         JSON.stringify(allergies||[]),
         JSON.stringify(emergencyContact||{}),
         JSON.stringify(address||{}),
         notes||null, userId, patientId]
      )
    }

    res.json({ success: true, message: 'Profile updated successfully' })
  } catch (err) { next(err) }
}
