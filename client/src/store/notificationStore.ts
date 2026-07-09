import { create } from 'zustand'
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/services/notification'

interface NotificationState {
  notifications: any[]
  unreadCount: number
  loading: boolean
  error: string | null
  
  loadNotifications: (params?: any) => Promise<void>
  loadUnreadCount: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  removeNotification: (id: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  loadNotifications: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const data = await fetchNotifications(params)
      set({ notifications: data })
      // Auto update unread count based on loaded data if no status filter applied
      get().loadUnreadCount()
    } catch (err: any) {
      set({ error: err?.response?.data?.message || 'Failed to load notifications' })
    } finally {
      set({ loading: false })
    }
  },

  loadUnreadCount: async () => {
    try {
      const count = await fetchUnreadCount()
      set({ unreadCount: count })
    } catch (err) {
      console.error('Failed to load unread count', err)
    }
  },

  markRead: async (id: string) => {
    try {
      await markAsRead(id)
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, status: 'read' } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (err) {
      console.error('Failed to mark read', err)
    }
  },

  markAllRead: async () => {
    try {
      await markAllAsRead()
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, status: 'read' })),
        unreadCount: 0
      }))
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
  },

  removeNotification: async (id: string) => {
    try {
      await deleteNotification(id)
      set(state => {
        const notif = state.notifications.find(n => n.id === id)
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: notif?.status === 'unread' ? Math.max(0, state.unreadCount - 1) : state.unreadCount
        }
      })
    } catch (err) {
      console.error('Failed to delete notification', err)
    }
  }
}))
