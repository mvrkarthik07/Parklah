import { env } from '../config/env'

type Forecast = {
  area: string
  updatedAt: string
  validFrom: string
  validTo: string
  condition: string
}

/** internal: fetch JSON with optional NEA/data.gov.sg key */
async function getJSON(url: string): Promise<any> {
  const headers: Record<string, string> = {}
  if (env.NEA_API_KEY) headers['api-key'] = env.NEA_API_KEY
  const r = await fetch(url, { headers })
  if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`)
  return r.json()
}

/** internal: great-circle distance in meters */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** pick nearest 2-hour ‘area’ from NEA’s area_metadata */
function nearestAreaName(
  lat: number,
  lng: number,
  areaMeta: Array<{ name: string; label_location: { latitude: number; longitude: number } }>
): string | undefined {
  let best: { name: string; d: number } | undefined
  for (const a of areaMeta || []) {
    const d = haversineMeters({ lat, lng }, { lat: a.label_location.latitude, lng: a.label_location.longitude })
    if (!best || d < best.d) best = { name: a.name, d }
  }
  return best?.name
}

export async function forecasts(
  lat: number,
  lng: number
): Promise<{ twoHour?: Forecast; twentyFourHour?: Forecast } | undefined> {
  if (env.USE_MOCK) {
    const now = new Date()
    const in2h = new Date(now.getTime() + 2 * 3600 * 1000)
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000)
    return {
      twoHour: {
        area: 'Central',
        updatedAt: now.toISOString(),
        validFrom: now.toISOString(),
        validTo: in2h.toISOString(),
        condition: 'Light showers',
      },
      twentyFourHour: {
        area: 'Central',
        updatedAt: now.toISOString(),
        validFrom: now.toISOString(),
        validTo: in24h.toISOString(),
        condition: 'Partly cloudy',
      },
    }
  }

  try {
    // ---- 2-hour forecast ----
    const twoHr = await getJSON('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast')
    const twoItem = twoHr?.items?.[0]
    const areaName =
      nearestAreaName(lat, lng, twoHr?.area_metadata) ??
      // fallback: if no area match, just pick first forecast’s area
      twoItem?.forecasts?.[0]?.area

    const areaCond =
      twoItem?.forecasts?.find((f: any) => f.area === areaName)?.forecast ??
      twoItem?.forecasts?.[0]?.forecast ??
      'Unknown'

    const twoHour: Forecast | undefined = twoItem
      ? {
          area: areaName || 'Islandwide',
          updatedAt: twoItem.update_timestamp ?? new Date().toISOString(),
          validFrom: twoItem.valid_period?.start ?? twoItem.update_timestamp ?? new Date().toISOString(),
          validTo: twoItem.valid_period?.end ?? new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          condition: areaCond,
        }
      : undefined

    // ---- 24-hour forecast ----
    const day24 = await getJSON('https://api.data.gov.sg/v1/environment/24-hour-weather-forecast')
    const dayItem = day24?.items?.[0]
    const general = dayItem?.general
    const dayCond =
      general?.forecast ||
      // sometimes only regional forecasts are present; pick nearest region if available
      general?.relative_humidity?.low !== undefined
        ? 'Partly cloudy'
        : 'Unknown'

    const twentyFourHour: Forecast | undefined = dayItem
      ? {
          area: 'Islandwide',
          updatedAt: dayItem.update_timestamp ?? new Date().toISOString(),
          validFrom: dayItem.valid_period?.start ?? dayItem.update_timestamp ?? new Date().toISOString(),
          validTo: dayItem.valid_period?.end ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          condition: dayCond,
        }
      : undefined

    if (!twoHour && !twentyFourHour) return undefined
    return { twoHour, twentyFourHour }
  } catch (err) {
    console.error('[NEA] forecast fetch failed:', (err as Error).message)
    return undefined
  }
}
