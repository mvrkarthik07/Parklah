import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login/register page or if it's the /auth/me check
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        const isAuthPage = path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password'
        const isAuthCheck = error.config?.url?.includes('/auth/me')
        
        // Only redirect if not on auth pages and not checking auth status
        if (!isAuthPage && !isAuthCheck) {
          // Small delay to avoid race conditions
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
