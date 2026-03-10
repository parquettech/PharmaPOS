import { useState, useEffect } from 'react'
import { authService } from '../services/authService'
import apiClient from '../services/api'

function Users() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const loggedInUser = authService.getCurrentUser()
  const isAdmin = loggedInUser?.role?.toUpperCase() === 'ADMIN'

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    try {
      if (isAdmin) {
        // Admin: Fetch all users from backend
        const response = await apiClient.get('/users/')
        setUsers(response.data || [])
        // Set current user from the list
        const current = response.data?.find(u => String(u.id) === String(loggedInUser?.id)) || loggedInUser
        setCurrentUser(current)
      } else {
        // Regular user: Show only their own information
        if (loggedInUser) {
          setCurrentUser(loggedInUser)
          setUsers([loggedInUser]) // Single user in array for consistency
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load users')
      // Fallback to showing current user info from localStorage
      if (loggedInUser) {
        setCurrentUser(loggedInUser)
        setUsers([loggedInUser])
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 h-full">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
          <p className="text-slate-300 text-sm sm:text-base text-center">Loading user information...</p>
        </div>
      </div>
    )
  }

  if (error && !currentUser) {
    return (
      <div className="p-3 sm:p-4 md:p-6 h-full">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Users</h2>
          <p className="text-red-300 text-sm sm:text-base">{error}</p>
        </div>
      </div>
    )
  }

  // Admin view: Show all users in a table
  if (isAdmin && users.length > 0) {
    return (
      <div className="p-3 sm:p-6 h-full overflow-auto">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">All Users</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-200 text-sm">
              {error} (Showing cached data)
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-700 border-b border-slate-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Created At</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const isCurrentUser = String(user.id) === String(loggedInUser?.id)
                  // Use a unique key combining user.id and index to ensure uniqueness
                  const uniqueKey = user.id ? `user-${user.id}-${index}` : `user-${index}-${user.username || 'unknown'}`
                  return (
                    <tr
                      key={uniqueKey}
                      className={`border-b border-slate-700 hover:bg-slate-750 transition-colors ${
                        isCurrentUser ? 'bg-slate-700/50 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">
                        {user.id}
                        {isCurrentUser && <span className="ml-2 text-xs text-blue-400">(You)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">{user.username}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">{user.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">{user.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'ADMIN' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        }`}>
                          {user.role || 'USER'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm border-r border-slate-700">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.status === 'Active'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                            : 'bg-red-500/20 text-red-300 border border-red-500/50'
                        }`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString() 
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Total Users: <span className="font-semibold text-white">{users.length}</span>
          </div>
        </div>
      </div>
    )
  }

  // Regular user view: Show only current user information
  if (currentUser) {
    const user = currentUser
    return (
      <div className="p-3 sm:p-6 h-full overflow-auto">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">My Profile</h2>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">{user.name || 'Unknown User'}</h3>
              <p className="text-slate-300 text-sm sm:text-base">@{user.username || 'N/A'}</p>
              <span className="inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-300 border border-green-500">
                {user.status || 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">User ID:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.id || 'N/A'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Username:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.username || 'N/A'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Full Name:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.name || 'N/A'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Email Address:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.email || 'N/A'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Phone Number:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.phone || 'N/A'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Role:</p>
              <p className="text-white text-sm sm:text-base font-medium">{user.role || 'USER'}</p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Account Created:</p>
              <p className="text-white text-sm sm:text-base font-medium">
                {user.created_at 
                  ? new Date(user.created_at).toLocaleString() 
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-600">
              <p className="text-slate-400 text-xs sm:text-sm">Last Login:</p>
              <p className="text-white text-sm sm:text-base font-medium">
                {user.last_login 
                  ? new Date(user.last_login).toLocaleString() 
                  : (user.lastLogin || 'N/A')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Users</h2>
        <p className="text-red-300 text-sm sm:text-base">No user information found. Please log in again.</p>
      </div>
    </div>
  )
}

export default Users
