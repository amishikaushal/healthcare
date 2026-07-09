import api from './api'

export const fetchNotifications = async (params: { status?: string; type?: string; category?: string; limit?: number; offset?: number } = {}) => {
  const { data } = await api.get('/notifications', { params })
  return data.data
}

export const fetchUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count')
  return data.data.count
}

export const markAsRead = async (id: string) => {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data.data
}

export const markAllAsRead = async () => {
  const { data } = await api.patch('/notifications/read-all')
  return data
}

export const deleteNotification = async (id: string) => {
  const { data } = await api.delete(`/notifications/${id}`)
  return data
}

export const fetchPreferences = async () => {
  const { data } = await api.get('/notifications/preferences')
  return data.data
}

export const updatePreferences = async (preferences: any) => {
  const { data } = await api.patch('/notifications/preferences', preferences)
  return data.data
}
