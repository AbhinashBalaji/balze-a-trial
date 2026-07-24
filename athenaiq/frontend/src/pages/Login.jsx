import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import VerifyOTP from './VerifyOTP.jsx'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      setOtpSent(true)
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Could not sign in. Check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-6 py-16 overflow-hidden">
      <AnimatedBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-panel w-full max-w-md rounded-3xl p-10 relative z-10 border border-[#7C6FFF]/30 shadow-2xl flex flex-col items-center min-h-[450px]"
      >
        <AnimatePresence mode="wait">
          {!otpSent ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h1 className="font-display text-3xl font-bold text-center text-white">Welcome back</h1>
              <p className="text-gray-400 text-sm text-center mt-3">Sign in to your AthenaIQ workspace.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Email</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-gray-900/50 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#4FD8EA] focus:ring-1 focus:ring-[#4FD8EA] transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Password</label>
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-gray-900/50 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#4FD8EA] focus:ring-1 focus:ring-[#4FD8EA] transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg text-center">{error}</p>}

                <button
                  type="submit" disabled={loading}
                  className="glow-button w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#7C6FFF] to-[#4FD8EA] text-gray-950 font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending Code…' : 'Sign in'}
                </button>
              </form>

              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900/80 text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    await loginWithGoogle()
                    navigate('/workspace')
                  } catch (err) {
                    setError(err.message || 'Could not sign in with Google.')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="mt-6 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>

              <p className="text-sm text-gray-400 text-center mt-8">
                New to AthenaIQ?{' '}
                <Link to="/register" className="text-[#4FD8EA] hover:text-white transition-colors">Create an account</Link>
              </p>
            </motion.div>
          ) : (
            <VerifyOTP key="otp" email={email} onBack={() => setOtpSent(false)} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
