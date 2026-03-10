import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '../services/authService'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      navigate('/home', { replace: true })
      return
    }

    if (location.state?.message) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setSuccessMessage(location.state.message)
        window.history.replaceState({}, document.title)
      }, 0)
    }
  }, [location.state, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('') // Clear any previous success messages
    
    // Safely handle username and password - ensure they're strings
    const safeUsername = username != null ? String(username).trim() : ''
    const safePassword = password != null ? String(password).trim() : ''
    
    if (!safeUsername) {
      setError('Please enter your username')
      return
    }
    
    if (!safePassword) {
      setError('Please enter your password')
      return
    }

    setIsLoading(true)
    setError('') // Clear any previous errors before attempting login

    try {
      // Call login service - don't send Authorization header for login
      const result = await authService.login(safeUsername, safePassword)
      
      // Check if login was successful
      if (result && result.token && result.user) {
        // Login successful - clear error and navigate
        setError('')
        setIsLoading(false)
        // Navigate to home
        navigate('/home', { replace: true })
      } else {
        // Invalid response
        setIsLoading(false)
        setError('Login failed - invalid response from server')
      }
    } catch (err) {
      // Handle error properly - show error message
      setIsLoading(false)
      const errorMessage = err.message || 'Login failed. Please check your credentials.'
      setError(errorMessage)
    }
  }

  const handleCancel = () => {
    setUsername('')
    setPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Window Title Bar Effect */}
        <div className="bg-slate-900/80 border-b border-slate-700 rounded-t-lg px-3 sm:px-4 py-2 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-medium text-slate-300 truncate">PharmaPOS - Login</h2>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-b-lg shadow-2xl p-4 sm:p-6 md:p-8">
          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-6 sm:mb-8">
            PharmaPOS Login
          </h1>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-2 sm:p-3 bg-green-500/20 border border-green-500/50 rounded text-green-200 text-xs sm:text-sm">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2 sm:p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-white text-xs sm:text-sm font-medium">
                Username:
              </label>
              <input
                type="text"
                id="username"
                value={username || ''}
                onChange={(e) => {
                  try {
                    // Safely handle input value - ensure it's always a string
                    const inputValue = e?.target?.value
                    const safeValue = (inputValue != null && inputValue !== undefined) ? String(inputValue) : ''
                    setUsername(safeValue)
                    setError('')
                  } catch (err) {
                    // Silently handle any errors from browser extensions
                    setUsername('')
                  }
                }}
                placeholder="Enter username"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                autoComplete="username"
                data-lpignore="true"
                data-form-type="username"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-white text-xs sm:text-sm font-medium">
                Password:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter password"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Signup Link */}
          <p className="text-center text-slate-400 text-xs sm:text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-500 hover:text-blue-400 font-medium">
              Sign up here
            </Link>
          </p>
        </div>

        {/* Footer Info */}
        <p className="text-center text-slate-400 text-xs mt-4">
          PharmaPOS - Pharmacy Billing System
        </p>
      </div>
    </div>
  )
}

export default Login
