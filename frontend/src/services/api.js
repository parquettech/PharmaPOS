// API service setup - connects to FastAPI backend
import axios from 'axios'
import { APP_CONFIG } from '../constants/config'

// Create axios instance
const apiClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Log API configuration on initialization (development only)
if (import.meta.env.DEV) {
  // API Client initialized
}

// Helper function to check if token is expired
function isTokenExpired(token) {
  if (!token) return true
  
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    
    if (!decoded || !decoded.exp) return true
    
    // Check if token is expired (with 5 second buffer)
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime - 5
  } catch (error) {
    console.error('Error checking token expiry:', error)
    return true
  }
}

// Request interceptor (for adding auth tokens and tracking activity)
apiClient.interceptors.request.use(
  (config) => {
    // Request interceptor
    
    // Update last activity timestamp (avoid circular dependency)
    localStorage.setItem('lastActivity', Date.now().toString())
    
    // Don't add Authorization header for login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register')
    
    if (!isAuthEndpoint) {
      // Get token from localStorage
      const token = localStorage.getItem('authToken')
      
      // Check if token exists and is not expired
      if (token) {
        if (isTokenExpired(token)) {
          // Token expired - clear auth and redirect to login
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          localStorage.removeItem('loginTime')
          localStorage.removeItem('tokenExpiresAt')
          localStorage.removeItem('lastActivity')
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            // Use pathname instead of href to avoid showing full URL
            window.location.pathname = '/login'
          }
          
          return Promise.reject(new Error('Token expired'))
        }
        
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor (for handling errors)
apiClient.interceptors.response.use(
  (response) => {
    // Response interceptor
    return response
  },
  (error) => {
    // Handle network errors (connection refused, timeout, etc.)
    if (!error.response) {
      // Only log timeout errors if they're not handled gracefully by the calling code
      // Many components have fallback logic, so we don't want to spam the console
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
      
      if (!isTimeout) {
        // Only log non-timeout network errors (connection refused, etc.)
        console.error('[API] ❌ Network error:', error.message || 'Unable to connect to server')
      }
      
      // Create a more descriptive error
      const networkError = new Error('Unable to connect to server. Please check if the backend is running and accessible.')
      networkError.isNetworkError = true
      networkError.originalError = error
      return Promise.reject(networkError)
    }
    
    // Don't handle 401 for login/signup endpoints - let them handle their own errors
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register')
    
    // Handle 401 Unauthorized (redirect to login) - but only if not already on login page and not an auth endpoint
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear all auth data
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      localStorage.removeItem('tokenExpiresAt')
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        // Use pathname instead of href to avoid showing full URL
        window.location.pathname = '/login'
      }
    }
    
    // Handle 403 Forbidden (account inactive, etc.)
    if (error.response?.status === 403 && !isAuthEndpoint) {
      // Clear auth and redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      localStorage.removeItem('tokenExpiresAt')
      
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        // Use pathname instead of href to avoid showing full URL
        window.location.pathname = '/login'
      }
    }
    
    // Handle CORS errors
    if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS') || error.message?.includes('Network Error')) {
      console.error('CORS or Network error detected. Check backend CORS configuration.')
      const corsError = new Error('CORS error: Backend may not be allowing requests from this origin. Check backend CORS settings.')
      corsError.isNetworkError = true
      return Promise.reject(corsError)
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
