import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { authService } from '../services/authService'
import Companies from './Companies'
import Users from './Users'
import Stock from './Stock'
import StockList from './StockList'

function Home() {
  const location = useLocation()
  const currentUser = authService.getCurrentUser()
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN'

  // Base navigation items (always visible)
  const baseNavItems = [
    { path: '/home/companies', label: 'Companies' },
    { path: '/home/stock', label: 'Brand' },
    { path: '/home/stock-list', label: 'Stock List' },
  ]

  // Add Users tab only for admin
  const subNavItems = isAdmin
    ? [...baseNavItems, { path: '/home/users', label: 'Users' }]
    : baseNavItems

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Default redirect to Companies if on /home
  if (location.pathname === '/home') {
    return <Navigate to="/home/companies" replace />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700">
        <nav className="flex flex-wrap overflow-x-auto">
          {subNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                isActive(item.path)
                  ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Sub-Module Content */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="companies" element={<Companies />} />
          <Route path="users" element={<Users />} />
          <Route path="stock" element={<Stock />} />
          <Route path="stock-list" element={<StockList />} />
          <Route path="*" element={<Navigate to="/home/companies" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default Home
