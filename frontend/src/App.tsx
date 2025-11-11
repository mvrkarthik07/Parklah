// frontend/src/App.tsx
import { useEffect } from 'react'
import { useNavigate, Link, Outlet } from 'react-router-dom'
import api from './lib/api'
import { AuthProvider, useAuthContext } from './lib/AuthContext'

function AppShell() {
  const navigate = useNavigate()
  const { isAuthenticated, setAuthenticated, refreshAuth } = useAuthContext()

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } finally {
      const { removeToken } = await import('./lib/api')
      removeToken()
      setAuthenticated(false)
      navigate('/login')
    }
  }

  useEffect(() => {
    if (isAuthenticated === null) {
      refreshAuth()
    }
  }, [isAuthenticated, refreshAuth])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b shadow-sm sticky top-0 z-50" style={{ backgroundColor: '#272645' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          <div className="flex gap-3 sm:gap-6 items-center justify-between">
            <Link to="/" className="flex flex-col">
              <span className="text-base sm:text-lg font-semibold text-white hover:text-gray-200 transition-colors">
                ParkLah!
              </span>
              <span className="text-[10px] sm:text-xs text-gray-300 font-normal">
                Find it. Park it.
              </span>
            </Link>
            <nav className="flex gap-2 sm:gap-4 text-xs sm:text-sm items-center">
              {isAuthenticated ? (
                <>
                  <Link to="/" className="px-2 sm:px-3 py-1.5 sm:py-2 rounded text-white hover:bg-white/10 hover:text-gray-200 transition-colors">
                    Home
                  </Link>
                  <Link to="/profile" className="px-2 sm:px-3 py-1.5 sm:py-2 rounded text-white hover:bg-white/10 hover:text-gray-200 transition-colors">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded font-semibold transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-white/20 text-white hover:bg-white/30 text-xs sm:text-sm font-medium transition-colors"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
