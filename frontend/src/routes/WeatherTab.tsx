import { useEffect, useState } from 'react'
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

export default function Weather() {
  const [data, setData] = useState<{ twoHour?: Forecast; twentyFourHour?: Forecast }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get<WeatherResponse>('/weather/current', {
          params: { lat: 1.3521, lng: 103.8198 },
        })
        setData(data.data || {})
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || 'Unable to load weather')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-600">
        Fetching the latest forecast...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Weather outlook</h1>
        <p className="text-sm text-slate-600">
          Stay prepared before you head out. We pull the latest two-hour and full-day forecasts from NEA.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <WeatherCard
          title="Next 2 hours"
          forecast={data.twoHour}
          emptyMessage="Short-term forecast not available right now."
        />
        <WeatherCard
          title="Next 24 hours"
          forecast={data.twentyFourHour}
          emptyMessage="Daily forecast not available right now."
        />
      </div>
    </div>
  )
}

function WeatherCard({
  title,
  forecast,
  emptyMessage,
}: {
  title: string
  forecast?: Forecast
  emptyMessage: string
}) {
  if (!forecast) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 text-sm text-slate-500">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{title}</h2>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">Updated {new Date(forecast.updatedAt).toLocaleString()}</p>
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Location:</span> {forecast.area}
        </p>
        <p>
          <span className="font-medium text-slate-800">Valid:</span>{' '}
          {new Date(forecast.validFrom).toLocaleTimeString()} -{' '}
          {new Date(forecast.validTo).toLocaleTimeString()}
        </p>
        <p>
          <span className="font-medium text-slate-800">Conditions:</span> {forecast.condition}
        </p>
      </div>
    </div>
  )
}

/** View: WeatherTab
 * Lifelines: WeatherTab → WeatherController
 * Use Cases: UC 3.x (Weather)
 */
