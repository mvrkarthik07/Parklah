// backend/src/adapters/HDBCarparkAdapter.ts
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env'

export type Lot = { total: number; available: number }
export type Carpark = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  carparkType?: string
  lotAvailability: { C?: Lot; H?: Lot; S?: Lot; Y?: Lot }
  gantryHeightM?: number
  fee: { weekday?: string; saturday?: string; sundayPH?: string; freeParking?: string | null }
  distanceM?: number
  etaS?: number
}

type MetaRow = Omit<Carpark, 'lotAvailability' | 'distanceM' | 'etaS' | 'fee'> & { fee?: Carpark['fee'] }

let META: MetaRow[] = []
let RATES: Record<string, Carpark['fee']> = {}

/** Resolve CSV paths (supports .env overrides) */
function resolveCsvPaths() {
  const carparksCsv = env.CARPARKS_CSV_PATH
    ? path.resolve(process.cwd(), 'backend', env.CARPARKS_CSV_PATH.replace(/^(\.\/)/, ''))
    : path.resolve(process.cwd(), 'backend', 'data', 'hdb_carparks.csv')

  const ratesCsv = env.CARPARK_RATES_CSV_PATH
    ? path.resolve(process.cwd(), 'backend', env.CARPARK_RATES_CSV_PATH.replace(/^(\.\/)/, ''))
    : path.resolve(process.cwd(), 'backend', 'data', 'carpark_rates.csv')

  return { carparksCsv, ratesCsv }
}

/** Load CSV metadata (id,name,address,lat,lng,carparkType,gantryHeightM) and rates into memory */
export function initCarparkMetaFromCsv(): void {
  const { carparksCsv, ratesCsv } = resolveCsvPaths()

  // Carparks meta
  // --- Load carpark metadata (header-aware) ---
try {
  const raw = fs.readFileSync(carparksCsv, 'utf8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV has no rows')

  const header = lines[0].split(',').map(h => h.trim())
  const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const pickIdx = (...aliases: string[]) => {
    for (const a of aliases) { const i = idx(a); if (i >= 0) return i }
    return -1
  }

  const idI   = pickIdx('id','car_park_no','carpark_number','CarParkID','carpark_id')
  const nameI = pickIdx('name','development','carpark_name')
  const addrI = pickIdx('address','blk_no_and_street_name','location','street_name')
  const latI  = pickIdx('lat','latitude','y','y_coord','Y_COORD','Latitude')
  const lngI  = pickIdx('lng','longitude','x','x_coord','X_COORD','Longitude')
  const typeI = pickIdx('carpark_type','car_park_type','type')
  const ghtI  = pickIdx('gantry_height','gantryheight','GantryHeight')

  const [, ...rows] = lines
  META = rows.map((line) => {
    // naive split; if your CSV has quoted commas, switch to a real CSV lib later
    const cols = line.split(',')
    const id = (cols[idI] ?? '').trim()
    if (!id) return null

    const name = (nameI >= 0 ? cols[nameI] : id)?.trim() || id
    const address = (addrI >= 0 ? cols[addrI] : '')?.trim() || ''

    let lat = parseFloat((latI >= 0 ? cols[latI] : '') || '')
    let lng = parseFloat((lngI >= 0 ? cols[lngI] : '') || '')
    // if both look like degrees >50 (bad), swap (handles X/Y)
    if (lat > 50 && lng > 50) { const t = lat; lat = lng; lng = t }
    if (!Number.isFinite(lat)) lat = 1.3521
    if (!Number.isFinite(lng)) lng = 103.8198

    const carparkType = (typeI >= 0 ? cols[typeI] : 'MULTI-STOREY')?.trim() || 'MULTI-STOREY'
    const gantryHeightM = parseFloat((ghtI >= 0 ? cols[ghtI] : '') || '') || undefined

    return { id, name, address, lat, lng, carparkType, gantryHeightM }
  }).filter(Boolean) as typeof META
} catch (e) {
  console.warn(`[HDB] Failed to read carparks CSV (${carparksCsv}): ${(e as Error).message}`)
  META = []
}


  // Rates
  try {
    const raw = fs.readFileSync(ratesCsv, 'utf8')
    const lines = raw.split(/\r?\n/).filter(Boolean)
    const [, ...rows] = lines
    RATES = {}
    for (const line of rows) {
      const cols = line.split(',')
      const id = (cols[0] || '').trim()
      if (!id) continue
      RATES[id] = {
        weekday: (cols[1] || undefined)?.trim(),
        saturday: (cols[2] || undefined)?.trim(),
        sundayPH: (cols[3] || undefined)?.trim(),
        freeParking: (cols[4] || '').trim() || null,
      }
    }
  } catch (e) {
    console.warn(`[HDB] Rates CSV not found or unreadable. Using empty rates. Path=${resolveCsvPaths().ratesCsv}`)
    RATES = {}
  }

  console.log(`[HDB] Loaded META rows=${META.length}, RATE rows=${Object.keys(RATES).length}`)
}

export function nearestN(center: { lat: number; lng: number }, n = 50): Carpark[] {
  const latToM = 111_000
  const lngToM = (lat: number) => 111_000 * Math.cos((lat * Math.PI) / 180)

  const scored = META.map(m => {
    const dx = (m.lng - center.lng) * lngToM(center.lat)
    const dy = (m.lat - center.lat) * latToM
    const dist = Math.hypot(dx, dy)
    const cp: Carpark = { ...m, lotAvailability: {}, fee: RATES[m.id] || {}, distanceM: dist, etaS: undefined }
    return cp
  })
  scored.sort((a,b) => (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9))
  return scored.slice(0, n)
}

/** Return carparks within radius (meters) of the center using quick planar approximation */
export async function nearbyCarparks(
  center: { lat: number; lng: number },
  radiusM: number
): Promise<Carpark[]> {
  // convert deg deltas to meters (approx)
  const latToM = 111_000
  const lngToM = (lat: number) => 111_000 * Math.cos((lat * Math.PI) / 180)

  const result: Carpark[] = []
  for (const m of META) {
    const dx = (m.lng - center.lng) * lngToM(center.lat)
    const dy = (m.lat - center.lat) * latToM
    const dist = Math.hypot(dx, dy)
    if (dist <= radiusM) {
      result.push({
        ...m,
        lotAvailability: {}, // merged later with live/mock availability
        fee: RATES[m.id] || {},
        distanceM: undefined,
        etaS: undefined,
      })
    }
  }
  return result
}

/** (Optional) expose META for debugging */
export function getAllMeta(): MetaRow[] {
  return META
}
