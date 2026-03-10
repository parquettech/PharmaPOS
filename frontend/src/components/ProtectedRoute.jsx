import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true/false = result
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // First check if token exists and is not expired locally
      const hasToken = authService.isAuthenticated()
      
      if (!hasToken) {
        setIsAuthenticated(false)
        setIsVerifying(false)
        return
      }

      // Verify token with backend
      try {
        const isValid = await authService.verifyToken()
        setIsAuthenticated(isValid)
      } catch (error) {
        console.error('Error verifying token:', error)
        setIsAuthenticated(false)
      } finally {
        setIsVerifying(false)
      }
    }

    checkAuth()
  }, [])

  // Show loading state while verifying
  if (isVerifying || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-sm">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
