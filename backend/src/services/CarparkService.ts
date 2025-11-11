/**
 * Service: CarparkService
 * Purpose:
 *   Handles search and retrieval of carpark data from CSV (HDB info + rates),
 *   performs optional geocoding for text search, and computes distance/ETA
 *   between user and carparks.
 */

import {
  initCarparkMetaFromCsv,
  nearbyCarparks,
  findMetaByText,
  centroidOfMeta,
  type Carpark,
  type Lot,
} from '../adapters/HDBCarparkAdapter.js'
import { getAvailabilityMap } from '../adapters/HDBAvailability.js'
import { geocodeLocation } from '../services/WeatherService.js'
import { env } from '../config/env.js'

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

/** Ranking by distance first (closest first), then availability, then fee, then ETA */
export function rankCarparks(items: Carpark[], lotKey: keyof Carpark['lotAvailability'] = 'C') {
  return [...items].sort((a, b) => {
    // Primary sort: distance (closest first)
    const aDist = a.distanceM ?? 9e9
    const bDist = b.distanceM ?? 9e9
    if (aDist !== bDist) return aDist - bDist
    
    // Secondary sort: availability ratio (higher availability first)
    const ar = ratio(a.lotAvailability?.[lotKey])
    const br = ratio(b.lotAvailability?.[lotKey])
    if (br !== ar) return br - ar
    
    // Tertiary sort: fee score (cheaper first)
    const af = feeScore(a.fee)
    const bf = feeScore(b.fee)
    if (af !== bf) return af - bf
    
    // Final sort: ETA (shorter ETA first)
    return (a.etaS ?? 9e9) - (b.etaS ?? 9e9)
  })
}

// ---------------------------
// Main service functions
// ---------------------------

/**
 * Search carparks by text query (e.g., "choa chu kang", "tampines west", "NTU").
 * Uses OpenStreetMap geocoding for precise location resolution, combined with
 * CSV matching for better relevance.
 * 1. Geocode query to precise coordinates via OpenStreetMap.
 * 2. Also match against CSV carpark names/addresses for relevance.
 * 3. Find nearby carparks within radius from geocoded center.
 * 4. Rank results by distance & price.
 */
export async function searchCarparks(
  q: string,
  radiusM = 3000,
  lotKey: keyof Carpark['lotAvailability'] = 'C',
  origin?: { lat: number; lng: number }
) {
  initCarparkMetaFromCsv()

  // step 1: derive precise search center using geocoding + CSV matching
  let center: { lat: number; lng: number }
  let useGeocodedCenter = false
  
  // Try OpenStreetMap geocoding first for precise location
  try {
    const geocoded = await geocodeLocation(q)
    center = geocoded
    useGeocodedCenter = true
    // For geocoded locations, use a tighter radius for focused results
    radiusM = Math.min(radiusM, 5000)
    console.log(`[CarparkService] Geocoded "${q}" to ${center.lat}, ${center.lng}`)
  } catch (e) {
    // Fallback to CSV matching if geocoding fails
    console.log(`[CarparkService] Geocoding failed for "${q}", using CSV matching`)
    const matches = findMetaByText(q)
    const centroid = centroidOfMeta(matches)
    if (centroid) {
      center = centroid
      // If we found specific matches, use a tighter radius
      if (matches.length > 0 && matches.length < 50) {
        radiusM = Math.min(radiusM, 5000)
      }
    } else {
      center = { lat: 1.3521, lng: 103.8198 } // fallback: SG center
    }
  }
  
  // Also get CSV matches for relevance boosting
  const csvMatches = findMetaByText(q)

  // step 2: find nearby carparks from the precise center
  let candidates: Carpark[] = await nearbyCarparks(center, radiusM)
  
  // Boost relevance: prioritize CSV matches if they exist
  if (csvMatches.length > 0) {
    const matchIds = new Set(csvMatches.map((m) => m.id))
    // Calculate distance from geocoded center for all candidates first
    for (const cp of candidates) {
      if (!cp.distanceM) {
        cp.distanceM = directDistanceMeters(center, { lat: cp.lat, lng: cp.lng })
      }
    }
    // Sort: CSV matches first, then by distance
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

  // step 4: compute distance & ETA from user to carpark (optimized: direct calculation)
  const from = origin ?? center
  for (const cp of candidates) {
    // Use direct haversine calculation (routeToCarpark is just haversine with road factor anyway)
    const beeline = directDistanceMeters(from, cp)
    const roadFactor = env.ROUTE_FALLBACK_ROAD_FACTOR ?? 1.3
    cp.distanceM = Math.round(beeline * roadFactor)
    cp.etaS = estimateEtaSeconds(cp.distanceM)
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

  // Optimized: use direct haversine calculation instead of async routeToCarpark
  for (const cp of candidates) {
    const beeline = directDistanceMeters(center, cp)
    const roadFactor = env.ROUTE_FALLBACK_ROAD_FACTOR ?? 1.3
    cp.distanceM = Math.round(beeline * roadFactor)
    cp.etaS = estimateEtaSeconds(cp.distanceM)
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
