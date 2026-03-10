import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/authService'
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator'

function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: '', color: '' })
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      navigate('/home', { replace: true })
    }
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
    
    // Update password strength indicator
    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.username.trim()) {
      setError('Username is required')
      return
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (!formData.password.trim()) {
      setError('Password is required')
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await authService.signup({
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim() || formData.username.trim(),
      })

      navigate('/login', { state: { message: 'Account created successfully! Please login.' } })
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
    })
    setError('')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Window Title Bar Effect */}
        <div className="bg-slate-900/80 border-b border-slate-700 rounded-t-lg px-3 sm:px-4 py-2 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-medium text-slate-300 truncate">PharmaPOS - Sign Up</h2>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-600"></div>
          </div>
        </div>

        {/* Signup Form Container */}
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-b-lg shadow-2xl p-4 sm:p-6 md:p-8">
          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2 sm:mb-4">
            Create Account
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm text-center mb-6 sm:mb-8">
            Sign up to access PharmaPOS
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2 sm:p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-white text-xs sm:text-sm font-medium">
                Full Name <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                disabled={isLoading}
              />
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-white text-xs sm:text-sm font-medium">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username (min 3 characters)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                autoComplete="username"
                disabled={isLoading}
                minLength={3}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-white text-xs sm:text-sm font-medium">
                Password <span className="text-red-400">*</span>
                {formData.password && (
                  <span className={`ml-2 text-xs ${passwordStrength.color}`}>
                    ({passwordStrength.label})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min 8 chars, uppercase, lowercase, number)"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  autoComplete="new-password"
                  disabled={isLoading}
                  minLength={8}
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
              {formData.password && (
                <div className="text-xs text-slate-400 mt-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li className={formData.password.length >= 8 ? 'text-green-400' : 'text-red-400'}>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'text-green-400' : 'text-red-400'}>
                      One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'text-green-400' : 'text-red-400'}>
                      One lowercase letter
                    </li>
                    <li className={/\d/.test(formData.password) ? 'text-green-400' : 'text-red-400'}>
                      One number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-white text-xs sm:text-sm font-medium">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
                {isLoading ? 'Creating Account...' : 'Sign Up'}
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

          {/* Login Link */}
          <p className="text-center text-slate-400 text-xs sm:text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
              Login here
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

export default Signup
