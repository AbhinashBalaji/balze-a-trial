import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { motion } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, fullName)
      navigate('/workspace')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create your account.')
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
        className="glass-panel w-full max-w-md rounded-3xl p-10 relative z-10 border border-[#7C6FFF]/30 shadow-2xl"
      >
        <h1 className="font-display text-3xl font-bold text-center text-white">Create your account</h1>
        <p className="text-gray-400 text-sm text-center mt-3">Start reading your documents smarter.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Full name</label>
            <input
              type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-xl bg-gray-900/50 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#4FD8EA] focus:ring-1 focus:ring-[#4FD8EA] transition-all"
              placeholder="Ada Lovelace"
            />
          </div>
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
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl bg-gray-900/50 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#4FD8EA] focus:ring-1 focus:ring-[#4FD8EA] transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="glow-button w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#7C6FFF] to-[#4FD8EA] text-gray-950 font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-400 text-center mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[#4FD8EA] hover:text-white transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
