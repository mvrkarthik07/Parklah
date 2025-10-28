/**
 * Service: CarparkService
 * Purpose:
 *   Handles search and retrieval of carpark data from CSV (HDB info + rates),
 *   performs optional geocoding for text search, and computes distance/ETA
 *   between user and carparks.
 */

import { normalizeLocation } from '../adapters/GeocoderOneMap'
import { routeToCarpark } from '../adapters/RouteOneMap'
import {
  initCarparkMetaFromCsv,
  nearbyCarparks,
  type Carpark,
  type Lot,
} from '../adapters/HDBCarparkAdapter'
import { getAvailabilityMap } from '../adapters/HDBAvailability'
import { env } from '../config/env'

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
 * 1. Geocode to coordinates via OneMap.
 * 2. Find nearby carparks within radius.
 * 3. Rank results by distance & price.
 */
export async function searchCarparks(
  q: string,
  radiusM = 3000,
  lotKey: keyof Carpark['lotAvailability'] = 'C'
) {
  initCarparkMetaFromCsv()

  // step 1: convert text to coordinates
  const center = await normalizeLocation(q)

  // step 2: find nearby carparks
  let candidates: Carpark[] = await nearbyCarparks(center, radiusM)

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
  for (const cp of candidates) {
    try {
      const r = await routeToCarpark(center, { lat: cp.lat, lng: cp.lng })
      cp.distanceM = r.distanceMeters
      cp.etaS = r.durationSeconds
    } catch {}
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
    } catch {}
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
