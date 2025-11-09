import { useState } from 'react'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoToken, setDemoToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setDemoToken(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/request-reset', { email })
      setMessage('If the email exists, a reset link has been sent (check demo token below).')
      if (data?.data?.token) {
        setDemoToken(data.data.token)
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Unable to process request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
          <p className="text-sm text-slate-600">
            Enter your email and we&apos;ll generate a reset token for you to update your password.
          </p>
        </div>

        {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {demoToken && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="font-semibold">Demo reset token</p>
            <p className="break-all text-xs mt-1">{demoToken}</p>
            <p className="text-xs text-blue-500 mt-2">
              Use this token within 15 minutes on the reset password page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
