// Utility to test backend connection
import apiClient from '../services/api'

export async function testBackendConnection() {
  try {
    // Testing backend connection
    // Try to hit the health endpoint (no /api prefix needed for root endpoints)
    const healthResponse = await fetch('http://localhost:3000/health')
    const healthData = await healthResponse.json()
    
    // Try the root endpoint
    const rootResponse = await fetch('http://localhost:3000/')
    const rootData = await rootResponse.json()
    
    return {
      success: true,
      health: healthData,
      root: rootData
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    return {
      success: false,
      error: error.message,
      details: error
    }
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  window.testBackendConnection = testBackendConnection
}
