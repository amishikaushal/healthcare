import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  getDoctorDashboard,
  getDoctorPatients,
  getDoctorPatientDetail,
  createAppointment,
  updateAppointment,
  prescribeMedication,
  stopMedication,
  resolveAlert,
} from '../controllers/doctor.controller'

const router = Router()

// All doctor routes require authentication + doctor role
router.use(authenticate)
router.use(authorize('doctor', 'admin'))

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', getDoctorDashboard)

// ── Patients ──────────────────────────────────────────────────────────────────
router.get('/patients', getDoctorPatients)
router.get('/patients/:patientId',
  [param('patientId').isUUID()],
  validate, getDoctorPatientDetail
)

// ── Appointments ──────────────────────────────────────────────────────────────
router.post('/patients/:patientId/appointments',
  [
    param('patientId').isUUID(),
    body('scheduledAt').notEmpty().withMessage('scheduledAt is required'),
  ],
  validate, createAppointment
)
router.patch('/appointments/:appointmentId',
  [param('appointmentId').isUUID()],
  validate, updateAppointment
)

// ── Medications ───────────────────────────────────────────────────────────────
router.post('/patients/:patientId/medications',
  [
    param('patientId').isUUID(),
    body('medicationName').trim().notEmpty(),
    body('dosage').trim().notEmpty(),
  ],
  validate, prescribeMedication
)
router.delete('/patients/:patientId/medications/:scheduleId',
  [param('patientId').isUUID(), param('scheduleId').isUUID()],
  validate, stopMedication
)

// ── Alerts ────────────────────────────────────────────────────────────────────
router.patch('/patients/:patientId/alerts/:alertId/resolve',
  [param('patientId').isUUID(), param('alertId').isUUID()],
  validate, resolveAlert
)

export default router
