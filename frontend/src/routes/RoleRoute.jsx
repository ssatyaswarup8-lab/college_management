import { Navigate, Outlet } from 'react-router-dom'
import useAuth, { getDashboardPath } from '../hooks/useAuth.js'

export default function RoleRoute({ allowedRoles }) {
  const { role, isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(role)) return <Navigate to={getDashboardPath(role)} replace />

  return <Outlet />
}
