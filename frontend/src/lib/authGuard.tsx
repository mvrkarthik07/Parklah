import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, refreshAuth } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated === null) {
      refreshAuth()
    } else if (isAuthenticated === false) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate, refreshAuth])

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-600">
        Checking your session...
      </div>
    )
  }

  if (isAuthenticated === false) {
    return null
  }

  return <>{children}</>
}

