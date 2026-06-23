import api from './api'

export const fetchCaregiverDashboard = async () => {
  const { data } = await api.get('/caregiver/dashboard')
  return data.data
}

export const fetchCaregiverPatients = async () => {
  const { data } = await api.get('/caregiver/patients')
  return data.data
}

export const fetchCaregiverPatientDetail = async (patientId: string) => {
  const { data } = await api.get(`/caregiver/patients/${patientId}`)
  return data.data
}

export const linkPatient = async (patientId: string, relationship?: string) => {
  const { data } = await api.post(`/caregiver/patients/${patientId}/link`, { relationship })
  return data.data
}

export const logExerciseForPatient = async (
  patientId: string,
  payload: {
    exerciseName: string
    category?: string
    difficulty?: string
    sets?: number
    reps?: number
    durationMins?: number
    setsCompleted?: number
    repsCompleted?: number
    painDuring?: number
    difficultyFelt?: number
    notes?: string
    completed?: boolean
  }
) => {
  const { data } = await api.post(`/caregiver/patients/${patientId}/exercises`, payload)
  return data.data
}

export const updateExerciseLog = async (
  patientId: string,
  logId: string,
  payload: { completed?: boolean; notes?: string; painDuring?: number }
) => {
  const { data } = await api.patch(`/caregiver/patients/${patientId}/exercises/${logId}`, payload)
  return data.data
}
