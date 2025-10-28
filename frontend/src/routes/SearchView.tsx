import { useEffect, useState } from 'react'
import api from '../lib/api'
import MapView from '../components/MapView'
import type { Carpark } from '../lib/ranking'

type Center = { lat: number; lng: number }

export default function SearchView() {
  const [q, setQ] = useState('')
  const [center, setCenter] = useState<Center | null>(null)
  const [carparks, setCarparks] = useState<Carpark[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // auto-focus the input
  useEffect(() => {
    const el = document.getElementById('q') as HTMLInputElement | null
    el?.focus()
  }, [])

  async function runSearch(query: string, radiusM = 2000) {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/carparks/search', { params: { q: query, radiusM: 5000 } })
     
      
      setCenter(res.data.data.center)
      setCarparks(res.data.data.carparks || [])
    } catch (e: any) {
      setError(e?.message || 'Search failed')
      setCarparks([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) {
      setError('Enter a place to search')
      return
    }
    await runSearch(q.trim())
  }

  async function handleLocateMe() {
  setError(null)

  // 1️⃣ Check browser geolocation support
  if (!('geolocation' in navigator)) {
    setError('Geolocation not supported in this browser')
    return
  }

  // 2️⃣ Get user’s coordinates
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const lat = coords.latitude
      const lng = coords.longitude

      try {
        // 3️⃣ Send request to backend
        const res = await api.get('/carparks/near', {
          params: { lat, lng, radiusM: 3000 },
        })

        // 4️⃣ Validate response and update map/list
        if (!res.data?.ok) throw new Error(res.data?.error || 'Near search failed')

        setCenter(res.data.data.center)
        setCarparks(res.data.data.carparks || [])
      } catch (e: any) {
        console.error('Locate me error:', e)
        setError(e?.message || 'Near search failed')
      }
    },

    // 5️⃣ Handle user denying location access
    (err) => {
      setError(err.message || 'Failed to get location')
    },

    // 6️⃣ Options
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  )
}



  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">Find a Carpark</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="e.g., Choa Chu Kang, Punggol Waterway, NTU"
          aria-label="Search location"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          className="px-4 py-2 rounded bg-gray-800 text-white"
        >
          Locate me
        </button>
      </form>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* Map needs a real height or it will be invisible */}
          {center ? (
            <MapView lat={center.lat} lng={center.lng} carparks={carparks} />
          ) : (
            <div className="h-[60vh] w-full rounded bg-gray-100 grid place-items-center text-gray-600">
              No map yet — search or click “Locate me”
            </div>
          )}
        </div>

        <div className="md:col-span-1 border rounded p-2 overflow-auto max-h-[60vh]">
          <h2 className="font-medium mb-2">Results</h2>
          {carparks.length === 0 ? (
            <div className="text-sm text-gray-600">No results</div>
          ) : (
            <ul className="space-y-2">
  {carparks.map((c) => (
    <li key={c.id} className="border rounded p-2">
      <div className="font-medium">{c.name}</div>
      <div className="text-xs text-gray-600">{c.address}</div>

      
      <div className="text-xs mt-1">
        {c.fee?.weekday && <div>Weekday: {c.fee.weekday}</div>}
        {c.fee?.saturday && <div>Sat: {c.fee.saturday}</div>}
        {c.fee?.sundayPH && <div>Sun/PH: {c.fee.sundayPH}</div>}
        {c.fee?.freeParking && <div>Free parking: {c.fee.freeParking}</div>}
      </div>
     

      <div className="text-xs mt-1">
        Distance: {typeof c.distanceM === 'number' ? `${Math.round(c.distanceM)} m` : '—'}
        {' · '}
        ETA: {typeof c.etaS === 'number' ? `${Math.round(c.etaS / 60)} min` : '—'}
      </div>
    </li>
  ))}
</ul>

          )}
        </div>
      </div>
    </div>
  )
}
