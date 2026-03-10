import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (connection refused, timeout, etc.)
    if (!error.response) {
      const errorMessage = error.message || 'Unable to connect to server'
      console.error('Network error:', errorMessage)
      throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:3000')
    }
    
    // Handle HTTP errors
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem('access_token')
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
    
    return Promise.reject(error)
  }
)

export default api
