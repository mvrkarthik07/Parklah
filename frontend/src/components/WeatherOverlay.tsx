import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

type Forecast = {
  area: string
  updatedAt: string
  validFrom: string
  validTo: string
  condition: string
}

type WeatherResponse = {
  data?: {
    twoHour?: Forecast
    twentyFourHour?: Forecast
  }
}

type Props = {
  className?: string
  userLocation?: { lat: number; lng: number } | null
  searchQuery?: string
}

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 }

function formatTimeRange(forecast?: Forecast) {
  if (!forecast) return ''
  const from = new Date(forecast.validFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const to = new Date(forecast.validTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${from} – ${to}`
}

const CONDITION_ICONS: Array<{ keywords: string[]; icon: string; label: string }> = [
  { keywords: ['thunder', 'storm'], icon: '⛈️', label: 'Thunderstorm' },
  { keywords: ['rain', 'shower', 'drizzle'], icon: '🌧️', label: 'Rain' },
  { keywords: ['cloud'], icon: '☁️', label: 'Cloudy' },
  { keywords: ['haze', 'mist', 'fog'], icon: '🌫️', label: 'Hazy' },
  { keywords: ['wind'], icon: '🌬️', label: 'Windy' },
  { keywords: ['sun', 'fair', 'clear'], icon: '☀️', label: 'Clear' },
]

function pickIcon(condition?: string) {
  if (!condition) return { icon: '☀️', label: 'Clear' }
  const lower = condition.toLowerCase()
  for (const entry of CONDITION_ICONS) {
    if (entry.keywords.some((word) => lower.includes(word))) {
      return { icon: entry.icon, label: entry.label }
    }
  }
  return { icon: '☀️', label: 'Clear' }
}

function WeatherTile({
  title,
  forecast,
  highlight,
}: {
  title: string
  forecast?: Forecast
  highlight?: boolean
}) {
  const { icon, label } = useMemo(() => pickIcon(forecast?.condition), [forecast?.condition])
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm transition-transform ${
        highlight ? 'md:col-span-2 lg:col-span-1' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl md:text-5xl" aria-hidden>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
          <p className="text-xs text-slate-500 truncate">{forecast ? label : 'No data yet'}</p>
        </div>
      </div>
      {forecast ? (
        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <p className="truncate">{forecast.condition}</p>
          <p className="text-[11px] text-slate-400">
            {formatTimeRange(forecast)}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Enable location or refine your search.</p>
      )}
    </div>
  )
}

async function fetchForecastByCoords(lat: number, lng: number) {
  const { data } = await api.get<WeatherResponse>('/weather/current', {
    params: { lat, lng },
  })
  return data.data || {}
}

async function fetchForecastByLocation(location: string) {
  const { data } = await api.get<WeatherResponse>('/weather/current', {
    params: { location },
  })
  return data.data || {}
}

export default function WeatherWidget({ className, userLocation, searchQuery }: Props) {
  const [islandwide, setIslandwide] = useState<{ twoHour?: Forecast; twentyFourHour?: Forecast }>({})
  const [local, setLocal] = useState<{ twoHour?: Forecast; twentyFourHour?: Forecast }>({})
  const [loadingIsland, setLoadingIsland] = useState(false)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationLabel, setLocationLabel] = useState<string>('Singapore')

  useEffect(() => {
    setLoadingIsland(true)
    setError(null)
    fetchForecastByCoords(SINGAPORE_CENTER.lat, SINGAPORE_CENTER.lng)
      .then(setIslandwide)
      .catch((e) => {
        console.error('Weather islandwide error:', e)
        setError('Weather data unavailable')
      })
      .finally(() => setLoadingIsland(false))
  }, [])

  useEffect(() => {
    const normalizedQuery = (searchQuery || '').trim()
    if (normalizedQuery) {
      setLoadingLocal(true)
      setLocationLabel(normalizedQuery)
      localStorage.setItem('parklah:lastLocationQuery', normalizedQuery)
      fetchForecastByLocation(normalizedQuery)
        .then(setLocal)
        .catch((e) => {
          console.error('Weather local search error:', e)
          setLocal({})
        })
        .finally(() => setLoadingLocal(false))
      return
    }

    const storedLocationName = localStorage.getItem('parklah:lastLocationQuery')
    if (storedLocationName) {
      setLoadingLocal(true)
      setLocationLabel(storedLocationName)
      fetchForecastByLocation(storedLocationName)
        .then(setLocal)
        .catch((e) => console.error('Weather local error:', e))
        .finally(() => setLoadingLocal(false))
      return
    }

    if (!userLocation) {
      setLocal({})
      setLocationLabel('Tap “Locate me” for local weather')
      return
    }

    setLoadingLocal(true)
    setLocationLabel('Near you')
    fetchForecastByCoords(userLocation.lat, userLocation.lng)
      .then(setLocal)
      .catch((e) => console.error('Weather local error:', e))
      .finally(() => setLoadingLocal(false))
  }, [userLocation?.lat, userLocation?.lng, searchQuery])

  const isLoading = loadingIsland || loadingLocal

  return (
    <section className={className} aria-labelledby="weather-widget-title">
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div>
            <h2 id="weather-widget-title" className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Weather
            </h2>
            <p className="text-[11px] text-slate-500">Islandwide • {locationLabel}</p>
          </div>
          {isLoading && <span className="text-[11px] text-slate-400">Updating…</span>}
        </div>
        {error ? (
          <div className="px-4 pb-4 text-xs text-red-500">{error}</div>
        ) : (
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <WeatherTile
              title="Islandwide"
              forecast={islandwide.twoHour || islandwide.twentyFourHour}
              highlight
            />
            <WeatherTile
              title={locationLabel === 'Near you' ? 'Nearby' : locationLabel}
              forecast={local.twoHour || local.twentyFourHour}
            />
          </div>
        )}
      </div>
    </section>
  )
}
