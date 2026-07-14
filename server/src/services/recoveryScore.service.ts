import { db } from '../database/db'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { SCORING_CONFIG } from '../config/scoring'

export const calculateAndSaveRecoveryScore = async (patientId: string, carePlanId: string | null = null): Promise<void> => {
  try {
  
    const { rows: [log] } = await db.query(
      `SELECT pain_level, overall_feeling, mobility_score, sleep_quality
       FROM recovery_logs
       WHERE patient_id=$1 AND log_date=CURRENT_DATE AND deleted_at IS NULL`,
      [patientId]
    )

    let painScore = null
    let moodScore = null
    let mobilityScore = null
    let sleepScore = null
    let hasLog = false

    if (log) {
      hasLog = true
      if (log.pain_level !== null) painScore = Math.max(0, 100 - (Number(log.pain_level) * 10))
      if (log.overall_feeling !== null) moodScore = Number(log.overall_feeling) * 10
      if (log.mobility_score !== null) mobilityScore = Number(log.mobility_score) * 10
      if (log.sleep_quality !== null) sleepScore = Number(log.sleep_quality) * 20
    }

    // 2. Medication adherence for today
    let medicationScore = null
    const { rows: meds } = await db.query(
      `SELECT status FROM medication_logs
       WHERE patient_id=$1 AND scheduled_time::date = CURRENT_DATE`,
      [patientId]
    )
    if (meds.length > 0) {
      const taken = meds.filter((m: any) => m.status === 'taken').length
      medicationScore = Math.round((taken / meds.length) * 100)
    }

    // 3. Exercise adherence for today
    let exerciseScore = null
    const { rows: exercises } = await db.query(
      `SELECT completed FROM exercise_logs
       WHERE patient_id=$1 AND log_date = CURRENT_DATE AND deleted_at IS NULL`,
      [patientId]
    )
    if (exercises.length > 0) {
      const done = exercises.filter((e: any) => e.completed).length
      exerciseScore = Math.round((done / exercises.length) * 100)
    }

    // 4. Appointment attendance (historically)
    let appointmentScore = null
    const { rows: appointments } = await db.query(
      `SELECT status FROM appointments
       WHERE patient_id=$1 AND scheduled_at < NOW() AND deleted_at IS NULL`,
      [patientId]
    )
    if (appointments.length > 0) {
      const completed = appointments.filter((a: any) => a.status === 'completed').length
      const missed = appointments.filter((a: any) => a.status === 'missed' || a.status === 'cancelled').length
      const totalRelevant = completed + missed
      if (totalRelevant > 0) {
        appointmentScore = Math.round((completed / totalRelevant) * 100)
      } else {
        appointmentScore = 100 // if none missed
      }
    }

    // 5. Calculate Weighted Overall Score
    let totalWeight = 0
    let weightedSum = 0

    const addScore = (score: number | null, weight: number) => {
      if (score !== null) {
        totalWeight += weight
        weightedSum += score * (weight / 100)
      }
    }

    addScore(medicationScore, SCORING_CONFIG.WEIGHTS.MEDICATION)
    addScore(exerciseScore, SCORING_CONFIG.WEIGHTS.EXERCISE)
    addScore(hasLog ? 100 : 0, SCORING_CONFIG.WEIGHTS.RECOVERY_LOG) // 100 if logged today, 0 if missed
    addScore(painScore, SCORING_CONFIG.WEIGHTS.PAIN)
    addScore(sleepScore, SCORING_CONFIG.WEIGHTS.SLEEP)
    addScore(appointmentScore, SCORING_CONFIG.WEIGHTS.APPOINTMENT)

    // Fallback components (mood, mobility) split remaining weight if we have them but others are missing
    // For simplicity, we just normalize out of totalWeight.
    let overallScore = 0
    if (totalWeight > 0) {
      overallScore = Math.round((weightedSum / (totalWeight / 100)))
    }

    // Calculate Status
    const status = SCORING_CONFIG.getStatus(overallScore)

    // Build Breakdown JSON
    const breakdown = {
      status,
      components: {
        medication: medicationScore,
        exercise: exerciseScore,
        logCompletion: hasLog ? 100 : 0,
        pain: painScore,
        sleep: sleepScore,
        appointment: appointmentScore,
        mood: moodScore,
        mobility: mobilityScore
      },
      weightsUsed: {
        medication: medicationScore !== null ? SCORING_CONFIG.WEIGHTS.MEDICATION : 0,
        exercise: exerciseScore !== null ? SCORING_CONFIG.WEIGHTS.EXERCISE : 0,
        logCompletion: SCORING_CONFIG.WEIGHTS.RECOVERY_LOG,
        pain: painScore !== null ? SCORING_CONFIG.WEIGHTS.PAIN : 0,
        sleep: sleepScore !== null ? SCORING_CONFIG.WEIGHTS.SLEEP : 0,
        appointment: appointmentScore !== null ? SCORING_CONFIG.WEIGHTS.APPOINTMENT : 0
      }
    }

    // 6. Determine trend (compare with yesterday/previous)
    let trend = 'stable'
    const { rows: [prevScore] } = await db.query(
      `SELECT overall_score FROM recovery_scores
       WHERE patient_id=$1 AND score_date < CURRENT_DATE
       ORDER BY score_date DESC LIMIT 1`,
      [patientId]
    )
    if (prevScore) {
      const prev = Number(prevScore.overall_score)
      if (overallScore > prev + 2) trend = 'up'
      else if (overallScore < prev - 2) trend = 'down'
    }

    // 7. Upsert into recovery_scores
    await db.query(
      `INSERT INTO recovery_scores (
         id, patient_id, care_plan_id, score_date, overall_score,
         pain_score, mobility_score, medication_score, exercise_score,
         mood_score, sleep_score, trend, breakdown
       ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (patient_id, score_date, care_plan_id)
       DO UPDATE SET
         overall_score = EXCLUDED.overall_score,
         pain_score = EXCLUDED.pain_score,
         mobility_score = EXCLUDED.mobility_score,
         medication_score = EXCLUDED.medication_score,
         exercise_score = EXCLUDED.exercise_score,
         mood_score = EXCLUDED.mood_score,
         sleep_score = EXCLUDED.sleep_score,
         trend = EXCLUDED.trend,
         breakdown = EXCLUDED.breakdown`,
      [
        uuidv4(), patientId, carePlanId, overallScore,
        painScore, mobilityScore, medicationScore, exerciseScore,
        moodScore, sleepScore, trend, breakdown
      ]
    )

  } catch (err) {
    logger.error('Failed to calculate recovery score', err)
  }
}
