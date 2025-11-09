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
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-6 items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-slate-800">
            ParkLah!
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            {isAuthenticated ? (
              <>
                <Link to="/" className="hover:text-slate-950">
                  Home
                </Link>
                <Link to="/profile" className="hover:text-slate-950">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
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
