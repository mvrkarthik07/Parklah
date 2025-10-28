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
      })
      if (res.status >= 200 && res.status < 300) {
        navigate('/login')
      } else {
        setError('Registration failed')
      }
    } catch {
      setError('Registration failed. Try again later.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
      {error && <p className="text-red-500 mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block font-medium mb-1">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-medium mb-1">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="vehicleType" className="block font-medium mb-1">Vehicle Type</label>
          <select
            id="vehicleType"
            title="Select your vehicle type"
            className="w-full border rounded p-2"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          >
            <option value="CAR">Car</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="TRUCK">Truck</option>
          </select>
        </div>

        <div>
          <label htmlFor="vehicleHeight" className="block font-medium mb-1">
            Vehicle Height (m)
          </label>
          <input
            id="vehicleHeight"
            type="number"
            placeholder="e.g. 1.6"
            min="1.0"
            step="0.1"
            className="w-full border rounded p-2"
            value={vehicleHeight}
            onChange={(e) => setVehicleHeight(parseFloat(e.target.value))}
            required
          />
        </div>

        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Register
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-blue-600 underline">
          Login
        </button>
      </p>
    </div>
  )
}
