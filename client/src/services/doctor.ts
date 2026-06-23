import api from './api'

// ── Doctor Dashboard ──────────────────────────────────────────────────────────
export const fetchDoctorDashboard = async () => {
  const { data } = await api.get('/doctor/dashboard')
  return data.data
}

// ── Doctor Patients ───────────────────────────────────────────────────────────
export const fetchDoctorPatients = async () => {
  const { data } = await api.get('/doctor/patients')
  return data.data
}

export const fetchDoctorPatientDetail = async (patientId: string) => {
  const { data } = await api.get(`/doctor/patients/${patientId}`)
  return data.data
}

// ── Appointments ──────────────────────────────────────────────────────────────
export const createAppointment = async (
  patientId: string,
  payload: {
    title?: string
    appointmentType?: 'in_person' | 'telehealth' | 'home_visit'
    scheduledAt: string
    durationMins?: number
    location?: string
    preNotes?: string
    description?: string
  }
) => {
  const { data } = await api.post(`/doctor/patients/${patientId}/appointments`, payload)
  return data.data
}

export const updateAppointmentStatus = async (
  appointmentId: string,
  payload: { status?: string; postNotes?: string; cancellationReason?: string }
) => {
  const { data } = await api.patch(`/doctor/appointments/${appointmentId}`, payload)
  return data.data
}

// ── Medications ───────────────────────────────────────────────────────────────
export const prescribeMedication = async (
  patientId: string,
  payload: {
    medicationName: string
    dosage: string
    frequency?: 'daily' | 'weekly' | 'monthly' | 'as_needed'
    timesPerDay?: number
    startDate?: string
    endDate?: string
    withFood?: boolean
    notes?: string
  }
) => {
  const { data } = await api.post(`/doctor/patients/${patientId}/medications`, payload)
  return data.data
}

export const stopMedication = async (patientId: string, scheduleId: string) => {
  const { data } = await api.delete(`/doctor/patients/${patientId}/medications/${scheduleId}`)
  return data
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export const resolveAlert = async (
  patientId: string,
  alertId: string,
  resolutionNote?: string
) => {
  const { data } = await api.patch(
    `/doctor/patients/${patientId}/alerts/${alertId}/resolve`,
    { resolutionNote }
  )
  return data.data
}
