// frontend/src/lib/api.ts
import axios from 'axios'

// Adjust baseURL if your proxy is different
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  withCredentials: false, // keep cookies for auth
  timeout: 15000,
})

export default api
