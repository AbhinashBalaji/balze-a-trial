import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function VerifyOTP({ email, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(300) // 5 minutes
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  
  const { verifyOTP, resendOTP } = useAuth()
  const navigate = useNavigate()
  const inputRefs = useRef([])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleChange = (e, index) => {
    const value = e.target.value
    if (isNaN(value)) return

    const newOtp = [...otp]
    // Handle paste multiple digits in one box
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split('')
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6) newOtp[index + i] = pastedData[i]
      }
      setOtp(newOtp)
      const nextIndex = Math.min(index + pastedData.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    newOtp[index] = value
    setOtp(newOtp)

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length < 6) {
      setError('Please enter all 6 digits.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await verifyOTP(email, otpValue)
      navigate('/workspace')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await resendOTP(email)
      setResendTimer(60)
      setCanResend(false)
      setTimer(300)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to resend OTP.')
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <h1 className="font-display text-3xl font-bold text-center text-white">Security Check</h1>
      <p className="text-gray-400 text-sm text-center mt-3">
        We've sent a 6-digit code to <br/><span className="text-white font-medium">{email}</span>
      </p>

      <div className="mt-8">
        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-6">
          <div className="flex space-x-2 sm:space-x-4 justify-center w-full">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-gray-900/50 border border-white/10 text-white outline-none focus:border-[#4FD8EA] focus:ring-1 focus:ring-[#4FD8EA] transition-all"
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg w-full text-center">{error}</p>}

          <div className="w-full">
            <button
              type="submit" disabled={loading || otp.join('').length < 6 || timer === 0}
              className="glow-button w-full py-3 rounded-xl bg-gradient-to-r from-[#7C6FFF] to-[#4FD8EA] text-gray-950 font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-col items-center justify-center text-sm">
          {timer > 0 ? (
            <p className="text-gray-400 mb-2">Code expires in <span className="text-white font-medium">{formatTime(timer)}</span></p>
          ) : (
            <p className="text-red-400 mb-2">Code expired</p>
          )}

          <div className="flex items-center space-x-4 mt-2">
            <button 
              onClick={handleResend} 
              disabled={!canResend}
              className="text-[#4FD8EA] hover:text-white transition-colors disabled:text-gray-500"
            >
              Resend Code {resendTimer > 0 && `(${resendTimer}s)`}
            </button>
            <span className="text-gray-600">|</span>
            <button 
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Change Email
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
