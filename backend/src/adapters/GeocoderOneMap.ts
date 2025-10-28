// backend/src/adapters/onemap.ts
import { env } from '../config/env'
import { jfetch } from '../utils/fetcher'

type Geo = { lat: number; lng: number; address: string }
type Route = { distanceMeters: number; durationSeconds: number }

let token: { value: string; exp: number } | null = null

/**
 * Automatically handles OneMap token login + caching.
 */
async function ensureToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.value
  console.log('[OneMap] Requesting new access token...')
  const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.ONEMAP_EMAIL,
      password: env.ONEMAP_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`OneMap auth failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expiry_timestamp: string }
  token = {
    value: data.access_token,
    exp: Date.parse(data.expiry_timestamp),
  }
  console.log('[OneMap] Token acquired, expires at', new Date(token.exp).toLocaleString('en-SG'))
  return token.value
}

/**
 * Geocode an address / location string into lat/lng.
 */
export async function geocode(q: string): Promise<Geo> {
  if (env.USE_MOCK) return { lat: 1.300, lng: 103.800, address: q }

  const t = await ensureToken()
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    q
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`

  const data = await jfetch(url, {
    headers: { Authorization: t },
  })

  const first = data.results?.[0]
  if (!first) throw new Error('No OneMap geocode results')

  return {
    lat: parseFloat(first.LATITUDE),
    lng: parseFloat(first.LONGITUDE),
    address: first.ADDRESS,
  }
}

/**
 * Route between two coordinates using OneMap Routing Service.
 */
export async function route(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<Route> {
  if (env.USE_MOCK) return { distanceMeters: Math.random() * 3000, durationSeconds: 300 + Math.random() * 600 }

  const t = await ensureToken()
  const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${from.lat},${from.lng}&end=${to.lat},${to.lng}&routeType=drive`
  const data = await jfetch(url, {
    headers: { Authorization: t },
  })

  const summary = data?.route_summary
  if (!summary) throw new Error('No OneMap routing data')

  return {
    distanceMeters: summary.total_distance,
    durationSeconds: summary.total_time,
  }
}
