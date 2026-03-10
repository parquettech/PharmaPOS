import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'
import ProtectedRoute from './ProtectedRoute'

function RoleProtectedRoute({ children, requiredRole, fallbackPath = '/home' }) {
  // First check authentication
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  // Check role
  const userRole = authService.getUserRole()
  
  // ADMIN has access to everything
  if (userRole === 'ADMIN') {
    return children
  }

  // Check if user has required role
  if (!authService.hasRole(requiredRole)) {
    // Redirect to fallback path if user doesn't have required role
    return <Navigate to={fallbackPath} replace />
  }

  return children
}

export default RoleProtectedRoute
