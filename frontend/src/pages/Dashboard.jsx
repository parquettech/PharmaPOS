import { Navigate } from 'react-router-dom'

// Dashboard redirects to Home
function Dashboard() {
  return <Navigate to="/home" replace />
}

export default Dashboard
