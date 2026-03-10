import { useState } from 'react'
import { supabase } from '../lib/supabase'
import api from '../utils/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Demo mode: Allow login without Supabase for testing
      if (!supabase) {
        // Demo authentication - accept any credentials
        const demoUser = {
          id: 'demo-user-1',
          email: username || 'demo@pharmapos.com',
          username: username || 'demo',
          role: 'ADMIN'
        }
        localStorage.setItem('access_token', 'demo-token')
        localStorage.setItem('user', JSON.stringify(demoUser))
        onLogin(demoUser)
        return
      }
      
      // Production: Login via Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: username, // Or use username field
        password: password
      })

      if (authError) throw authError

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="bg-dark-surface p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">PharmaPOS</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!supabase && (
            <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
              <p className="text-yellow-200 text-sm">
                <strong>Demo Mode:</strong> Supabase not configured. Login with any credentials to test the app.
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
