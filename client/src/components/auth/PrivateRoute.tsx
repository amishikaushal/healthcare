import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function PrivateRoute() {
  const { user, accessToken } = useAuthStore()
  if (!user || !accessToken) return <Navigate to="/login" replace />
  return <Outlet />
}
