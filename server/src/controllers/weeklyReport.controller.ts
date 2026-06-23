import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'
import { generateWeeklyReport } from '../services/gemini.service'
import { startOfWeek, endOfWeek, format } from 'date-fns'

// ── Generate weekly report ────────────────────────────────────────────────────
export const generateReport = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params
    const weekDate = req.body.weekDate ? new Date(req.body.weekDate) : new Date()
    const wStart = startOfWeek(weekDate, { weekStartsOn: 1 })
    const wEnd   = endOfWeek(weekDate,   { weekStartsOn: 1 })

    // Check if report already exists
    const { rows: [existing] } = await db.query(
      `SELECT id FROM weekly_reports
       WHERE patient_id=$1 AND week_start=$2 AND deleted_at IS NULL`,
      [patientId, format(wStart, 'yyyy-MM-dd')]
    )
    if (existing) {
      throw new ApiError(409, 'Report already generated for this week. Use GET to retrieve it.')
    }

    // Gather data
    const { rows: logs } = await db.query(
      `SELECT log_date, pain_level, overall_feeling, energy_level, sleep_hours, notes
       FROM recovery_logs
       WHERE patient_id=$1 AND log_date BETWEEN $2 AND $3 AND deleted_at IS NULL
       ORDER BY log_date`,
      [patientId, format(wStart,'yyyy-MM-dd'), format(wEnd,'yyyy-MM-dd')]
    )

    const { rows: medLogs } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status='taken') AS taken, COUNT(*) AS total
       FROM medication_logs ml
       JOIN medication_schedules ms ON ms.id=ml.medication_schedule_id
       WHERE ms.patient_id=$1 AND ml.scheduled_time BETWEEN $2 AND $3`,
      [patientId, wStart.toISOString(), wEnd.toISOString()]
    )

    const { rows: exLogs } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE completed=TRUE) AS done, COUNT(*) AS total
       FROM exercise_logs WHERE patient_id=$1 AND log_date BETWEEN $2 AND $3`,
      [patientId, format(wStart,'yyyy-MM-dd'), format(wEnd,'yyyy-MM-dd')]
    )

    const { rows: [patient] } = await db.query(
      `SELECT u.first_name, u.last_name, c.name AS condition, cp.title, cph.name AS phase
       FROM patients p JOIN users u ON u.id=p.user_id
       LEFT JOIN conditions c ON c.patient_id=p.id AND c.status='active' AND c.deleted_at IS NULL
       LEFT JOIN care_plans cp ON cp.patient_id=p.id AND cp.status='active' AND cp.deleted_at IS NULL
       LEFT JOIN care_phases cph ON cph.care_plan_id=cp.id AND cph.status='active' AND cph.deleted_at IS NULL
       WHERE p.id=$1`,
      [patientId]
    )

    if (!logs.length) throw new ApiError(404, 'No recovery logs found for this week')

    // Compute averages
    const avg = (arr: number[]) => arr.reduce((a,b) => a+b, 0) / arr.length
    const avgPain   = avg(logs.map(l => l.pain_level   || 0))
    const avgMood   = avg(logs.map(l => l.overall_feeling || 0))
    const avgEnergy = avg(logs.map(l => l.energy_level  || 0))
    const avgSleep  = avg(logs.map(l => parseFloat(l.sleep_hours) || 0))
    const medAdh    = medLogs[0]?.total > 0
      ? Math.round((medLogs[0].taken / medLogs[0].total) * 100) : 0
    const exAdh     = exLogs[0]?.total > 0
      ? Math.round((exLogs[0].done / exLogs[0].total) * 100) : 0

    // Generate AI report
    const { rows: [weekNum] } = await db.query(
      `SELECT COUNT(*) FROM weekly_reports WHERE patient_id=$1 AND deleted_at IS NULL`,
      [patientId]
    )
    const aiReport = await generateWeeklyReport({
      patientName:         `${patient?.first_name} ${patient?.last_name}`,
      condition:           patient?.condition || 'Unknown',
      phase:               patient?.phase || 'Unknown',
      weekNumber:          parseInt(weekNum.count) + 1,
      avgPain:             Math.round(avgPain * 10) / 10,
      avgMood:             Math.round(avgMood * 10) / 10,
      avgEnergy:           Math.round(avgEnergy * 10) / 10,
      avgSleep:            Math.round(avgSleep * 10) / 10,
      medicationAdherence: medAdh,
      exerciseAdherence:   exAdh,
      symptoms:            [],
      logs:                logs.map(l => l.notes || `Pain ${l.pain_level}/10, Feeling ${l.overall_feeling}/10`),
    })

    // Save to DB
    const { rows: [report] } = await db.query(
      `INSERT INTO weekly_reports
         (id, patient_id, week_start, week_end, avg_pain_score, avg_mood_score,
          avg_energy_score, medication_adherence, exercise_adherence,
          overall_progress, ai_summary, highlights, concerns, ai_recommendations, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        uuidv4(), patientId,
        format(wStart,'yyyy-MM-dd'), format(wEnd,'yyyy-MM-dd'),
        avgPain, avgMood, avgEnergy, medAdh, exAdh,
        Math.round((avgMood / 10) * 100),
        aiReport.summary,
        JSON.stringify(aiReport.highlights),
        JSON.stringify(aiReport.concerns),
        JSON.stringify(aiReport.recommendations),
        req.user!.userId,
      ]
    )

    res.status(201).json({ success: true, data: report } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get reports for patient ───────────────────────────────────────────────────
export const getReports = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params
    const { rows } = await db.query(
      `SELECT id, week_start, week_end, avg_pain_score, avg_mood_score,
              medication_adherence, exercise_adherence, overall_progress,
              ai_summary, highlights, concerns, ai_recommendations,
              is_reviewed, doctor_notes, created_at
       FROM weekly_reports WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY week_start DESC LIMIT 12`,
      [patientId]
    )
    res.json({ success: true, data: rows } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Doctor adds notes to report ───────────────────────────────────────────────
export const addDoctorNotes = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params
    const { notes } = req.body
    const { rows: [report] } = await db.query(
      `UPDATE weekly_reports SET doctor_notes=$1, is_reviewed=TRUE, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$2 AND deleted_at IS NULL RETURNING *`,
      [notes, reportId]
    )
    if (!report) throw new ApiError(404, 'Report not found')
    res.json({ success: true, data: report } as ApiResponse)
  } catch (err) { next(err) }
}
