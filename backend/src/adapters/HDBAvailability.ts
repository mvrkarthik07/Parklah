// backend/src/adapters/HDBAvailability.ts
import { env } from '../config/env'

/**
 * Lot = one category of parking (C/H/S/Y)
 */
type Lot = { total: number; available: number }

/**
 * AvailabilityMap = keyed by carpark ID (e.g. 'ACB', 'HLM', etc.)
 */
export type AvailabilityMap = Record<string, { C?: Lot; H?: Lot; S?: Lot; Y?: Lot }>

/**
 * Fetches real-time carpark availability from data.gov.sg
 */
export async function getAvailabilityMap(): Promise<AvailabilityMap> {
  // When running mock mode, just return an empty map (handled elsewhere)
  if (env.USE_MOCK) {
    console.log('[HDB] Using mock availability data')
    return {}
  }

  const headers: Record<string, string> = {}
  if (env.HDB_API_KEY) headers['api-key'] = env.HDB_API_KEY

  try {
    const res = await fetch('https://api.data.gov.sg/v1/transport/carpark-availability', { headers })
    if (!res.ok) {
      console.error('[HDB] Availability fetch failed:', res.status)
      return {}
    }

    const data = (await res.json()) as any

    const map: AvailabilityMap = {}
    for (const item of data.items?.[0]?.carpark_data || []) {
      const id = item.carpark_number as string
      const info = item.carpark_info?.[0]
      if (!id || !info) continue

      // Only Common (C) lots are standardised — others are rare
      map[id] = {
        C: {
          total: parseInt(info.total_lots, 10) || 0,
          available: parseInt(info.lots_available, 10) || 0,
        },
      }
    }

    console.log(`[HDB] Loaded live availability for ${Object.keys(map).length} carparks`)
    return map
  } catch (err) {
    console.error('[HDB] Error fetching availability:', (err as Error).message)
    return {}
  }
}
