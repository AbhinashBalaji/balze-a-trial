import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Workspace from './pages/Workspace.jsx'
import Contact from './pages/Contact.jsx'
import About from './pages/About.jsx'
import Users from './pages/Users.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'
import ForceChangePassword from './pages/ForceChangePassword.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import { useAuth } from './AuthContext.jsx'
import { GL } from './components/gl/index.tsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/force-change-password" replace />
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/force-change-password" replace />
  if (user.role !== 'Admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen flex flex-col font-body">
      <GL hovering={false} />
      <Navbar />
      <main className="flex-1 pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route 
            path="/force-change-password" 
            element={
              user && user.must_change_password ? (
                <ForceChangePassword />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="/products" element={<Products />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <Workspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <AdminRoute>
                <AuditLogs />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
