import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  getCaregiverDashboard,
  getCaregiverPatients,
  getCaregiverPatientDetail,
  linkPatient,
  logExerciseForPatient,
  updateExerciseLog,
} from '../controllers/caregiver.controller'

const router = Router()

router.use(authenticate)
router.use(authorize('caregiver', 'admin'))

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', getCaregiverDashboard)

// ── Patients ──────────────────────────────────────────────────────────────────
router.get('/patients', getCaregiverPatients)
router.get('/patients/:patientId',
  [param('patientId').isUUID()],
  validate, getCaregiverPatientDetail
)

// ── Link a patient ────────────────────────────────────────────────────────────
router.post('/patients/:patientId/link',
  [param('patientId').isUUID()],
  validate, linkPatient
)

// ── Exercises ─────────────────────────────────────────────────────────────────
router.post('/patients/:patientId/exercises',
  [
    param('patientId').isUUID(),
    body('exerciseName').trim().notEmpty().withMessage('exerciseName is required'),
  ],
  validate, logExerciseForPatient
)
router.patch('/patients/:patientId/exercises/:logId',
  [param('patientId').isUUID(), param('logId').isUUID()],
  validate, updateExerciseLog
)

export default router
