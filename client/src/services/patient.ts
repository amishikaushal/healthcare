import api from './api'

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get('/dashboard').then(r => r.data.data)

// ── Recovery Logs ─────────────────────────────────────────────────────────────
export const fetchTodayLog = (patientId: string) =>
  api.get(`/patients/${patientId}/recovery-logs/today`).then(r => r.data.data)

export const createRecoveryLog = (patientId: string, data: Record<string, any>) =>
  api.post(`/patients/${patientId}/recovery-logs`, data).then(r => r.data.data)

export const updateRecoveryLog = (logId: string, data: Record<string, any>) =>
  api.patch(`/recovery-logs/${logId}`, data).then(r => r.data.data)

export const fetchRecoveryLogs = (patientId: string, limit = 30) =>
  api.get(`/patients/${patientId}/recovery-logs?limit=${limit}`).then(r => r.data)

// ── Medications ───────────────────────────────────────────────────────────────
export const fetchMedications = () =>
  api.get('/medications').then(r => r.data.data)

export const markMedicationTaken = (scheduleId: string, scheduledTime: string) =>
  api.post(`/medications/${scheduleId}/mark-taken`, { scheduledTime }).then(r => r.data.data)

// ── Exercises ─────────────────────────────────────────────────────────────────
export const fetchExercises = () =>
  api.get('/exercises').then(r => r.data.data)

export const logExercise = (exerciseId: string, data: Record<string, any>) =>
  api.post(`/exercises/${exerciseId}/log`, data).then(r => r.data.data)

// ── Appointments ──────────────────────────────────────────────────────────────
export const fetchAppointments = () =>
  api.get('/appointments').then(r => r.data.data)

export const cancelAppointment = (appointmentId: string, reason?: string) =>
  api.patch(`/appointments/${appointmentId}/cancel`, { reason }).then(r => r.data.data)

// ── Care Plan ─────────────────────────────────────────────────────────────────
export const fetchCarePlan = () =>
  api.get('/care-plan').then(r => r.data.data)

// ── Weekly Reports ────────────────────────────────────────────────────────────
export const fetchWeeklyReports = () =>
  api.get('/weekly-reports').then(r => r.data.data)

export const generateWeeklyReport = (patientId: string) =>
  api.post(`/patients/${patientId}/weekly-reports`).then(r => r.data.data)

// ── Alerts ────────────────────────────────────────────────────────────────────
export const fetchAlerts = () =>
  api.get('/alerts').then(r => r.data.data)

// ── Profile ───────────────────────────────────────────────────────────────────
export const fetchProfile = () =>
  api.get('/profile').then(r => r.data.data)

export const updateProfile = (data: Record<string, any>) =>
  api.put('/profile', data).then(r => r.data)

// ── Recovery Condition Profile ─────────────────────────────────────────────────
export const getConditionProfile = (patientId: string) =>
  api.get(`/patients/${patientId}/recovery-logs/profile`).then(r => r.data.data)

