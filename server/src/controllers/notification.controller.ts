import { Request, Response, NextFunction } from 'express'
import { db } from '../database/db'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'

// ── Utility: Generate Notification ───────────────────────────────────────────
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  category: 'medication_reminders' | 'appointment_reminders' | 'doctor_messages' | 'care_plan_updates' | 'risk_alerts' | 'ai_weekly_reports',
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  relatedEntityId?: string,
  actionUrl?: string,
  createdBy?: string
) => {
  // Check preferences first
  const { rows: [pref] } = await db.query(
    `SELECT ${category} AS is_enabled FROM notification_preferences WHERE user_id = $1`,
    [userId]
  )
  
  // Default to true if preferences not found
  if (pref && pref.is_enabled === false) {
    return null // User opted out of this category
  }

  const { rows: [notif] } = await db.query(
    `INSERT INTO notifications 
      (user_id, title, message, type, category, priority, status, related_entity_id, action_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'unread', $7, $8, $9)
     RETURNING *`,
    [userId, title, message, type, category, priority, relatedEntityId || null, actionUrl || null, createdBy || null]
  )
  return notif
}

// ── GET /notifications ────────────────────────────────────────────────────────
export const getNotifications = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { status, type, category, limit = 50, offset = 0 } = req.query

    let query = `SELECT * FROM notifications WHERE user_id = $1 AND deleted_at IS NULL`
    const params: any[] = [userId]
    let paramIdx = 2

    if (status) {
      query += ` AND status = $${paramIdx++}`
      params.push(status)
    }
    if (type) {
      query += ` AND type = $${paramIdx++}`
      params.push(type)
    }
    if (category) {
      query += ` AND category = $${paramIdx++}`
      params.push(category)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`
    params.push(Number(limit), Number(offset))

    const { rows } = await db.query(query, params)
    res.json({ success: true, data: rows } as ApiResponse)
  } catch (err) { next(err) }
}

// ── GET /notifications/unread-count ───────────────────────────────────────────
export const getUnreadCount = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { rows: [result] } = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND status = 'unread' AND deleted_at IS NULL`,
      [userId]
    )
    res.json({ success: true, data: { count: Number(result.count) } } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /notifications/:id/read ─────────────────────────────────────────────
export const markAsRead = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { id } = req.params

    const { rows: [notif] } = await db.query(
      `UPDATE notifications SET status = 'read' 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL 
       RETURNING *`,
      [id, userId]
    )
    if (!notif) throw new ApiError(404, 'Notification not found')

    res.json({ success: true, data: notif } as ApiResponse)
  } catch (err) { next(err) }
}

// ── PATCH /notifications/read-all ─────────────────────────────────────────────
export const markAllAsRead = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    await db.query(
      `UPDATE notifications SET status = 'read' 
       WHERE user_id = $1 AND status = 'unread' AND deleted_at IS NULL`,
      [userId]
    )
    res.json({ success: true, message: 'All notifications marked as read' } as ApiResponse)
  } catch (err) { next(err) }
}

// ── DELETE /notifications/:id ─────────────────────────────────────────────────
export const deleteNotification = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { id } = req.params

    const { rows: [notif] } = await db.query(
      `UPDATE notifications SET deleted_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL 
       RETURNING id`,
      [id, userId]
    )
    if (!notif) throw new ApiError(404, 'Notification not found')

    res.json({ success: true, message: 'Notification deleted' } as ApiResponse)
  } catch (err) { next(err) }
}
