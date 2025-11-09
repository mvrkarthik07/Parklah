/** View: ResultsView
 * Lifelines: ResultsView → CarparkController
 * Use Cases: UC 2.1/2.2/2.3 (Results & Map)
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import MapView from '../components/MapView'
import type { Carpark } from '../lib/ranking'
import { getAvailabilityLines } from '../utils/availability'
import type { Filters } from '../types/filters'
import { formatDistance, formatEta } from '../utils/format'

const CARPARK_TYPE_OPTIONS = [
  { value: 'all', label: 'Any type' },
  { value: 'MULTI-STOREY', label: 'Multi-storey' },
  { value: 'SURFACE', label: 'Surface' },
  { value: 'BASEMENT', label: 'Basement' },
]

const VEHICLE_TYPE_OPTIONS = [
  { value: 'all', label: 'Any vehicle' },
  { value: 'CAR', label: 'Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'MOTORCYCLE_WITH_SIDECAR', label: 'Motorcycle (sidecar)' },
  { value: 'HEAVY', label: 'Heavy vehicle' },
]

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any price' },
  { value: 'budget', label: 'Budget friendly (≤$1/30min)' },
  { value: 'standard', label: 'Standard ($1-$2/30min)' },
  { value: 'premium', label: 'Premium (>$2/30min)' },
]

const DISTANCE_OPTIONS = [
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 2000, label: 'Within 2 km' },
  { value: 5000, label: 'Within 5 km' },
]

const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any availability' },
  { value: 'high', label: 'High availability (≥60%)' },
  { value: 'medium', label: 'Medium (30-60%)' },
  { value: 'low', label: 'Low (<30%)' },
]

function parsePriceRange(feeText?: string) {
  if (!feeText) return Infinity
  const match = feeText.match(/\$([0-9]+(?:\.[0-9]+)?)/)
  if (!match) return Infinity
  return parseFloat(match[1])
}

function getAvailabilityPercentage(carpark: Carpark) {
  const avail = carpark.lotAvailability?.C
  if (!avail) return null
  if (!avail.total || avail.total === 0) return null
  return (avail.available ?? 0) / avail.total
}

function applyLocalFilters(carparks: Carpark[], filters: Filters) {
  return carparks.filter((cp) => {
    if (filters.carparkType !== 'all') {
      if ((cp.carparkType || '').toUpperCase().indexOf(filters.carparkType) === -1) {
        return false
      }
    }

    if (filters.vehicleType !== 'all') {
      const type = filters.vehicleType
      if (type === 'HEAVY') {
        if (!cp.gantryHeightM || cp.gantryHeightM < 3.0) return false
      }
      if (type === 'MOTORCYCLE' || type === 'MOTORCYCLE_WITH_SIDECAR') {
        const hasMotorcycleLots = Boolean(cp.lotAvailability?.Y)
        if (!hasMotorcycleLots) return false
      }
    }

    if (filters.price !== 'any') {
      const weekdayPrice = parsePriceRange(cp.fee?.weekday)
      if (filters.price === 'budget' && weekdayPrice > 1) return false
      if (filters.price === 'standard' && (weekdayPrice <= 1 || weekdayPrice > 2)) return false
      if (filters.price === 'premium' && weekdayPrice <= 2) return false
    }

    if (filters.maxDistance && typeof cp.distanceM === 'number') {
      if (cp.distanceM > filters.maxDistance) return false
    }

    if (filters.availability !== 'any') {
      const pct = getAvailabilityPercentage(cp)
      if (pct === null) return false
      if (filters.availability === 'high' && pct < 0.6) return false
      if (filters.availability === 'medium' && (pct < 0.3 || pct >= 0.6)) return false
      if (filters.availability === 'low' && pct >= 0.3) return false
    }

    return true
  })
}

const STORAGE_KEY = 'parklah:userLocation'

type StoredLocation = { lat: number; lng: number }

function loadStoredLocation(): StoredLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number'
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function storeLocation(location: StoredLocation) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
}

export default function ResultsView() {
  const [params] = useSearchParams()
  const [carparks, setCarparks] = useState<Carpark[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    carparkType: 'all',
    vehicleType: 'all',
    price: 'any',
    maxDistance: null,
    availability: 'any',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 1.3521, lng: 103.8198 })
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => loadStoredLocation())
  const original = useRef<Carpark[] | null>(null)

  // Try to get user location on mount
  useEffect(() => {
    const stored = loadStoredLocation()
    if (stored) {
      setUserLocation(stored)
      return
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const location = { lat: coords.latitude, lng: coords.longitude }
          setUserLocation(location)
          storeLocation(location)
        },
        () => {},
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
      )
    }
  }, [])

  useEffect(() => {
    const q = params.get('q') || ''
    async function fetchResults() {
      setLoading(true)
      const requestParams: Record<string, any> = { q, radiusM: 8000 }
      if (userLocation) {
        requestParams.originLat = userLocation.lat
        requestParams.originLng = userLocation.lng
      }
      const res = await api.get('/carparks/search', { params: requestParams })
      if (res.status >= 200 && res.status < 300) {
        const data = res.data
        const raw = data.data.carparks || []
        original.current = raw
        const filtered = applyLocalFilters(raw, filters)
        setCarparks(filtered)
        setCenter(data.data.center)
      }
      setLoading(false)
    }
    fetchResults()
  }, [params, userLocation, filters])

  function applyFilters() {
    const raw = original.current ?? carparks
    const filtered = applyLocalFilters(raw, filters)
    setCarparks(filtered)
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center">Nearby Carparks</h1>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          onClick={() => setShowFilters(true)}
        >
          Filters
        </button>
        <p className="text-xs text-slate-500">{filtersSummary(filters)}</p>
      </div>

      {loading ? (
        <p className="text-center">Loading carparks...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-4 min-w-0">
              <MapView
                lat={center.lat}
                lng={center.lng}
                carparks={carparks}
                selectedCarpark={selectedCarpark}
                userLocation={userLocation}
                onCarparkSelect={setSelectedCarpark}
              />
            </div>
            <div className="space-y-4 min-w-0 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1">
              {selectedCarpark ? (
                <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3 max-h-[28rem] overflow-y-auto">
                  <button
                    onClick={() => setSelectedCarpark(null)}
                    className="ml-auto block text-gray-500 hover:text-gray-700"
                    type="button"
                  >
                    ×
                  </button>
                  <h2 className="text-lg font-semibold text-slate-900 break-words">{selectedCarpark.name}</h2>
                  <p className="text-sm text-gray-600">{selectedCarpark.address}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-800">Distance</p>
                      <p>{formatDistance(selectedCarpark.distanceM)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">ETA</p>
                      <p>{formatEta(selectedCarpark.etaS)}</p>
                    </div>
                    {selectedCarpark.carparkType && (
                      <div className="col-span-2">
                        <p className="font-semibold text-slate-800">Type</p>
                        <p>{selectedCarpark.carparkType}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="font-semibold text-slate-800">Navigate</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedCarpark.lat},${selectedCarpark.lng}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs text-slate-600">
                    <h3 className="font-semibold text-slate-800">Rates</h3>
                    <div className="grid grid-cols-2 gap-1">
                      <p>Weekday: {selectedCarpark.fee?.weekday || '—'}</p>
                      <p>Sat: {selectedCarpark.fee?.saturday || '—'}</p>
                      <p>Sun/PH: {selectedCarpark.fee?.sundayPH || '—'}</p>
                      {selectedCarpark.fee?.freeParking && <p>Free: {selectedCarpark.fee.freeParking}</p>}
                    </div>
                    {!selectedCarpark.fee?.weekday && !selectedCarpark.fee?.saturday && !selectedCarpark.fee?.sundayPH && (
                      <p className="text-gray-500">Rates not available</p>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs text-slate-600">
                    <h3 className="font-semibold text-slate-800">Availability</h3>
                    {(() => {
                      const lines = getAvailabilityLines(selectedCarpark.lotAvailability)
                      if (lines.length === 0) {
                        return <p className="text-gray-500">Availability data unavailable.</p>
                      }
                      return (
                        <ul className="space-y-1">
                          {lines.map((line) => (
                            <li key={`${selectedCarpark.id}-${line}`} className="flex items-center gap-1">
                              <span aria-hidden>•</span>
                              <span className="truncate">{line}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <div className="border rounded p-4 bg-gray-50 text-center text-gray-500">
                  Click a carpark to view details
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
            <ul className="space-y-2">
              {carparks.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setSelectedCarpark(c)}
                  className={`border rounded-lg p-3 flex flex-col gap-2 cursor-pointer transition-colors md:flex-row md:items-start md:justify-between ${
                    selectedCarpark?.id === c.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.lat},${c.lng}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Navigate
                      </a>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{c.address}</p>
                    <p className="text-xs text-gray-500">
                      Distance: {formatDistance(c.distanceM)} · ETA: {formatEta(c.etaS)}
                    </p>
                    <div className="text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">Availability</p>
                      {getAvailabilityLines(c.lotAvailability).length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {getAvailabilityLines(c.lotAvailability).map((line) => (
                            <li key={`${c.id}-${line}`} className="flex items-center gap-1">
                              <span aria-hidden>•</span>
                              <span className="truncate">{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Availability data unavailable</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 text-left md:text-right shrink-0">
                    <p>Weekday: {c.fee?.weekday || '—'}</p>
                    <p>Sat: {c.fee?.saturday || '—'}</p>
                    <p>Sun/PH: {c.fee?.sundayPH || '—'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {showFilters && (
        <FilterModal
          initialFilters={filters}
          onApply={(draft) => {
            setFilters(draft)
            setShowFilters(false)
            const filtered = applyLocalFilters(original.current ?? carparks, draft)
            setCarparks(filtered)
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

function filtersSummary(filters: Filters) {
  const parts = []
  if (filters.carparkType !== 'all') parts.push(`Type: ${filters.carparkType}`)
  if (filters.vehicleType !== 'all') parts.push(`Vehicle: ${filters.vehicleType}`)
  if (filters.price !== 'any') parts.push(`Price: ${filters.price}`)
  if (filters.maxDistance) parts.push(`≤${Math.round(filters.maxDistance / 100) / 10} km`)
  if (filters.availability !== 'any') parts.push(`Availability: ${filters.availability}`)
  return parts.length ? parts.join(' · ') : 'Showing all carparks'
}

function FilterModal({
  initialFilters,
  onApply,
  onClose,
}: {
  initialFilters: Filters
  onApply: (filters: Filters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Filters>(initialFilters)

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Filter carparks</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">×</button>
        </div>

        <div className="grid gap-4">
          <FilterSelect
            label="Carpark type"
            value={draft.carparkType}
            options={CARPARK_TYPE_OPTIONS}
            onChange={(value) => setDraft((prev: Filters) => ({ ...prev, carparkType: value }))}
          />
          <FilterSelect
            label="Vehicle type"
            value={draft.vehicleType}
            options={VEHICLE_TYPE_OPTIONS}
            onChange={(value) => setDraft((prev: Filters) => ({ ...prev, vehicleType: value }))}
          />
          <FilterSelect
            label="Price band"
            value={draft.price}
            options={PRICE_OPTIONS}
            onChange={(value) => setDraft((prev: Filters) => ({ ...prev, price: value as Filters['price'] }))}
          />
          <FilterSelect
            label="Distance limit"
            value={draft.maxDistance ? String(draft.maxDistance) : 'any'}
            options={[{ value: 'any', label: 'Any distance' }, ...DISTANCE_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))]}
            onChange={(value) =>
              setDraft((prev: Filters) => ({
                ...prev,
                maxDistance: value === 'any' ? null : parseInt(value, 10),
              }))
            }
          />
          <FilterSelect
            label="Availability"
            value={draft.availability}
            options={AVAILABILITY_OPTIONS}
            onChange={(value) =>
              setDraft((prev: Filters) => ({ ...prev, availability: value as Filters['availability'] }))
            }
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => {
              const defaults: Filters = {
                carparkType: 'all',
                vehicleType: 'all',
                price: 'any',
                maxDistance: null,
                availability: 'any',
              }
              setDraft(defaults)
              onApply(defaults)
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Reset
          </button>
          <button
            onClick={() => onApply(draft)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
