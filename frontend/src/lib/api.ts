import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const TOKEN_KEY = 'parklah:token'

// Get token from localStorage
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

// Save token to localStorage
export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

// Remove token from localStorage
export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}

const api = axios.create({
  baseURL,
})

// Add request interceptor to include token in headers
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove invalid token
      removeToken()
      // Don't redirect if we're already on login/register page or if it's the /auth/me check
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        const isAuthPage = path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password'
        const isAuthCheck = error.config?.url?.includes('/auth/me')
        
        // Only redirect if not on auth pages and not checking auth status
        if (!isAuthPage && !isAuthCheck) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
