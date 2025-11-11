import { env } from '../config/env.js'

/**
 * Routing adapter - uses haversine distance with road factor for ETA estimation.
 * No external API dependencies.
 */

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s1))
}

export async function routeToCarpark(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ distanceMeters: number; durationSeconds: number }> {
  // Use lightweight local haversine calculation with road factor for realistic routing
  const beeline = haversineMeters(from, to)
  const road = beeline * env.ROUTE_FALLBACK_ROAD_FACTOR
  const eta = Math.round(road / (env.ROUTE_FALLBACK_SPEED_KMH / 3.6))
  return { distanceMeters: Math.round(road), durationSeconds: eta }
}
