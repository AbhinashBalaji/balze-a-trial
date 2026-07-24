import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function ForceChangePassword() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { updatePassword } = await import('firebase/auth')
      const { auth: firebaseAuth } = await import('../firebase')
      if (firebaseAuth.currentUser) {
        await updatePassword(firebaseAuth.currentUser, password)
      }
      
      await api.post('/auth/change-password') // We'll modify backend to just set must_change_password = False
      setSuccess(true)
      
      // Update local context user object so ProtectedRoute allows them in
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Failed to update password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <h1 className="font-display text-2xl font-semibold text-center mb-2">Change Password Required</h1>
        
        {success ? (
          <div className="text-center">
            <p className="text-green-400 mb-6">Password updated successfully!</p>
            <p className="text-sm text-text-muted">Redirecting...</p>
          </div>
        ) : (
          <>
            <p className="text-text-muted text-sm text-center mb-6">
              For security reasons, you must change your temporary password before accessing your account.
            </p>

            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-text-muted">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-violet/60 transition"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-violet/60 transition"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
