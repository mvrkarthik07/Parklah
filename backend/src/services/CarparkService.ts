/**
 * Service: CarparkService
 * Purpose:
 *   Handles search and retrieval of carpark data from CSV (HDB info + rates),
 *   performs optional geocoding for text search, and computes distance/ETA
 *   between user and carparks.
 */

import { routeToCarpark } from '../adapters/RouteOneMap'
import {
  initCarparkMetaFromCsv,
  nearbyCarparks,
  findMetaByText,
  centroidOfMeta,
  type Carpark,
  type Lot,
} from '../adapters/HDBCarparkAdapter'
import { getAvailabilityMap } from '../adapters/HDBAvailability'
import { env } from '../config/env'

function directDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const latToM = 111_000
  const lngToM = (lat: number) => 111_000 * Math.cos((lat * Math.PI) / 180)
  const dx = (to.lng - from.lng) * lngToM(from.lat)
  const dy = (to.lat - from.lat) * latToM
  return Math.hypot(dx, dy)
}

function estimateEtaSeconds(distanceM: number) {
  const speedMS = (env.ROUTE_FALLBACK_SPEED_KMH ?? 30) / 3.6
  return Math.round(distanceM / Math.max(speedMS, 1))
}

// ---------------------------
// Utility helpers
// ---------------------------

/** Compute ratio of available lots */
const ratio = (l?: Lot) => (l ? l.available / Math.max(1, l.total) : 0)

/** Assign numeric fee score so cheaper rates rank higher */
const feeScore = (f: Carpark['fee']) => {
  if (f?.freeParking) return 0
  const pick = (f?.weekday || f?.saturday || f?.sundayPH || '').match(/\d+(?:\.\d+)?/)
  return pick ? parseFloat(pick[0]) : 999
}

/** Ranking by availability ratio, then fee, then distance, then ETA */
export function rankCarparks(items: Carpark[], lotKey: keyof Carpark['lotAvailability'] = 'C') {
  return [...items].sort((a, b) => {
    const ar = ratio(a.lotAvailability?.[lotKey])
    const br = ratio(b.lotAvailability?.[lotKey])
    if (br !== ar) return br - ar
    const af = feeScore(a.fee)
    const bf = feeScore(b.fee)
    if (af !== bf) return af - bf
    return (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9) || (a.etaS ?? 9e9) - (b.etaS ?? 9e9)
  })
}

// ---------------------------
// Main service functions
// ---------------------------

/**
 * Search carparks by text query (e.g., "choa chu kang").
 * 1. Match text against CSV carpark names/addresses to find search center.
 * 2. Find nearby carparks within radius.
 * 3. Rank results by distance & price.
 */
export async function searchCarparks(
  q: string,
  radiusM = 3000,
  lotKey: keyof Carpark['lotAvailability'] = 'C',
  origin?: { lat: number; lng: number }
) {
  initCarparkMetaFromCsv()

  // step 1: derive search center (local-only)
  let center: { lat: number; lng: number }
  const matches = findMetaByText(q)
  const centroid = centroidOfMeta(matches)
  if (centroid) {
    center = centroid
    // If we found specific matches, use a tighter radius for focused results
    if (matches.length > 0 && matches.length < 50) {
      radiusM = Math.min(radiusM, 5000) // Cap at 5km for specific matches
    }
  } else {
    center = { lat: 1.3521, lng: 103.8198 } // fallback: SG center
  }

  // step 2: find nearby carparks
  let candidates: Carpark[] = await nearbyCarparks(center, radiusM)
  
  // If we had text matches, prioritize them in results
  if (matches.length > 0) {
    const matchIds = new Set(matches.map((m) => m.id))
    candidates.sort((a, b) => {
      const aMatch = matchIds.has(a.id) ? 1 : 0
      const bMatch = matchIds.has(b.id) ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      return (a.distanceM ?? 0) - (b.distanceM ?? 0)
    })
  }
  // Cap work: only route the closest N to keep response fast
  const ROUTE_LIMIT = 200
  if (candidates.length > ROUTE_LIMIT) candidates = candidates.slice(0, ROUTE_LIMIT)

  // step 3: (optional) live availability if enabled
  if (String(process.env.USE_LIVE_AVAIL) === '1') {
    try {
      const live = await getAvailabilityMap()
      candidates = candidates.map((cp) => ({
        ...cp,
        lotAvailability: live[cp.id] || cp.lotAvailability || {},
      }))
    } catch (e) {
      console.warn('[CarparkService] availability merge skipped:', (e as Error).message)
    }
  }

  // step 4: compute distance & ETA from user to carpark
  const from = origin ?? center
  for (const cp of candidates) {
    try {
      const r = await routeToCarpark(from, { lat: cp.lat, lng: cp.lng })
      cp.distanceM = r.distanceMeters
      cp.etaS = r.durationSeconds
    } catch {
      const fallback = directDistanceMeters(from, cp)
      cp.distanceM = fallback
      cp.etaS = estimateEtaSeconds(fallback)
    }
  }

  // step 5: rank results
  const ranked = rankCarparks(candidates, lotKey)

  return {
    center,
    carparks: ranked,
    meta: {
      query: q,
      radiusM,
      useLiveAvail: String(process.env.USE_LIVE_AVAIL) === '1',
      count: ranked.length,
    },
  }
}

/**
 * Search carparks near a coordinate (e.g., user GPS location).
 * 1. Use coords directly.
 * 2. Find nearby carparks within radius.
 * 3. Rank results by distance & price.
 */
export async function searchCarparksByCoords(
  center: { lat: number; lng: number },
  radiusM = 3000,
  lotKey: keyof Carpark['lotAvailability'] = 'C'
) {
  initCarparkMetaFromCsv()

  let candidates: Carpark[] = await nearbyCarparks(center, radiusM)

  if (String(process.env.USE_LIVE_AVAIL) === '1') {
    try {
      const live = await getAvailabilityMap()
      candidates = candidates.map((cp) => ({
        ...cp,
        lotAvailability: live[cp.id] || cp.lotAvailability || {},
      }))
    } catch (e) {
      console.warn('[CarparkService] availability merge skipped:', (e as Error).message)
    }
  }

  for (const cp of candidates) {
    try {
      const r = await routeToCarpark(center, { lat: cp.lat, lng: cp.lng })
      cp.distanceM = r.distanceMeters
      cp.etaS = r.durationSeconds
    } catch {
      const fallback = directDistanceMeters(center, cp)
      cp.distanceM = fallback
      cp.etaS = estimateEtaSeconds(fallback)
    }
  }

  const ranked = rankCarparks(candidates, lotKey)

  return {
    center,
    carparks: ranked,
    meta: {
      mode: 'near',
      radiusM,
      useLiveAvail: String(process.env.USE_LIVE_AVAIL) === '1',
      count: ranked.length,
    },
  }
}
