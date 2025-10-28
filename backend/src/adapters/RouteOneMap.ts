import { env } from '../config/env'

type RouteSummary = { total_distance: number; total_time: number }
type OneMapRouteResp = { route_summary?: RouteSummary }

function haversineMeters(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s1 =
    Math.sin(dLat/2)**2 +
    Math.cos((a.lat*Math.PI)/180) * Math.cos((b.lat*Math.PI)/180) *
    Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(s1))
}

async function getOneMapToken(): Promise<string> {
  const r = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.ONEMAP_EMAIL, password: env.ONEMAP_PASSWORD }),
  })
  if (!r.ok) throw new Error(`OneMap auth failed: ${r.status}`)
  const j = (await r.json()) as { access_token: string }
  return j.access_token
}

export async function routeToCarpark(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ distanceMeters: number; durationSeconds: number }> {
  if (env.USE_MOCK) {
    const beeline = haversineMeters(from, to)
    const road = beeline * 1.3
    const eta = Math.round(road / (30/3.6))
    return { distanceMeters: Math.round(road), durationSeconds: eta }
  }

  try {
    const token = await getOneMapToken()
    const url =
      `https://www.onemap.gov.sg/api/public/routingsvc/route?` +
      `start=${from.lat},${from.lng}&end=${to.lat},${to.lng}&routeType=drive`

    const res = await fetch(url, { headers: { Authorization: token } })
    if (!res.ok) throw new Error(`Routing failed: ${res.status}`)

    const data = (await res.json()) as OneMapRouteResp
    const s = data.route_summary
    if (!s) throw new Error('Missing route_summary')

    return { distanceMeters: s.total_distance, durationSeconds: s.total_time }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[RouteOneMap] fallback to haversine:', msg)
    const beeline = haversineMeters(from, to)
    const road = beeline * 1.3
    const eta = Math.round(road / (30/3.6))
    return { distanceMeters: Math.round(road), durationSeconds: eta }
  }
}
