import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('athenaiq_user')
    return raw ? JSON.parse(raw) : null
  })
  
  useEffect(() => {
    const token = localStorage.getItem('athenaiq_token')
    if (token) {
      api.get('/auth/me').then(res => {
        setUser(res.data)
        localStorage.setItem('athenaiq_user', JSON.stringify(res.data))
      }).catch(() => {
        // Token invalid or expired
        localStorage.removeItem('athenaiq_token')
        localStorage.removeItem('athenaiq_user')
        setUser(null)
      })
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('athenaiq_token', data.access_token)
    localStorage.setItem('athenaiq_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name })
    localStorage.setItem('athenaiq_token', data.access_token)
    localStorage.setItem('athenaiq_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('athenaiq_token')
    localStorage.removeItem('athenaiq_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
