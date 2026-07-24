import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'

// ORIGINAL LINKS RESTORED
const LINKS = [
  { to: '/', label: 'HOME' },
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/products', label: 'PRODUCTS' },
  { to: '/workspace', label: 'WORKSPACE' },
  { to: '/contact', label: 'CONTACT' },
  { to: '/about', label: 'ABOUT' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-6">
      <nav className="glass-nav w-full max-w-7xl rounded-xl px-6 py-4 flex items-center justify-between">
        
        {/* Left: Logo (Skal styling, AthenaIQ text) */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="grid grid-cols-2 gap-[3px] w-[20px] h-[20px] rotate-45 transform origin-center">
            <div className="bg-white w-[7px] h-[7px] rounded-sm"></div>
            <div className="bg-white w-[7px] h-[7px] rounded-sm translate-y-2"></div>
            <div className="bg-white w-[7px] h-[7px] rounded-sm -translate-y-2"></div>
            <div className="bg-white w-[7px] h-[7px] rounded-sm"></div>
          </div>
          <span className="font-mono-strict font-bold tracking-widest text-white ml-2 text-lg">AthenaIQ</span>
        </Link>

        {/* Center: ORIGINAL Links, Skal styling */}
        <div className="hidden lg:flex items-center gap-8">
          {[...LINKS, ...(user?.role === 'Admin' ? [{ to: '/users', label: 'USERS' }] : [])].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`font-mono-strict text-xs tracking-widest transition-colors ${
                pathname === l.to
                  ? 'text-white font-bold text-glow-yellow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right: User Profile & SIGN IN / OUT */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all hover:bg-white/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet to-cyan flex items-center justify-center shadow-inner">
                  <span className="font-bold text-ink text-sm">
                    {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-sm font-medium text-text-primary leading-tight">
                    {user.full_name || user.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono-strict tracking-wider uppercase">
                    {user.role || (user.roles?.length > 0 ? user.roles[0].role.role_name : 'User')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="font-mono-strict text-xs text-[#FACC15] hover:text-white transition-colors tracking-widest font-bold ml-2"
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="font-mono-strict text-xs text-[#FACC15] hover:text-white transition-colors tracking-widest font-bold text-glow-yellow"
            >
              SIGN IN
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden text-white"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {open && (
        <div className="absolute top-24 w-[calc(100%-2rem)] max-w-7xl glass-nav rounded-xl p-4 lg:hidden flex flex-col gap-4">
          {[...LINKS, ...(user?.role === 'Admin' ? [{ to: '/users', label: 'USERS' }] : [])].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`font-mono-strict text-xs tracking-widest px-3 py-2 rounded-md ${
                pathname === l.to ? 'bg-white/10 text-white' : 'text-gray-400'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => {
                logout()
                setOpen(false)
                navigate('/')
              }}
              className="text-left font-mono-strict text-xs text-[#FACC15] px-3 py-2"
            >
              SIGN OUT
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="font-mono-strict text-xs text-[#FACC15] px-3 py-2 font-bold"
            >
              SIGN IN
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
