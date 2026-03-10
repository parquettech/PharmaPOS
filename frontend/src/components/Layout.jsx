import { useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = authService.getCurrentUser()

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Activity tracking and auto-logout on inactivity
  useEffect(() => {
    // Initialize last activity on mount
    authService.updateLastActivity()
    
    // Track user activity (mouse movement, clicks, keyboard)
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const handleActivity = () => {
      authService.updateLastActivity()
    }
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })
    
    // Check for inactivity periodically (every minute)
    const inactivityCheck = setInterval(() => {
      // Check if session is inactive (30 minutes default)
      if (authService.isSessionInactive(30)) {
        // Session inactive - logout
        handleLogout()
      } else {
        // Session active - verify token
        const validateToken = async () => {
          if (!authService.isAuthenticated()) {
            navigate('/login', { replace: true })
            return
          }

          // Verify token with backend (every 5 minutes)
          const lastVerify = localStorage.getItem('lastTokenVerify')
          const now = Date.now()
          if (!lastVerify || (now - parseInt(lastVerify, 10)) > 5 * 60 * 1000) {
            const isValid = await authService.verifyToken()
            if (!isValid) {
              navigate('/login', { replace: true })
            } else {
              localStorage.setItem('lastTokenVerify', now.toString())
            }
          }
        }
        validateToken()
      }
    }, 60 * 1000) // Check every minute
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      clearInterval(inactivityCheck)
    }
  }, [navigate, handleLogout])

  const navItems = [
    { path: '/home', label: 'Home' },
    { path: '/purchase', label: 'Purchase' },
    { path: '/sales', label: 'Sales' },
    { path: '/reports', label: 'Reports' },
  ]

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Title Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-3 sm:px-4 py-2">
        <h1 className="text-white text-xs sm:text-sm font-medium truncate">PharmaPOS - Point of Sale System</h1>
      </div>

      {/* Main Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700">
        <nav className="flex flex-wrap overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                isActive(item.path)
                  ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-3 sm:px-4 py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-slate-300 text-xs truncate">
            Logged in as: {currentUser?.username || 'User'} ({currentUser?.name || 'ADMIN'})
          </span>
          <button
            onClick={handleLogout}
            className="text-slate-300 hover:text-white text-xs underline transition-colors whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default Layout
