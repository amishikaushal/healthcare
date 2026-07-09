import { useEffect, useState } from 'react'
import { Bell, Check, Trash2, Pill, Calendar, Activity, MessageSquare, AlertTriangle, FileText, Settings } from 'lucide-react'
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

export default function NotificationsPage() {
  const { notifications, loading, error, loadNotifications, markRead, markAllRead, removeNotification } = useNotificationStore()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications({ limit: 100 })
  }, [])

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.status === 'unread')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <Bell className="w-6 h-6 text-brand-500" /> Notifications
          </h1>
          <p className="text-sm text-surface-500 mt-1">View and manage your recent activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/settings/notifications" className="btn-secondary text-sm flex items-center gap-2 py-2">
            <Settings className="w-4 h-4" /> Preferences
          </Link>
          <button onClick={() => markAllRead()} className="btn-primary text-sm flex items-center gap-2 py-2">
            <Check className="w-4 h-4" /> Mark all as read
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-surface-200">
        <button
          onClick={() => setFilter('all')}
          className={clsx('px-4 py-3 text-sm font-medium border-b-2 transition-colors', filter === 'all' ? 'border-brand-500 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700')}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={clsx('px-4 py-3 text-sm font-medium border-b-2 transition-colors', filter === 'unread' ? 'border-brand-500 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700')}
        >
          Unread Only
        </button>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="py-20 text-center text-surface-500 animate-pulse">Loading notifications...</div>
      ) : error ? (
        <div className="py-20 text-center text-danger-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center glass rounded-2xl">
          <Bell className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-medium text-surface-800">No notifications</h3>
          <p className="text-sm text-surface-500 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const Icon = iconMap[notif.category] || Bell
            return (
              <div
                key={notif.id}
                className={clsx(
                  'flex gap-4 p-5 rounded-2xl transition-all border',
                  notif.status === 'unread' ? 'bg-white border-brand-200 shadow-sm' : 'bg-surface-50 border-surface-200 opacity-80'
                )}
              >
                <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5', colorMap[notif.priority] || colorMap.medium)}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div 
                      className="cursor-pointer group" 
                      onClick={() => {
                        markRead(notif.id)
                        if (notif.action_url) window.location.href = notif.action_url
                      }}
                    >
                      <h4 className={clsx('text-base font-medium group-hover:text-brand-600 transition-colors', notif.status === 'unread' ? 'text-surface-900' : 'text-surface-700')}>
                        {notif.title}
                      </h4>
                      <p className="text-sm text-surface-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-xs text-surface-400 mt-2 font-medium">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {notif.status === 'unread' && (
                        <button onClick={() => markRead(notif.id)} className="p-2 rounded-xl text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Mark as read">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => removeNotification(notif.id)} className="p-2 rounded-xl text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
