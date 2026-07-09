import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Pill,
  Dumbbell, Calendar, FolderOpen, Bot, BarChart3,
  Users, Settings, LogOut, HeartPulse,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { clsx } from 'clsx'

const patientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/recovery-log', icon: HeartPulse, label: 'Recovery Log' },
  { to: '/care-plan', icon: ClipboardList, label: 'Care Plan' },
  { to: '/medications', icon: Pill, label: 'Medications' },
  { to: '/exercises', icon: Dumbbell, label: 'Exercises' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/weekly-report', icon: BarChart3, label: 'Weekly Report' },
]

const doctorNav = [
  { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctor/patients', icon: Users, label: 'Patients' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/weekly-report', icon: BarChart3, label: 'Reports' },
]

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
]

const caregiverNav = [
  { to: '/caregiver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/caregiver/patients', icon: Users, label: 'Patients' },
  { to: '/weekly-report', icon: BarChart3, label: 'Reports' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const nav = user?.role === 'doctor' ? doctorNav
    : user?.role === 'admin' ? adminNav
      : user?.role === 'caregiver' ? caregiverNav
        : patientNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`

  return (
    <aside className="w-64 bg-white border-r border-surface-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-brand">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-surface-900 text-sm tracking-tight">RecoveryOS</div>
            <div className="text-xs text-surface-400 capitalize">{user?.role} Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(isActive ? 'nav-item-active' : 'nav-item')
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 pt-2 border-t border-surface-100 space-y-0.5">
        <NavLink to="/settings" className="nav-item">
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-danger-600 hover:text-danger-700 hover:bg-danger-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* User pill */}
      <div className="px-3 pb-4 pt-2">
        <div className="bg-surface-50 border border-surface-200 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-surface-800 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-surface-400 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
