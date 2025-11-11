/** View: Register
 * Lifelines: Register → AuthController
 * Use Cases: UC 4.1 (Authentication)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vehicleType, setVehicleType] = useState('CAR')
  const [vehicleHeight, setVehicleHeight] = useState(1.6)
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        vehicleType,
        vehicleHeight,
        vehicleNumber: vehicleNumber.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      })
      if (res.status >= 200 && res.status < 300) {
        navigate('/login')
      } else {
        setError(res.data?.error?.message || 'Registration failed')
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error?.message || e?.message || 'Registration failed. Try again later.'
      setError(errorMsg)
      console.error('Registration error:', e)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4" style={{ backgroundColor: '#272645' }}>
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-slate-900">Register</h2>
        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="vehicleType" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">Vehicle Type</label>
            <select
              id="vehicleType"
              title="Select your vehicle type"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="CAR">Car</option>
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="MOTORCYCLE_WITH_SIDECAR">Motorcycle with Sidecar</option>
              <option value="HEAVY">Heavy Vehicle</option>
            </select>
          </div>

          <div>
            <label htmlFor="vehicleHeight" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">
              Vehicle Height (m)
            </label>
            <input
              id="vehicleHeight"
              type="number"
              placeholder="e.g. 1.6"
              min="1.0"
              step="0.1"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={vehicleHeight}
              onChange={(e) => setVehicleHeight(parseFloat(e.target.value))}
              required
            />
          </div>

          <div>
            <label htmlFor="vehicleNumber" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">
              Vehicle Number (Optional)
            </label>
            <input
              id="vehicleNumber"
              type="text"
              placeholder="e.g. SBA1234A"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block font-medium mb-1 text-sm sm:text-base text-slate-700">
              Phone Number (Optional)
            </label>
            <input
              id="phoneNumber"
              type="tel"
              placeholder="e.g. +65 9123 4567"
              className="w-full border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': '#272645' } as React.CSSProperties}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full text-white py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:opacity-90 transition-opacity shadow-sm"
            style={{ backgroundColor: '#272645' }}
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button 
            onClick={() => navigate('/login')} 
            className="font-semibold hover:underline"
            style={{ color: '#272645' }}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}
