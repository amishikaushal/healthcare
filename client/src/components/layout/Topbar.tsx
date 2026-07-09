import { useState, useEffect } from 'react'
import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'
import { useNotificationStore } from '@/store/notificationStore'
import NotificationDropdown from '../notifications/NotificationDropdown'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recovery-log': 'Recovery Log',
  '/care-plan': 'Care Plan',
  '/medications': 'Medications',
  '/exercises': 'Exercises',
  '/appointments': 'Appointments',
  '/documents': 'Documents',
  '/ai-assistant': 'AI Assistant',
  '/weekly-report': 'Weekly Report',
  '/doctor/dashboard': 'Doctor Dashboard',
  '/doctor/patients': 'My Patients',
  '/caregiver/dashboard': 'Caregiver Dashboard',
  '/admin/dashboard': 'Admin Dashboard',
}

export default function Topbar() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const title = routeLabels[pathname] || 'RecoveryOS'
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`

  const { unreadCount, loadUnreadCount } = useNotificationStore()
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (user) {
      loadUnreadCount()
      // Optional: Set up polling here or WebSocket listener
      const interval = setInterval(loadUnreadCount, 60000) // 1 min poll
      return () => clearInterval(interval)
    }
  }, [user])

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-base font-semibold text-surface-800 tracking-tight">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-surface-50 rounded-xl px-3.5 py-2 border border-surface-200 w-56 hover:border-surface-300 transition-colors">
          <Search className="w-3.5 h-3.5 text-surface-400" />
          <input
            type="text"
            placeholder="Search…"
            className="bg-transparent text-sm text-surface-700 placeholder-surface-400 outline-none flex-1"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-xl hover:bg-surface-100 transition-colors group"
          >
            <Bell className="w-4.5 h-4.5 text-surface-500 group-hover:text-surface-700 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center bg-danger-500 text-white text-[9px] font-bold rounded-full border-2 border-white shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          <NotificationDropdown 
            isOpen={showDropdown} 
            onClose={() => setShowDropdown(false)} 
          />
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer ring-2 ring-white shadow-card">
          {initials}
        </div>
      </div>
    </header>
  )
}
