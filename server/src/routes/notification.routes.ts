import { Router } from 'express'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notification.controller'
import {
  getPreferences,
  updatePreferences
} from '../controllers/notificationPreference.controller'
import { authenticate } from '../middleware/auth'
import { param, body } from 'express-validator'
import { validate } from '../middleware/validate'

const router = Router()

router.use(authenticate)

// ── Preferences ───────────────────────────────────────────────────────────────
router.get('/preferences', getPreferences)
router.patch('/preferences', updatePreferences)

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)

router.patch('/read-all', markAllAsRead)

router.patch('/:id/read',
  [param('id').isUUID()],
  validate,
  markAsRead
)

router.delete('/:id',
  [param('id').isUUID()],
  validate,
  deleteNotification
)

export default router
