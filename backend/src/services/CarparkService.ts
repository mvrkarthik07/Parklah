// backend/src/services/CarparkService.ts
import { normalizeLocation } from '../adapters/GeocoderOneMap'
import { routeToCarpark } from '../adapters/RouteOneMap'
import { getAvailabilityMap } from '../adapters/HDBAvailability'
import { env } from '../config/env'



// ⬇️ import types + functions from the adapter we just created
import {
  initCarparkMetaFromCsv,
  nearbyCarparks,
  type Carpark,
  type Lot,
} from '../adapters/HDBCarparkAdapter'

// ------- ranking helpers -------
const ratio = (l?: Lot) => (l ? l.available / Math.max(1, l.total) : 0)
const feeScore = (f: Carpark['fee']) => {
  if (f?.freeParking) return 0
  const m = (f?.weekday || f?.saturday || f?.sundayPH || '').match(/\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : 999
}
export function rankCarparks(items: Carpark[], lotKey: keyof Carpark['lotAvailability'] = 'C') {
  return [...items].sort((a, b) => {
    const ar = ratio(a.lotAvailability[lotKey])
    const br = ratio(b.lotAvailability[lotKey])
    if (br !== ar) return br - ar
    const af = feeScore(a.fee)
    const bf = feeScore(b.fee)
    if (af !== bf) return af - bf
    return (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9) ||
           (a.etaS ?? 9e9) - (b.etaS ?? 9e9) ||
           a.name.localeCompare(b.name)
  })
}
export async function searchCarparksByCoords(center: { lat: number; lng: number }, radiusM = 2000, lotKey: keyof Carpark['lotAvailability'] = 'C') {
  initCarparkMetaFromCsv()
  let candidates: Carpark[] = await nearbyCarparks(center, radiusM)

  if (String(process.env.USE_LIVE_AVAIL) === '1') {
    try {
      const live = await getAvailabilityMap()
      candidates = candidates.map((cp) => ({ ...cp, lotAvailability: live[cp.id] || {} }))
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
  return { center, carparks: ranked, meta: { mode: 'near', radiusM, useLiveAvail: String(process.env.USE_LIVE_AVAIL)==='1', count: ranked.length } }
}
// ------- main use-case -------
export async function searchCarparks(q: string, radiusM = 2000, lotKey: keyof Carpark['lotAvailability'] = 'C') {
  initCarparkMetaFromCsv()
  const center = await normalizeLocation(q)
  let candidates: Carpark[] = await nearbyCarparks({ lat: center.lat, lng: center.lng }, radiusM)

  // ✅ only merge live availability if explicitly enabled
  if (String(process.env.USE_LIVE_AVAIL) === '1') {
    try {
      const live = await getAvailabilityMap()
      candidates = candidates.map((cp) => ({ ...cp, lotAvailability: live[cp.id] || {} }))
    } catch (e) {
      console.warn('[CarparkService] availability merge skipped:', (e as Error).message)
    }
  }

  // optional: compute distance/eta (keep it; helps sort & map)
  for (const cp of candidates) {
    try {
      const r = await routeToCarpark({ lat: center.lat, lng: center.lng }, { lat: cp.lat, lng: cp.lng })
      cp.distanceM = r.distanceMeters
      cp.etaS = r.durationSeconds
    } catch {}
  }

  const ranked = rankCarparks(candidates, lotKey)
  return { center, carparks: ranked, meta: { q, radiusM, useLiveAvail: String(process.env.USE_LIVE_AVAIL)==='1', count: ranked.length } }
}
