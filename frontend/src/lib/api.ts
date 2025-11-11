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
      // Clear any stale auth state
      if (typeof window !== 'undefined') {
        // Don't redirect if we're already on login/register page
        const path = window.location.pathname
        if (path !== '/login' && path !== '/register' && path !== '/forgot-password' && path !== '/reset-password') {
          // Only redirect if not already on auth pages
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
