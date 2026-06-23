import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Pill,
  Dumbbell, Calendar, FolderOpen, Bot, BarChart3,
  Users, Settings, LogOut, HeartPulse,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { clsx } from 'clsx'

const patientNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/recovery-log',  icon: HeartPulse,      label: 'Recovery Log' },
  { to: '/care-plan',     icon: ClipboardList,   label: 'Care Plan' },
  { to: '/medications',   icon: Pill,            label: 'Medications' },
  { to: '/exercises',     icon: Dumbbell,        label: 'Exercises' },
  { to: '/appointments',  icon: Calendar,        label: 'Appointments' },
  { to: '/documents',     icon: FolderOpen,      label: 'Documents' },
  { to: '/ai-assistant',  icon: Bot,             label: 'AI Assistant' },
  { to: '/weekly-report', icon: BarChart3,       label: 'Weekly Report' },
]

const doctorNav = [
  { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctor/patients',  icon: Users,           label: 'Patients' },
  { to: '/appointments',     icon: Calendar,        label: 'Appointments' },
  { to: '/weekly-report',    icon: BarChart3,       label: 'Reports' },
]

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',     icon: Users,           label: 'Users' },
]

const caregiverNav = [
  { to: '/caregiver/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/caregiver/patients',   icon: Users,           label: 'Patients' },
  { to: '/weekly-report',        icon: BarChart3,       label: 'Reports' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const nav = user?.role === 'doctor'    ? doctorNav
             : user?.role === 'admin'     ? adminNav
             : user?.role === 'caregiver' ? caregiverNav
             : patientNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">RecoveryOS</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
      <div className="p-4 border-t border-surface-800 space-y-1">
        <NavLink to="/settings" className="nav-item">
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
        <button onClick={handleLogout} className="nav-item w-full text-left text-danger-500 hover:text-danger-400 hover:bg-danger-500/10">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* User pill */}
      <div className="p-4 pt-0">
        <div className="glass p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
