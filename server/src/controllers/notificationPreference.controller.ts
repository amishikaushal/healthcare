import { Request, Response, NextFunction } from 'express'
import { db } from '../database/db'
import { ApiResponse } from '../types'

// ── GET /notification-preferences ─────────────────────────────────────────────
export const getPreferences = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    let { rows: [pref] } = await db.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    )

    if (!pref) {
      // Create defaults if not exists
      const { rows: [newPref] } = await db.query(
        `INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *`,
        [userId]
      )
      pref = newPref
    }

    res.json({ success: true, data: pref } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /notification-preferences ───────────────────────────────────────────
export const updatePreferences = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const {
      medication_reminders,
      appointment_reminders,
      doctor_messages,
      care_plan_updates,
      risk_alerts,
      ai_weekly_reports
    } = req.body

    const { rows: [pref] } = await db.query(
      `INSERT INTO notification_preferences 
        (user_id, medication_reminders, appointment_reminders, doctor_messages, care_plan_updates, risk_alerts, ai_weekly_reports)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
        medication_reminders = COALESCE($2, notification_preferences.medication_reminders),
        appointment_reminders = COALESCE($3, notification_preferences.appointment_reminders),
        doctor_messages = COALESCE($4, notification_preferences.doctor_messages),
        care_plan_updates = COALESCE($5, notification_preferences.care_plan_updates),
        risk_alerts = COALESCE($6, notification_preferences.risk_alerts),
        ai_weekly_reports = COALESCE($7, notification_preferences.ai_weekly_reports),
        updated_at = NOW()
       RETURNING *`,
      [
        userId,
        medication_reminders,
        appointment_reminders,
        doctor_messages,
        care_plan_updates,
        risk_alerts,
        ai_weekly_reports
      ]
    )

    res.json({ success: true, data: pref } as ApiResponse)
  } catch (err) { next(err) }
}
