import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Purchase from './pages/Purchase'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { testBackendConnection } from './utils/testConnection'

function App() {
  // Test backend connection on app startup (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      testBackendConnection().then(result => {
        if (result.success) {
          // Backend connection successful
        } else {
          console.error('❌ Backend connection failed:', result.error)
          console.error('Full error details:', result.details)
        }
      })
    }
  }, [])
  return (
    <ErrorBoundary>
      <Router>
      <Routes>
        {/* Login and Signup pages - entry points */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/home/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/purchase"
          element={
            <ProtectedRoute>
              <Layout>
                <Purchase />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Layout>
                <Sales />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Test route */}
        <Route path="/test" element={<div style={{padding: '20px', background: '#1a1a1a', color: 'white', minHeight: '100vh'}}><h1>Test - React is Working!</h1><a href="/login" style={{color: '#60a5fa'}}>Go to Login</a></div>} />
        
        {/* Default redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
