import axios from 'axios'

export const API_BASE = 'https://athenaiq-backend.onrender.com'

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('athenaiq_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['Bypass-Tunnel-Reminder'] = 'true'
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('athenaiq_token')
      localStorage.removeItem('athenaiq_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
