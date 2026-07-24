import { createContext, useContext, useState, useEffect } from 'react'
import { auth as firebaseAuth, googleProvider } from './firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithCustomToken
} from 'firebase/auth'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          localStorage.setItem('athenaiq_token', token)
          
          const res = await api.get('/auth/me')
          setUser(res.data)
        } catch (error) {
          console.error("Error fetching user data from backend:", error)
          localStorage.removeItem('athenaiq_token')
          setUser(null)
        }
      } else {
        localStorage.removeItem('athenaiq_token')
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password })
      return res.data // Should return { message: "OTP sent" }
    } catch (err) {
      throw err
    }
  }

  const verifyOTP = async (email, otp) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp })
      const customToken = res.data.token
      const userCredential = await signInWithCustomToken(firebaseAuth, customToken)
      const token = await userCredential.user.getIdToken(true)
      localStorage.setItem('athenaiq_token', token)
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      return meRes.data
    } catch (err) {
      throw err
    }
  }

  const resendOTP = async (email) => {
    try {
      const res = await api.post('/auth/resend-otp', { email })
      return res.data
    } catch (err) {
      throw err
    }
  }

  const register = async (email, password, full_name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
      await updateProfile(userCredential.user, { displayName: full_name })
      const token = await userCredential.user.getIdToken(true)
      localStorage.setItem('athenaiq_token', token)
      const res = await api.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch (err) {
      throw err
    }
  }

  const loginWithGoogle = async () => {
    try {
      const userCredential = await signInWithPopup(firebaseAuth, googleProvider)
      const token = await userCredential.user.getIdToken()
      localStorage.setItem('athenaiq_token', token)
      const res = await api.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch (err) {
      throw err
    }
  }

  const logout = async () => {
    await signOut(firebaseAuth)
    localStorage.removeItem('athenaiq_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, verifyOTP, resendOTP, register, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
