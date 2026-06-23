import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'
import { analyseRisk } from '../services/gemini.service'

// ── Create daily log ──────────────────────────────────────────────────────────
export const createLog = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params
    const {
      painLevel, overallFeeling, energyLevel, sleepHours,
      sleepQuality, mobilityScore, notes, vitals, carePlanId, carePhaseId,
    } = req.body

    // Check if log exists for today
    const { rows: [existing] } = await db.query(
      `SELECT id FROM recovery_logs
       WHERE patient_id=$1 AND log_date=CURRENT_DATE AND deleted_at IS NULL`,
      [patientId]
    )
    if (existing) throw new ApiError(409, 'Log already exists for today. Use PATCH to update.')

    const { rows: [log] } = await db.query(
      `INSERT INTO recovery_logs
         (id, patient_id, care_plan_id, care_phase_id, pain_level, overall_feeling,
          energy_level, sleep_hours, sleep_quality, mobility_score, notes, vitals, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [uuidv4(), patientId, carePlanId||null, carePhaseId||null,
       painLevel, overallFeeling, energyLevel, sleepHours,
       sleepQuality, mobilityScore, notes||null,
       JSON.stringify(vitals||{}), req.user!.userId]
    )

    // Async risk analysis (fire and forget)
    triggerRiskAnalysis(patientId).catch(() => {})

    res.status(201).json({ success: true, data: log } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get logs for patient ──────────────────────────────────────────────────────
export const getLogs = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params
    const limit  = Math.min(parseInt(req.query.limit as string || '30'), 90)
    const offset = parseInt(req.query.offset as string || '0')

    const { rows } = await db.query(
      `SELECT id, log_date, pain_level, overall_feeling, energy_level,
              sleep_hours, sleep_quality, mobility_score, notes, status, vitals, ai_insights
       FROM recovery_logs
       WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY log_date DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    )

    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*) FROM recovery_logs WHERE patient_id=$1 AND deleted_at IS NULL',
      [patientId]
    )

    res.json({
      success: true,
      data: rows,
      meta: { total: parseInt(count), limit, offset },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get today's log ───────────────────────────────────────────────────────────
export const getTodayLog = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params
    const { rows: [log] } = await db.query(
      `SELECT * FROM recovery_logs
       WHERE patient_id=$1 AND log_date=CURRENT_DATE AND deleted_at IS NULL`,
      [patientId]
    )
    res.json({ success: true, data: log || null } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Update log ────────────────────────────────────────────────────────────────
export const updateLog = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { logId } = req.params
    const updates = req.body
    const setClauses: string[] = []
    const values: any[] = []
    let i = 1

    const allowed = ['pain_level','overall_feeling','energy_level','sleep_hours',
                     'sleep_quality','mobility_score','notes','vitals','status']

    for (const [key, val] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      if (allowed.includes(col)) {
        setClauses.push(`${col}=$${i++}`)
        values.push(val)
      }
    }

    if (setClauses.length === 0) throw new ApiError(400, 'No valid fields to update')

    values.push(req.user!.userId, logId)
    const { rows: [log] } = await db.query(
      `UPDATE recovery_logs SET ${setClauses.join(',')}, updated_by=$${i++}, updated_at=NOW()
       WHERE id=$${i} AND deleted_at IS NULL RETURNING *`,
      values
    )
    if (!log) throw new ApiError(404, 'Log not found')
    res.json({ success: true, data: log } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Background risk analysis ──────────────────────────────────────────────────
const triggerRiskAnalysis = async (patientId: string): Promise<void> => {
  const { rows: logs }  = await db.query(
    'SELECT * FROM recovery_logs WHERE patient_id=$1 ORDER BY log_date DESC LIMIT 7',
    [patientId]
  )
  const { rows: meds }  = await db.query(
    `SELECT m.name, ms.dosage, ms.frequency FROM medication_schedules ms
     JOIN medications m ON m.id=ms.medication_id
     WHERE ms.patient_id=$1 AND ms.is_active=TRUE AND ms.deleted_at IS NULL`,
    [patientId]
  )
  const { rows: exLogs } = await db.query(
    'SELECT * FROM exercise_logs WHERE patient_id=$1 ORDER BY log_date DESC LIMIT 7',
    [patientId]
  )
  const { rows: [cond] } = await db.query(
    'SELECT name FROM conditions WHERE patient_id=$1 AND status=$2 AND deleted_at IS NULL LIMIT 1',
    [patientId, 'active']
  )

  const result = await analyseRisk({
    recentLogs: logs, medications: meds, exercises: exLogs,
    condition: cond?.name || 'Unknown',
  })

  // Store alerts
  for (const alert of result.alerts) {
    await db.query(
      `INSERT INTO risk_alerts (id, patient_id, alert_type, severity, title, description, ai_generated)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), patientId, alert.type, alert.severity, alert.type.replace(/_/g,' '), alert.message]
    )
  }
}
