import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate, authorize, ownPatientOrDoctor } from '../middleware/auth'
import { validate } from '../middleware/validate'

// Controllers
import { createLog, getLogs, getTodayLog, updateLog, getConditionProfile } from '../controllers/recoveryLog.controller'
import { generateReport, getReports, addDoctorNotes } from '../controllers/weeklyReport.controller'
import {
  getMedications, markMedicationTaken, getExercises, logExercise,
  getAppointments, cancelAppointment, getCarePlan, getWeeklyReports,
  getRiskAlerts,
} from '../controllers/patient.controller'
import { getDashboardSummary, getProfile, updateProfile } from '../controllers/dashboard.controller'

const router = Router()
router.use(authenticate)

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardSummary)

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile',   getProfile)
router.put('/profile',   updateProfile)

// ── Medications ───────────────────────────────────────────────────────────────
router.get('/medications', getMedications)
router.post('/medications/:scheduleId/mark-taken',
  [param('scheduleId').isUUID(), body('scheduledTime').notEmpty()],
  validate, markMedicationTaken
)

// ── Exercises ─────────────────────────────────────────────────────────────────
router.get('/exercises', getExercises)
router.post('/exercises/:exerciseId/log',
  [param('exerciseId').isUUID()],
  validate, logExercise
)

// ── Appointments ──────────────────────────────────────────────────────────────
router.get('/appointments', getAppointments)
router.patch('/appointments/:appointmentId/cancel',
  [param('appointmentId').isUUID()],
  validate, cancelAppointment
)

// ── Care Plan ─────────────────────────────────────────────────────────────────
router.get('/care-plan', getCarePlan)

// ── Weekly Reports ────────────────────────────────────────────────────────────
router.get('/weekly-reports', getWeeklyReports)

// ── Risk Alerts ───────────────────────────────────────────────────────────────
router.get('/alerts', getRiskAlerts)

// ── Recovery Logs (original patient-scoped) ───────────────────────────────────
router.post('/patients/:patientId/recovery-logs',
  [param('patientId').isUUID(), body('overallFeeling').optional().isInt({ min: 1, max: 10 })],
  validate, ownPatientOrDoctor, createLog
)
router.get('/patients/:patientId/recovery-logs',
  [param('patientId').isUUID()],
  validate, ownPatientOrDoctor, getLogs
)
router.get('/patients/:patientId/recovery-logs/today',
  [param('patientId').isUUID()],
  validate, ownPatientOrDoctor, getTodayLog
)
router.get('/patients/:patientId/recovery-logs/profile',
  [param('patientId').isUUID()],
  validate, ownPatientOrDoctor, getConditionProfile
)
router.patch('/recovery-logs/:logId', validate, updateLog)

// ── Weekly Reports (original) ─────────────────────────────────────────────────
router.post('/patients/:patientId/weekly-reports',
  [param('patientId').isUUID()],
  validate, ownPatientOrDoctor, generateReport
)
router.get('/patients/:patientId/weekly-reports',
  [param('patientId').isUUID()],
  validate, ownPatientOrDoctor, getReports
)
router.patch('/weekly-reports/:reportId/notes',
  [param('reportId').isUUID(), body('notes').trim().notEmpty()],
  validate, authorize('doctor', 'admin'), addDoctorNotes
)

export default router
