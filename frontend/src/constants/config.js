// Application configuration constants
export const APP_CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'PharmaPOS',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}

// API endpoints (will be used when backend is ready)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  // Will add more endpoints as we build
}
