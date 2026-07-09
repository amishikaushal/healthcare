import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Trash2, Pill, Calendar, Activity, MessageSquare, AlertTriangle, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { useNotificationStore } from '@/store/notificationStore'

const iconMap: Record<string, any> = {
  medication_reminders: Pill,
  appointment_reminders: Calendar,
  care_plan_updates: Activity,
  doctor_messages: MessageSquare,
  risk_alerts: AlertTriangle,
  ai_weekly_reports: FileText,
}

const colorMap: Record<string, string> = {
  low: 'text-surface-500 bg-surface-100',
  medium: 'text-brand-500 bg-brand-50',
  high: 'text-warning-500 bg-warning-50',
  critical: 'text-danger-500 bg-danger-50',
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, loading, error, loadNotifications, markRead, markAllRead, removeNotification } = useNotificationStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadNotifications({ limit: 5 })
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h3>
            <button
              onClick={() => markAllRead()}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-surface-500">Loading...</div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-danger-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-surface-500">No notifications yet</div>
            ) : (
              notifications.map((notif: any) => {
                const Icon = iconMap[notif.category] || Bell
                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      'relative group flex gap-3 p-3 rounded-xl transition-colors',
                      notif.status === 'unread' ? 'bg-brand-50/50' : 'hover:bg-surface-50'
                    )}
                  >
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', colorMap[notif.priority] || colorMap.medium)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { markRead(notif.id); if (notif.action_url) window.location.href = notif.action_url }}>
                      <p className={clsx('text-sm font-medium pr-6', notif.status === 'unread' ? 'text-surface-900' : 'text-surface-700')}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-surface-400 mt-1 font-medium">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      {notif.status === 'unread' && (
                        <button onClick={(e) => { e.stopPropagation(); markRead(notif.id) }} className="p-1 rounded-md text-surface-400 hover:text-brand-600 hover:bg-brand-50" title="Mark as read">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); removeNotification(notif.id) }} className="p-1 rounded-md text-surface-400 hover:text-danger-600 hover:bg-danger-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-2 border-t border-surface-100">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block w-full text-center py-2 text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-xl transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
