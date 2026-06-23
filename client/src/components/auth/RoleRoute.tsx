import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  roles: ('patient' | 'caregiver' | 'doctor' | 'admin')[]
}

export default function RoleRoute({ roles }: Props) {
  const { user } = useAuthStore()
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
