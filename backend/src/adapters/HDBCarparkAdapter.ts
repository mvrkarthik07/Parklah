// backend/src/adapters/HDBCarparkAdapter.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import proj4 from 'proj4'
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
let RATES_BY_REGION: Record<string, Record<string, Carpark['fee']>> = {}

// Default region-based rates (fallback when specific rates not found)
const DEFAULT_REGION_RATES: Record<string, Carpark['fee']> = {
  Central: {
    weekday: '$1.20 for 1st hr; $0.60 for sub. ½ hr',
    saturday: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    sundayPH: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    freeParking: null,
  },
  North: {
    weekday: '$1.20 for 1st hr; $0.60 for sub. ½ hr',
    saturday: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    sundayPH: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    freeParking: null,
  },
  East: {
    weekday: '$1.20 for 1st hr; $0.70 for sub. ½ hr',
    saturday: '$1.20 for 1st hr; $0.70 for sub. ½ hr',
    sundayPH: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    freeParking: null,
  },
  West: {
    weekday: '$1.20 for 1st hr; $0.60 for sub. ½ hr',
    saturday: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    sundayPH: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    freeParking: null,
  },
  South: {
    weekday: '$1.20 for 1st hr; $0.60 for sub. ½ hr',
    saturday: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    sundayPH: '$1.30 for 1st hr; $0.65 for sub. ½ hr',
    freeParking: null,
  },
}

Object.values(DEFAULT_REGION_RATES).forEach((rate) => {
  if (rate.saturday) {
    rate.sundayPH = rate.saturday
  }
})

// Singapore center point (Marina Bay area)
const SG_CENTER = { lat: 1.3521, lng: 103.8198 }
const CENTRAL_RADIUS_KM = 5 // Central region radius in km

/** Determine region based on coordinates (4 quadrants + central) */
export function getRegion(lat: number, lng: number): 'Central' | 'North' | 'South' | 'East' | 'West' {
  // Check if within central radius
  const latToM = 111_000
  const lngToM = 111_000 * Math.cos((SG_CENTER.lat * Math.PI) / 180)
  const dx = (lng - SG_CENTER.lng) * lngToM
  const dy = (lat - SG_CENTER.lat) * latToM
  const dist = Math.hypot(dx, dy) / 1000 // km
  
  if (dist <= CENTRAL_RADIUS_KM) return 'Central'
  
  // Determine quadrant: 4 regions
  if (lat > SG_CENTER.lat && lng > SG_CENTER.lng) return 'North'
  if (lat > SG_CENTER.lat && lng <= SG_CENTER.lng) return 'West'
  if (lat <= SG_CENTER.lat && lng > SG_CENTER.lng) return 'East'
  return 'South'
}

/** Resolve CSV paths (supports .env overrides) */
function resolveCsvPaths() {
  // Resolve relative to the backend source root to avoid CWD issues (ESM-safe)
  const thisFile = fileURLToPath(import.meta.url)
  const thisDir = path.dirname(thisFile)
  const backendRoot = path.resolve(thisDir, '..', '..')
  const dataDir = path.join(backendRoot, 'data')

  const resolveFromRoot = (p: string) =>
    path.isAbsolute(p) ? p : path.resolve(backendRoot, p.replace(/^(\.\/)/, ''))

  const carparksCsv = env.CARPARKS_CSV_PATH
    ? resolveFromRoot(env.CARPARKS_CSV_PATH)
    : path.join(dataDir, 'hdb_carparks.csv')

  const ratesCsv = env.CARPARK_RATES_CSV_PATH
    ? resolveFromRoot(env.CARPARK_RATES_CSV_PATH)
    : path.join(dataDir, 'carpark_rates.csv')

  return { carparksCsv, ratesCsv }
}

function formatFeeStrings(rawFee: Carpark['fee'] | undefined): Carpark['fee'] {
  const result: Carpark['fee'] = {} as any

  ;(['weekday', 'saturday', 'sundayPH'] as const).forEach((key) => {
    const value = rawFee?.[key]
    if (!value) return
    let text = String(value).trim()
    if (!text || text === '-') {
      text = 'Not specified'
    }
    result[key] = text
  })

  const free = rawFee?.freeParking
  result.freeParking = free ? String(free).trim() : null

  return result
}

function randomAvailability(): Carpark['lotAvailability'] {
  const randomLots = () => {
    const total = 20 + Math.floor(Math.random() * 180)
    const available = Math.floor(total * (0.2 + Math.random() * 0.7))
    return { total, available }
  }
  return {
    C: randomLots(),
    H: Math.random() > 0.7 ? randomLots() : undefined,
    S: Math.random() > 0.5 ? randomLots() : undefined,
    Y: Math.random() > 0.4 ? randomLots() : undefined,
  }
}

// Convert Singapore SVY21 (EPSG:3414) to WGS84 lat/lng
function svy21ToWgs84(x: number, y: number): { lat: number; lng: number } {
  // Parameters from Singapore Land Authority
  const a = 6378137
  const f = 1 / 298.257223563
  const oLat = 1.366666
  const oLon = 103.833333
  const No = 38744.572
  const Eo = 28001.642
  const k = 1

  const b = a * (1 - f)
  const e2 = (2 * f) - (f * f)
  const n = (a - b) / (a + b)

  const x1 = y - No
  const y1 = x - Eo

  const oLatR = (oLat * Math.PI) / 180
  const oLonR = (oLon * Math.PI) / 180

  const G = a * (1 - e2) * (1 + (5 / 4) * e2 + (5 / 4) * e2 * e2 + (35 / 24) * e2 * e2 * e2)
  const sigma = x1 / (a * k)

  // Series expansion to get footpoint latitude
  const A0 = 1 - (e2 / 4) - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256
  const A2 = (3 / 8) * (e2 + (e2 * e2) / 4 + (15 * e2 * e2 * e2) / 128)
  const A4 = (15 / 256) * (e2 * e2 + (3 * e2 * e2 * e2) / 4)
  const A6 = (35 * e2 * e2 * e2) / 3072

  let phi = sigma / A0 +
    ((A2 / A0) * Math.sin(2 * sigma / A0)) +
    ((A4 / A0) * Math.sin(4 * sigma / A0)) +
    ((A6 / A0) * Math.sin(6 * sigma / A0))

  const sinPhi = Math.sin(phi)
  const cosPhi = Math.cos(phi)
  const tanPhi = Math.tan(phi)

  const v = a / Math.sqrt(1 - e2 * sinPhi * sinPhi)
  const rho = a * (1 - e2) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5)
  const eta2 = v / rho - 1

  const secPhi = 1 / cosPhi
  const VII = tanPhi / (2 * rho * v)
  const VIII = (tanPhi / (24 * rho * Math.pow(v, 3))) * (5 + 3 * tanPhi * tanPhi + eta2 - 9 * tanPhi * tanPhi * eta2)
  const IX = (tanPhi / (720 * rho * Math.pow(v, 5))) * (61 + 90 * tanPhi * tanPhi + 45 * Math.pow(tanPhi, 4))
  const X = secPhi / v
  const XI = (secPhi / (6 * Math.pow(v, 3))) * (v / rho + 2 * tanPhi * tanPhi)
  const XII = (secPhi / (120 * Math.pow(v, 5))) * (5 + 28 * tanPhi * tanPhi + 24 * Math.pow(tanPhi, 4))
  const XIIA = (secPhi / (5040 * Math.pow(v, 7))) * (61 + 662 * tanPhi * tanPhi + 1320 * Math.pow(tanPhi, 4) + 720 * Math.pow(tanPhi, 6))

  const dE = y1
  const dE2 = dE * dE
  const dE3 = dE2 * dE
  const dE4 = dE2 * dE2
  const dE5 = dE3 * dE2
  const dE6 = dE4 * dE2
  const dE7 = dE5 * dE2

  const lat = phi - VII * dE2 + VIII * dE4 - IX * dE6
  const lon = oLonR + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7

  return { lat: (lat * 180) / Math.PI, lng: (lon * 180) / Math.PI }
}

/** Load CSV metadata (id,name,address,lat,lng,carparkType,gantryHeightM) and rates into memory */
export function initCarparkMetaFromCsv(): void {
  const { carparksCsv, ratesCsv } = resolveCsvPaths()

  // Carparks meta
  // --- Load carpark metadata (header-aware) ---
try {
  // header-aware META loader
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
const latI  = pickIdx('lat','latitude','Latitude')
const lngI  = pickIdx('lng','longitude','Longitude')
const xI    = pickIdx('x','x_coord','X_COORD')
const yI    = pickIdx('y','y_coord','Y_COORD')
const typeI = pickIdx('carpark_type','car_park_type','type')
const ghtI  = pickIdx('gantry_height','gantryheight','GantryHeight')

const [, ...rows] = lines
META = rows.map((line) => {
  const cols = line.split(',')
  const id = (cols[idI] ?? '').trim()
  if (!id) return null
  const name = (nameI >= 0 ? cols[nameI] : id)?.trim() || id
  const address = (addrI >= 0 ? cols[addrI] : '')?.trim() || ''

  let lat = parseFloat((latI >= 0 ? cols[latI] : '') || '')
  let lng = parseFloat((lngI >= 0 ? cols[lngI] : '') || '')

  // If SVY21 X/Y present (values in tens of thousands), convert to WGS84
  const xVal = parseFloat((xI >= 0 ? cols[xI] : '') || '')
  const yVal = parseFloat((yI >= 0 ? cols[yI] : '') || '')
  const hasSVY = Number.isFinite(xVal) && Number.isFinite(yVal) && xVal > 1000 && yVal > 1000
  if (hasSVY) {
    // Define EPSG:3414 (SVY21) once (use defs getter to check)
    if (!proj4.defs('EPSG:3414')) {
      proj4.defs(
        'EPSG:3414',
        '+proj=tmerc +lat_0=1.366666 +lon_0=103.833333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs'
      )
    }
    const [lngWgs, latWgs] = proj4('EPSG:3414', 'WGS84', [xVal, yVal])
    if (Number.isFinite(latWgs) && Number.isFinite(lngWgs)) {
      lat = latWgs
      lng = lngWgs
    }
  }
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
    const region = getRegion(m.lat, m.lng)
    const specificRate = RATES[m.id]
    const fee = specificRate || DEFAULT_REGION_RATES[region] || DEFAULT_REGION_RATES['Central']
    const formatted = formatFeeStrings(fee)
    const cp: Carpark = {
      ...m,
      lotAvailability: randomAvailability(),
      fee: formatted,
      distanceM: dist,
      etaS: undefined,
    }
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
      // Get region-based rate if specific rate not available
      const region = getRegion(m.lat, m.lng)
      const specificRate = RATES[m.id]
      // Always provide a rate - use specific, then region default
      const fee = specificRate || DEFAULT_REGION_RATES[region] || DEFAULT_REGION_RATES['Central']
      const formatted = formatFeeStrings(fee)
      result.push({
        ...m,
        lotAvailability: randomAvailability(),
        fee: formatted,
        distanceM: dist,
        etaS: undefined,
      })
    }
  }
  // Sort by approximate distance so callers can cheaply limit
  result.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
  return result
}

/** (Optional) expose META for debugging */
export function getAllMeta(): MetaRow[] {
  return META
}

/** Expose all carparks as full objects for direct map display */
export function getAllAsCarparks(): Carpark[] {
  return META.map((m) => {
    const region = getRegion(m.lat, m.lng)
    const specificRate = RATES[m.id]
    const fee = specificRate || DEFAULT_REGION_RATES[region] || DEFAULT_REGION_RATES['Central']
    return {
      ...m,
      lotAvailability: randomAvailability(),
      fee: formatFeeStrings(fee),
      distanceM: undefined,
      etaS: undefined,
    }
  })
}

/** Smart text search over name/address with scoring */
export function findMetaByText(q: string): MetaRow[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const tokens = s.split(/\s+/).filter(Boolean)
  const scored = META.map((m) => {
    const name = (m.name || '').toLowerCase()
    const addr = (m.address || '').toLowerCase()
    let score = 0
    // Exact phrase match gets highest score
    if (name.includes(s) || addr.includes(s)) score += 100
    // Each token match adds points
    for (const token of tokens) {
      if (name.includes(token)) score += 10
      if (addr.includes(token)) score += 5
    }
    // Prefer matches in name over address
    if (name.includes(s)) score += 20
    return { meta: m, score }
  })
  const filtered = scored.filter((x) => x.score > 0)
  filtered.sort((a, b) => b.score - a.score)
  return filtered.map((x) => x.meta)
}

/** Compute centroid lat/lng of given meta rows */
export function centroidOfMeta(rows: MetaRow[]): { lat: number; lng: number } | null {
  if (!rows.length) return null
  let latSum = 0
  let lngSum = 0
  for (const r of rows) { latSum += r.lat; lngSum += r.lng }
  return { lat: latSum / rows.length, lng: lngSum / rows.length }
}
