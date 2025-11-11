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
      className={`rounded-xl sm:rounded-2xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm transition-transform ${
        highlight ? 'md:col-span-2 lg:col-span-1' : ''
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-3xl sm:text-4xl md:text-5xl shrink-0" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{title}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">{forecast ? label : 'No data yet'}</p>
        </div>
      </div>
      {forecast ? (
        <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1 text-xs text-slate-600">
          <p className="truncate">{forecast.condition}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            {formatTimeRange(forecast)}
          </p>
        </div>
      ) : (
        <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500">Enable location or refine your search.</p>
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

export default function WeatherWidget({ className, userLocation }: Props) {
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
    // Only use user's actual geolocation, not search queries
    if (!userLocation) {
      setLocal({})
      setLocationLabel('Tap "Locate me" for local weather')
      return
    }

    setLoadingLocal(true)
    setLocationLabel('Near you')
    fetchForecastByCoords(userLocation.lat, userLocation.lng)
      .then(setLocal)
      .catch((e) => {
        console.error('Weather local error:', e)
        setLocal({})
      })
      .finally(() => setLoadingLocal(false))
  }, [userLocation?.lat, userLocation?.lng])

  const isLoading = loadingIsland || loadingLocal

  return (
    <section className={className} aria-labelledby="weather-widget-title">
      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="min-w-0">
            <h2 id="weather-widget-title" className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Weather
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Islandwide • {locationLabel}</p>
          </div>
          {isLoading && <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0">Updating…</span>}
        </div>
        {error ? (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 text-xs text-red-500">{error}</div>
        ) : (
          <div className="grid gap-2 sm:gap-3 px-3 sm:px-4 pb-3 sm:pb-4 sm:grid-cols-2">
            <WeatherTile
              title="Islandwide"
              forecast={islandwide.twoHour || islandwide.twentyFourHour}
              highlight
            />
            <WeatherTile
              title="Nearby"
              forecast={local.twoHour || local.twentyFourHour}
            />
          </div>
        )}
      </div>
    </section>
  )
}
