import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/recovery-log':  'Recovery Log',
  '/care-plan':     'Care Plan',
  '/medications':   'Medications',
  '/exercises':     'Exercises',
  '/appointments':  'Appointments',
  '/documents':     'Documents',
  '/ai-assistant':  'AI Assistant',
  '/weekly-report': 'Weekly Report',
  '/doctor/dashboard': 'Doctor Dashboard',
  '/doctor/patients':  'My Patients',
}

export default function Topbar() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const title = routeLabels[pathname] || 'RecoveryOS'

  return (
    <header className="h-16 bg-surface-900 border-b border-surface-800 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-slate-100">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-surface-800 rounded-xl px-4 py-2 border border-surface-700 w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none flex-1"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-surface-800 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  )
}
