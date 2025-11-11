import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from './api'

type AuthContextValue = {
  isAuthenticated: boolean | null
  setAuthenticated: (value: boolean) => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const refreshAuth = useCallback(async () => {
    try {
      await api.get('/auth/me')
      setIsAuthenticated(true)
    } catch (error: any) {
      // 401 is expected when not logged in, don't treat it as an error
      if (error?.response?.status === 401) {
        setIsAuthenticated(false)
      } else {
        // Other errors (network, etc.) - assume not authenticated
        setIsAuthenticated(false)
      }
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setAuthenticated: setIsAuthenticated, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
