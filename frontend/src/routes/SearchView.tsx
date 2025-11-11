import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'
import MapView from '../components/MapView'
import WeatherWidget from '../components/WeatherOverlay'
import type { Carpark } from '../lib/ranking'
import { getAvailabilityLines } from '../utils/availability'
import type { Filters } from '../types/filters'
import { formatDistance, formatEta } from '../utils/format'

type Center = { lat: number; lng: number }

const STORAGE_KEY = 'parklah:userLocation'

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

const DEFAULT_LOCATION: Center = { lat: 1.3521, lng: 103.8198 }

function computeDistanceMeters(a: Center, b: Center) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

function computeEtaSeconds(distanceM: number) {
  const speedMS = 30 / 3.6
  return Math.round(distanceM / Math.max(speedMS, 1))
}

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

function loadStoredLocation(): Center | null {
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

function storeLocation(location: Center) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
}

export default function SearchView() {
  const [q, setQ] = useState('')
  const [center, setCenter] = useState<Center | null>(null)
  const [carparks, setCarparks] = useState<Carpark[]>([])
  const original = useRef<Carpark[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState<Center | null>(() => loadStoredLocation())
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null)
  const [filters, setFilters] = useState<Filters>({
    carparkType: 'all',
    vehicleType: 'all',
    price: 'any',
    maxDistance: null,
    availability: 'any',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [isShowingAll, setIsShowingAll] = useState(false)

  // auto-focus the input
  useEffect(() => {
    const el = document.getElementById('q') as HTMLInputElement | null
    el?.focus()
    // try to get a quick origin for better distance/ETA in search
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const location = { lat: coords.latitude, lng: coords.longitude }
          setOrigin(location)
          storeLocation(location)
        },
        () => {},
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
      )
    }
  }, [])

  useEffect(() => {
    async function preloadAll() {
      try {
        setLoading(true)
        let location = origin || loadStoredLocation() || DEFAULT_LOCATION
        const res = await api.get('/carparks/all')
        if (!res.data?.ok) throw new Error(res.data?.error || 'Load failed')
        const list: Carpark[] = (res.data.data?.carparks || []).map((cp: Carpark) => {
          const distance = computeDistanceMeters(location, { lat: cp.lat, lng: cp.lng })
          return {
            ...cp,
            distanceM: distance,
            etaS: computeEtaSeconds(distance),
          }
        })
        // Sort by distance (closest first)
        list.sort((a, b) => (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9))
        original.current = list
        setCenter(location)
        setCarparks(applyLocalFilters(list, filters))
        if (!origin) {
          setOrigin(location)
          storeLocation(location)
        }
        setIsShowingAll(true)
      } catch (e: any) {
        console.error('Preload all carparks failed:', e)
        setError(e?.message || 'Failed to load carparks')
      } finally {
        setLoading(false)
      }
    }

    preloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-apply filters when they change (if we have carparks loaded)
  useEffect(() => {
    if (original.current.length > 0) {
      setCarparks(applyLocalFilters(original.current, filters))
    }
  }, [filters])

  async function runSearch(query: string, radiusM = 8000) {
    setLoading(true)
    setError(null)
    setSelectedCarpark(null) // Clear selection on new search
    try {
      const params: any = { q: query, radiusM }
      let activeOrigin = origin
      if (!activeOrigin) {
        const stored = loadStoredLocation()
        if (stored) {
          activeOrigin = stored
          setOrigin(stored)
        }
      }
      if (activeOrigin) {
        params.originLat = activeOrigin.lat
        params.originLng = activeOrigin.lng
      }
      const res = await api.get('/carparks/search', { params })
     
      const rawList = res.data.data.carparks || []
      original.current = rawList
      setCenter(res.data.data.center)
      setCarparks(applyLocalFilters(rawList, filters))
      setIsShowingAll(false)
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
          params: { lat, lng, radiusM: 4000 },
        })

        // 4️⃣ Validate response and update map/list
        if (!res.data?.ok) throw new Error(res.data?.error || 'Near search failed')

        const rawList = res.data.data.carparks || []
        original.current = rawList
        setCenter(res.data.data.center)
        setCarparks(applyLocalFilters(rawList, filters))
        const location = { lat, lng }
        setOrigin(location)
        storeLocation(location)
        setIsShowingAll(false)
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

  function applyFilters(newFilters: Filters) {
    setFilters(newFilters)
    setShowFilters(false)
    setIsShowingAll(false)
    const source = original.current.length ? original.current : carparks
    const filtered = applyLocalFilters(source, newFilters)
    setCarparks(filtered)
  }

  function filtersSummary() {
    if (isShowingAll) return 'Showing all carparks'
    const parts = []
    if (filters.carparkType !== 'all') parts.push(`Type: ${filters.carparkType}`)
    if (filters.vehicleType !== 'all') parts.push(`Vehicle: ${filters.vehicleType}`)
    if (filters.price !== 'any') parts.push(`Price: ${filters.price}`)
    if (filters.maxDistance) parts.push(`≤${Math.round(filters.maxDistance / 100) / 10} km`)
    if (filters.availability !== 'any') parts.push(`Availability: ${filters.availability}`)
    return parts.join(' · ')
  }

  const summaryText = filtersSummary()
  const storedLocation = origin || loadStoredLocation()

  return (
    <>
    <div className="mx-auto w-full space-y-3 sm:space-y-4">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900">Find a Carpark</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        <input
          id="q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="e.g., Choa Chu Kang, Punggol Waterway, NTU"
          aria-label="Search location"
        />
        <div className="flex gap-2 sm:flex-shrink-0">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-600 text-white text-sm sm:text-base font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gray-800 text-white text-sm sm:text-base font-medium hover:bg-gray-900 transition-colors"
          >
            <span className="hidden sm:inline">Locate me</span>
            <span className="sm:hidden">📍</span>
          </button>
          <button
            type="button"
            onClick={async () => {
            setLoading(true)
            setError(null)
            try {
              let location = origin || loadStoredLocation()
              if (!location) {
                location = DEFAULT_LOCATION
              }
              const res = await api.get('/carparks/all')
              if (!res.data?.ok) throw new Error(res.data?.error || 'Load failed')
              const list: Carpark[] = (res.data.data?.carparks || []).map((cp: Carpark) => {
                const distance = computeDistanceMeters(location!, { lat: cp.lat, lng: cp.lng })
                return {
                  ...cp,
                  distanceM: distance,
                  etaS: computeEtaSeconds(distance),
                }
              })
              // Sort by distance (closest first)
              list.sort((a, b) => (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9))
              original.current = list
              setCenter(location)
              setCarparks(applyLocalFilters(list, filters))
              if (!origin) {
                setOrigin(location)
                storeLocation(location)
              }
              setIsShowingAll(true)
            } catch (e: any) {
              setError(e?.message || 'Load failed')
              setCarparks([])
            } finally {
              setLoading(false)
            }
          }}
          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gray-600 text-white text-sm sm:text-base font-medium hover:bg-gray-700 transition-colors"
        >
          <span className="hidden sm:inline">Show all carparks</span>
          <span className="sm:hidden">All</span>
        </button>
        </div>
      </form>

      {error && <div className="text-red-600 text-xs sm:text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm hover:bg-slate-100 transition-colors"
          onClick={() => setShowFilters(true)}
        >
          <span>Filters</span>
          {summaryText && <span className="hidden sm:inline text-slate-500">({carparks.length})</span>}
        </button>
        {summaryText && <p className="text-xs sm:text-sm text-slate-500 truncate">{summaryText}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3 sm:space-y-4 min-w-0 order-2 lg:order-1">
          {/* Map needs a real height or it will be invisible */}
          {center ? (
            <MapView
              lat={center.lat}
              lng={center.lng}
              carparks={carparks}
              selectedCarpark={selectedCarpark}
              userLocation={origin}
              onCarparkSelect={setSelectedCarpark}
            />
          ) : (
            <div className="h-[50vh] sm:h-[60vh] w-full rounded-lg bg-gray-100 grid place-items-center text-gray-600 text-sm sm:text-base">
              No map yet — search or click "Locate me"
            </div>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4 min-w-0 order-1 lg:order-2 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1">
          <WeatherWidget
            className="hidden sm:block"
            userLocation={storedLocation}
          />

          {selectedCarpark ? (
            <div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm space-y-3 max-h-[50vh] sm:max-h-[28rem] overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 break-words flex-1">{selectedCarpark.name}</h2>
                <button
                  onClick={() => setSelectedCarpark(null)}
                  className="text-gray-500 hover:text-gray-700 shrink-0 text-xl leading-none"
                  type="button"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{selectedCarpark.address}</p>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600">
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
              Tap a carpark to view details
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-3 sm:p-4 shadow-sm">
        {carparks.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-600 text-center py-4">No results found</p>
        ) : (
          <ul className="space-y-2">
            {carparks.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedCarpark(c)}
                className={`border rounded-lg p-2.5 sm:p-3 flex flex-col gap-2 cursor-pointer transition-colors sm:flex-row sm:items-start sm:justify-between ${
                  selectedCarpark?.id === c.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-gray-50 border-slate-200'
                }`}
              >
                <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">{c.name}</p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.lat},${c.lng}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline shrink-0 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Navigate →
                    </a>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{c.address}</p>
                  <p className="text-xs text-gray-500">
                    📍 {formatDistance(c.distanceM)} · ⏱️ {formatEta(c.etaS)}
                  </p>
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-700 mb-1">Availability</p>
                    {getAvailabilityLines(c.lotAvailability).length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {getAvailabilityLines(c.lotAvailability).slice(0, 2).map((line) => (
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
                <div className="text-xs text-gray-500 space-y-1 text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3 sm:ml-3">
                  <p className="font-medium text-slate-700 mb-1 sm:mb-0.5">Rates</p>
                  <p className="truncate">Weekday: {c.fee?.weekday || '—'}</p>
                  <p className="truncate">Sat: {c.fee?.saturday || '—'}</p>
                  <p className="truncate">Sun/PH: {c.fee?.sundayPH || '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    <WeatherWidget
      className="sm:hidden mt-4"
      userLocation={storedLocation}
    />

    {showFilters && (
      <FilterModal
        initialFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters)
          setCarparks(applyLocalFilters(original.current, newFilters))
          setShowFilters(false)
        }}
        onClose={() => setShowFilters(false)}
      />
    )}
    </>
  )
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
    <div 
      className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-xl sm:rounded-2xl bg-white shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
              setDraft(initialFilters)
              onApply(initialFilters)
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
