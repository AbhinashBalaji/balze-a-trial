import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userDetails, setUserDetails] = useState(null)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.')
      setLoading(false)
      return
    }

    async function verifyToken() {
      try {
        const { data } = await api.get(`/users/invite/verify?token=${token}`)
        setUserDetails(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired invitation link.')
      } finally {
        setLoading(false)
      }
    }
    verifyToken()
  }, [token])

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

    setSubmitting(true)
    setError('')
    try {
      await api.post('/users/invite/accept', { token, password })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept invitation.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-text-muted">Verifying invitation...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <h1 className="font-display text-2xl font-semibold text-center mb-2">Welcome to AthenaIQ</h1>
        
        {success ? (
          <div className="text-center">
            <p className="text-green-400 mb-6">Account activated successfully!</p>
            <p className="text-sm text-text-muted">Redirecting to login...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-400 mb-6">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="text-cyan hover:underline text-sm"
            >
              Return Home
            </button>
          </div>
        ) : (
          <>
            <p className="text-text-muted text-sm text-center mb-6">
              Hi {userDetails?.name}, please create a password for {userDetails?.email}.
            </p>

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
                disabled={submitting}
                className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? 'Activating...' : 'Create Password & Activate'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
