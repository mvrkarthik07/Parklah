/** View: ResultsView
 * Lifelines: ResultsView → CarparkController
 * Use Cases: UC 2.1/2.2/2.3 (Results & Map)
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import MapView from '../components/MapView'
import type { Carpark } from '../lib/ranking'

export default function ResultsView() {
  const [params] = useSearchParams()
  const [carparks, setCarparks] = useState<Carpark[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ type: 'all', maxDistance: 3000 })
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 1.3521, lng: 103.8198 })
  const original = useRef<Carpark[] | null>(null)

  useEffect(() => {
    const q = params.get('q') || ''
    async function fetchResults() {
      setLoading(true)
      const res = await api.get('/carparks/search', { params: { q } })
      if (res.status >= 200 && res.status < 300) {
        const data = res.data
        setCarparks(data.data.carparks)
        original.current = data.data.carparks
        setCenter(data.data.center)
      }
      setLoading(false)
    }
    fetchResults()
  }, [params])

  function applyFilters() {
    const orig = original.current ?? carparks
    let filtered = [...orig]
    if (filters.type !== 'all') {
      filtered = filtered.filter(
        (c) => (c.carparkType || '').toLowerCase().includes(filters.type)
      )
    }
    if (filters.maxDistance > 0) {
      filtered = filtered.filter((c) => (c.distanceM ?? Infinity) <= filters.maxDistance)
    }
    setCarparks(filtered)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center">Nearby Carparks</h1>

      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <div>
          <label htmlFor="typeFilter" className="block font-medium mb-1">
            Carpark Type
          </label>
          <select
            id="typeFilter"
            title="Select carpark type"
            className="border rounded p-2"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">All</option>
            <option value="multi">Multi-storey</option>
            <option value="basement">Basement</option>
            <option value="surface">Surface</option>
          </select>
        </div>

        <div>
          <label htmlFor="distanceFilter" className="block font-medium mb-1">
            Max Distance (m)
          </label>
          <input
            id="distanceFilter"
            type="number"
            placeholder="e.g. 3000"
            className="border rounded p-2"
            value={filters.maxDistance}
            onChange={(e) =>
              setFilters({ ...filters, maxDistance: parseInt(e.target.value || '0', 10) })
            }
          />
        </div>

        <button
          onClick={applyFilters}
          className="bg-blue-600 text-white px-4 py-2 rounded self-end"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p className="text-center">Loading carparks...</p>
      ) : (
        <>
          <MapView lat={center.lat} lng={center.lng} carparks={carparks} />
          <ul className="mt-4 space-y-2">
            {carparks.map((c) => (
              <li key={c.id} className="border rounded p-2 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-gray-600">{c.address}</p>
                </div>
                <p className="text-sm text-gray-700">{c.fee?.weekday || 'N/A'}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
