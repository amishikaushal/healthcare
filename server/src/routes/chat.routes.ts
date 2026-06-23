import { Router } from 'express'
import { body, query, param } from 'express-validator'
import { authenticate, authorize, ownPatientOrDoctor } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createSession, sendMessage, getSessions, getMessages } from '../controllers/chat.controller'

const router = Router()

router.use(authenticate)

router.post('/sessions',
  [body('patientId').isUUID()],
  validate,
  createSession
)

router.post('/message',
  [
    body('sessionId').isUUID(),
    body('patientId').isUUID(),
    body('content').trim().isLength({ min: 1, max: 4000 }),
  ],
  validate,
  sendMessage
)

router.get('/sessions',
  [query('patientId').isUUID()],
  validate,
  getSessions
)

router.get('/sessions/:sessionId/messages',
  [param('sessionId').isUUID()],
  validate,
  getMessages
)

export default router
