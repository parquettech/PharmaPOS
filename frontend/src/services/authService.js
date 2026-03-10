// Authentication service - connects to FastAPI backend
import apiClient from './api'

// Helper function to decode JWT token
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

// Helper function to check if token is expired
function isTokenExpired(token) {
  if (!token) return true
  
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return true
    
    // Check if token is expired (with 5 second buffer)
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime - 5
  } catch (error) {
    console.error('Error checking token expiry:', error)
    return true
  }
}

export const authService = {
  // Login function - calls backend API
  async login(username, password) {
    try {
      // Safely validate and normalize credentials
      const safeUsername = username != null ? String(username).trim() : ''
      const safePassword = password != null ? String(password) : ''
      
      if (!safeUsername || !safePassword) {
        throw new Error('Username and password are required')
      }
      
      // Call backend login API - apiClient interceptor will skip auth header for /auth/login
      const response = await apiClient.post('/auth/login', {
        username: safeUsername,
        password: safePassword
      })
      
      // Check if response has data
      if (!response || !response.data) {
        throw new Error('Invalid response from server')
      }
      
      // Handle both access_token and accessToken formats
      const token = response.data.access_token || response.data.accessToken
      const user = response.data.user
      
      if (!token) {
        throw new Error('Login failed - no token received from server')
      }
      
      if (!user) {
        throw new Error('Login failed - no user data received from server')
      }
      
      // Decode token to get expiry
      const decoded = decodeToken(token)
      const expiresAt = decoded?.exp ? decoded.exp * 1000 : null
      
      // Store token and user info
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('loginTime', new Date().toISOString())
      if (expiresAt) {
        localStorage.setItem('tokenExpiresAt', expiresAt.toString())
      }
      
      return { token: token, user }
    } catch (error) {
      // Handle API errors
      if (error.response) {
        // Check if it's a 401 or 403 error
        if (error.response.status === 401 || error.response.status === 403) {
          const message = error.response.data?.detail || error.response.data?.message || 'Invalid username or password'
          throw new Error(message)
        }
        const message = error.response.data?.detail || error.response.data?.message || 'Login failed'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Login failed')
      }
    }
  },

  // Signup function - register new user
  async signup(userData) {
    try {
      // Validate input
      if (!userData.username || !userData.password) {
        throw new Error('Username and password are required')
      }

      // Call backend signup API
      const response = await apiClient.post('/auth/register', {
        username: userData.username,
        password: userData.password,
        name: userData.name || userData.username,
        role: 'USER', // Always USER role for signups
      })

      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Signup failed'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Signup failed')
      }
    }
  },

  // Logout function
  async logout() {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        // Call backend logout API to invalidate session
        try {
          await apiClient.post('/auth/logout')
        } catch (error) {
          // Continue with logout even if API call fails
          // Logout API call failed
        }
      }
    } catch (error) {
      // Error during logout
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      localStorage.removeItem('tokenExpiresAt')
      localStorage.removeItem('lastActivity')
    }
  },

  // Verify token with backend
  async verifyToken() {
    try {
      const token = localStorage.getItem('authToken')
      if (!token || isTokenExpired(token)) {
        this.logout()
        return false
      }
      
      // Call backend to verify token
      const response = await apiClient.get('/auth/me')
      if (response && response.data) {
        // Update user data if changed
        localStorage.setItem('user', JSON.stringify(response.data))
        return true
      }
      return false
    } catch (error) {
      // If verification fails, clear auth and return false
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logout()
      }
      return false
    }
  },

  // Check if user is authenticated (with token expiry check)
  isAuthenticated() {
    const token = localStorage.getItem('authToken')
    if (!token) return false
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      this.logout()
      return false
    }
    
    return true
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user')
    if (user) {
      const userObj = JSON.parse(user)
      // Update last login time if available
      const loginTime = localStorage.getItem('loginTime')
      if (loginTime) {
        userObj.lastLogin = new Date(loginTime).toLocaleString()
      }
      return userObj
    }
    return null
  },

  // Get user role
  getUserRole() {
    const user = this.getCurrentUser()
    return user?.role || null
  },

  // Check if user has specific role
  hasRole(requiredRole) {
    const userRole = this.getUserRole()
    if (!userRole) return false
    
    // ADMIN has access to everything
    if (userRole === 'ADMIN') return true
    
    // Check exact match
    return userRole === requiredRole
  },

  // Update last activity timestamp
  updateLastActivity() {
    localStorage.setItem('lastActivity', Date.now().toString())
  },

  // Check if session is inactive (default 30 minutes)
  isSessionInactive(timeoutMinutes = 30) {
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) return true
    
    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const timeoutMs = timeoutMinutes * 60 * 1000
    
    return (now - lastActivityTime) > timeoutMs
  },
}
