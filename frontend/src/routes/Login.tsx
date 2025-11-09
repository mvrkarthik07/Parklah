/** View: Login
 * Lifelines: Login → AuthController
 * Use Cases: UC 4.1 (Authentication)
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuthContext } from '../lib/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { setAuthenticated } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFactorDemoCode, setTwoFactorDemoCode] = useState<string | null>(null)
  const [twoFactorDemoExpiresIn, setTwoFactorDemoExpiresIn] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setTwoFactorDemoCode(null)
    setTwoFactorDemoExpiresIn(null)
    try {
      const res = await api.post('/auth/login', { email, password, rememberMe })
      const data = res.data.data
      if (data.requires2FA) {
        setRequires2FA(true)
        setTwoFactorDemoCode(data.twoFactorDemoCode ?? null)
        setTwoFactorDemoExpiresIn(data.twoFactorDemoExpiresIn ?? null)
      } else {
        setAuthenticated(true)
        navigate('/')
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error?.message || 'Invalid email or password'
      setError(errorMsg)
    }
  }

  async function handle2FAVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/auth/verify-2fa', { email, token: twoFactorCode, rememberMe })
      setAuthenticated(true)
      navigate('/')
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error?.message || 'Invalid 2FA code'
      setError(errorMsg)
    }
  }

  if (requires2FA) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center text-slate-900">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600 text-center">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
          {twoFactorDemoCode && (
            <div className="rounded-lg border border-dashed border-blue-400 bg-blue-50 px-4 py-3 text-center">
              <p className="text-sm text-blue-600 font-medium">Demo code (would be sent via email/SMS):</p>
              <p className="text-3xl font-semibold tracking-widest text-blue-700 mt-1">{twoFactorDemoCode}</p>
              {twoFactorDemoExpiresIn && (
                <p className="text-xs text-blue-500 mt-1">Expires in ~{twoFactorDemoExpiresIn}s</p>
              )}
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <form onSubmit={handle2FAVerify} className="space-y-4">
            <div>
              <label htmlFor="twoFactorCode" className="block font-medium mb-1">2FA Code</label>
              <input
                id="twoFactorCode"
                type="text"
                placeholder="000000"
                className="w-full border rounded-lg p-3 text-center text-2xl tracking-widest"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember this device
              </label>
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false)
                  setTwoFactorCode('')
                }}
                className="text-slate-600 hover:text-slate-800"
              >
                Back
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold shadow hover:bg-slate-700"
            >
              Verify & Continue
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-sm text-gray-600">
            Sign in to discover the best carparks around you.
          </p>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block font-medium text-sm text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block font-medium text-sm text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me for 30 days
            </label>
            <Link to="/forgot-password" className="text-slate-900 font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold shadow hover:bg-slate-700"
          >
            Sign in
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-slate-900 font-semibold hover:underline"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  )
}
