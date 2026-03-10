import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global error handler to catch unhandled promise rejections and errors
window.addEventListener('error', (event) => {
  // Filter out browser extension errors (they're not our concern)
  if (event.filename && event.filename.includes('content.js')) {
    // Silently ignore browser extension errors
    event.preventDefault()
    return false
  }
  // Log other errors for debugging
  console.error('Global error:', event.error)
  return false
})

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Filter out browser extension errors
  if (event.reason && event.reason.stack && event.reason.stack.includes('content.js')) {
    event.preventDefault()
    return false
  }
  // Log other promise rejections
  console.error('Unhandled promise rejection:', event.reason)
  return false
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
