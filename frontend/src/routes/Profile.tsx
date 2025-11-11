import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthContext } from '../lib/AuthContext'

type VehicleProfileResponse = {
  data?: {
    vehicleType: string
    vehicleHeight: number
    vehicleNumber: string | null
    phoneNumber: string | null
  }
}

type MeResponse = {
  data?: {
    twoFactorEnabled?: boolean
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuthContext()
  const [type, setType] = useState('CAR')
  const [height, setHeight] = useState(1.6)
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const profileRes = await api.get<VehicleProfileResponse>('/user/vehicle')
        if (profileRes.data?.data) {
          setType(profileRes.data.data.vehicleType)
          setHeight(profileRes.data.data.vehicleHeight)
          setVehicleNumber(profileRes.data.data.vehicleNumber || '')
          setPhoneNumber(profileRes.data.data.phoneNumber || '')
        }
      } catch (e) {
        console.error(e)
      }
      try {
        const meRes = await api.get<MeResponse>('/auth/me')
        if (meRes.data?.data?.twoFactorEnabled) {
          setTwoFactorEnabled(true)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    setMessage('')
    await api.put('/user/vehicle', {
      vehicleType: type,
      vehicleHeight: height,
      vehicleNumber: vehicleNumber.trim() || null,
    })
    setMessage('Vehicle profile saved successfully.')
  }

  const start2FASetup = async () => {
    setMessage('')
    try {
      const res = await api.get('/auth/setup-2fa')
      if (res.data?.data) {
        setQrCodeUrl(res.data.data.qrCodeUrl)
        setSetupCode(res.data.data.secret)
        setShowSetup(true)
      }
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Failed to setup 2FA')
    }
  }

  const enable2FA = async () => {
    setMessage('')
    try {
      await api.post('/auth/enable-2fa', {
        secret: setupCode,
        token: verificationCode,
      })
      setTwoFactorEnabled(true)
      setShowSetup(false)
      setVerificationCode('')
      setSetupCode('')
      setQrCodeUrl('')
      setMessage('Two-factor authentication enabled.')
      refreshAuth()
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Invalid verification code')
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return
    setMessage('')
    try {
      await api.post('/auth/disable-2fa')
      setTwoFactorEnabled(false)
      setMessage('Two-factor authentication disabled.')
      refreshAuth()
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Failed to disable 2FA')
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-600">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
            aria-label="Back to home"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Profile & Security</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Manage your vehicle details and keep your account secured with two-factor authentication.
        </p>
      </header>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Vehicle profile</h2>
            <p className="text-sm text-slate-500 mt-1">
              Tailor carpark recommendations based on your vehicle type and height.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Vehicle type
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="CAR">Car</option>
                <option value="HEAVY">Heavy vehicle</option>
                <option value="MOTORCYCLE_WITH_SIDECAR">Motorcycle with sidecar</option>
                <option value="MOTORCYCLE">Motorcycle</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Vehicle height (m)
              <input
                type="number"
                step="0.01"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value))}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Vehicle Number
              <input
                type="text"
                placeholder="e.g. SBA1234A"
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone Number
              <input
                type="tel"
                placeholder="e.g. +65 9123 4567"
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled
                title="Phone number can only be set during registration"
              />
            </label>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold shadow hover:bg-slate-700"
            onClick={save}
          >
            Save changes
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Two-factor authentication</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add a second step (time-based code) to prove it&apos;s really you when signing in.
            </p>
          </div>

          {twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                ✓ Two-factor authentication is enabled. You&apos;ll be prompted for a 6-digit code after entering your password.
              </div>
              <button
                onClick={disable2FA}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white font-semibold shadow hover:bg-red-700"
              >
                Disable 2FA
              </button>
            </div>
          ) : showSetup ? (
            <div className="space-y-5">
              <div className="text-sm text-slate-600">
                <p>1. Scan this QR code with Google Authenticator or Authy.</p>
                <p className="mt-2">2. Can&apos;t scan? Use the manual code below.</p>
              </div>
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto h-40 w-40 border rounded-lg" />}
              {setupCode && (
                <div className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-center text-sm font-mono tracking-widest">
                  {setupCode}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enter a 6-digit code to verify</label>
                <input
                  type="text"
                  placeholder="000000"
                  className="w-full rounded-lg border border-slate-200 p-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold shadow hover:bg-slate-700"
                  onClick={enable2FA}
                >
                  Confirm & Enable
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    setShowSetup(false)
                    setQrCodeUrl('')
                    setSetupCode('')
                    setVerificationCode('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Protect your login with a rotating 6-digit code. We recommend enabling it if you sign in from shared devices.
              </div>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold shadow hover:bg-slate-700"
                onClick={start2FASetup}
              >
                Enable 2FA
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
