// backend/src/adapters/hdb.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { env } from '../config/env'

// reconstruct __dirname for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type Lot = { total: number; available: number }

export type Carpark = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  lotAvailability: { C?: Lot; H?: Lot; S?: Lot; Y?: Lot }
  gantryHeightM?: number
  carparkType?: string
  fee: {
    weekday?: string
    saturday?: string
    sundayPH?: string
    freeParking?: string | null
  }
  distanceM?: number
  etaS?: number
}

type Meta = Omit<Carpark, 'lotAvailability' | 'fee' | 'distanceM' | 'etaS'>
type Row = Record<string, unknown>

let META: Meta[] = []
let RATES: Record<string, Carpark['fee']> = Object.create(null)

// --- correct backend/data path ---
const DATA_DIR = path.resolve(__dirname, '../../data')

// ---------- helpers ----------
function toNum(v: unknown): number | undefined {
  if (v == null) return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function normalizeRowKeys<T extends Row>(r: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))
}

function pick(r: Row, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k]
    if (v != null && v !== '') return String(v)
  }
  return undefined
}

export function initCarparkMetaFromCsv(
  carparksCsvPath = process.env.CARPARKS_CSV_PATH || path.join(DATA_DIR, 'HDBCarparkInformation.csv'),
  ratesCsvPath = process.env.CARPARK_RATES_CSV_PATH || path.join(DATA_DIR, 'CarparkRates.csv')
) {
  console.log('[HDB] Using CSV paths:', { carparksCsvPath, ratesCsvPath })

  if (fs.existsSync(carparksCsvPath)) {
    const rows = parse(fs.readFileSync(carparksCsvPath), { columns: true, skip_empty_lines: true }) as Row[]
    META = rows.map((raw): Meta | null => {
      const r = normalizeRowKeys(raw)
      const id = (pick(r, ['car_park_no', 'carpark_number']) || '').trim()
      const lat = toNum(r['latitude'] ?? r['y_coord'] ?? r['lat'])
      const lng = toNum(r['longitude'] ?? r['x_coord'] ?? r['lng'])
      if (!id || lat == null || lng == null) return null
      const ghNum = toNum(r['gantry_height'])
      return {
        id,
        name: (pick(r, ['development', 'name']) || '').trim(),
        address: (pick(r, ['address']) || '').trim(),
        lat,
        lng,
        gantryHeightM: ghNum,
        carparkType: (pick(r, ['car_park_type', 'type']) || '').trim().toUpperCase(),
      }
    }).filter((x): x is Meta => !!x)
  } else {
    console.warn(`[HDB] Carparks CSV not found at ${carparksCsvPath}. META will be empty.`)
  }

  if (fs.existsSync(ratesCsvPath)) {
    const rows = parse(fs.readFileSync(ratesCsvPath), { columns: true, skip_empty_lines: true }) as Row[]
    for (const raw of rows) {
      const r = normalizeRowKeys(raw)
      const id = (pick(r, ['car_park_no', 'carpark_number']) || '').trim()
      if (!id) continue
      RATES[id] = {
        weekday: pick(r, ['weekday_rate', 'weekday']),
        saturday: pick(r, ['saturday_rate', 'saturday']),
        sundayPH: pick(r, ['sunday_ph_rate', 'sunday_ph']),
        freeParking: pick(r, ['free_parking']) ?? null,
      }
    }
  } else {
    console.info(`[HDB] Rates CSV not found at ${ratesCsvPath}. Fees will be empty.`)
  }

  console.log(`[HDB] Loaded ${META.length} carparks, ${Object.keys(RATES).length} rate rows`)
}

function withRates(m: Meta): Carpark {
  const fee = RATES[m.id] || {}
  return {
    ...m,
    lotAvailability: {},
    fee: {
      weekday: fee.weekday,
      saturday: fee.saturday,
      sundayPH: fee.sundayPH,
      freeParking: fee.freeParking ?? null,
    },
  }
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const aa = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2
  return 2 * R * Math.asin(Math.sqrt(aa))
}

function inRadius(center: { lat: number; lng: number }, radiusM: number) {
  return (m: Meta) => haversineMeters(center, { lat: m.lat, lng: m.lng }) <= radiusM
}

async function getAvailabilityMap(): Promise<Record<string, { C?: Lot; H?: Lot; S?: Lot; Y?: Lot }>> {
  // TODO: replace this with real HDB availability API fetch
  return {}
}

export async function nearbyCarparks(center: { lat: number; lng: number }, radiusM: number): Promise<Carpark[]> {
  if (env.USE_MOCK) {
    const TYPES = ['MULTI-STOREY', 'SURFACE', 'BASEMENT']
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `CP${i + 1}`,
      name: `Carpark ${i + 1}`,
      address: `Blk ${10 + i} Example St`,
      lat: center.lat + (Math.random() - 0.5) * 0.01,
      lng: center.lng + (Math.random() - 0.5) * 0.01,
      lotAvailability: { C: { total: 100, available: Math.floor(Math.random() * 100) } },
      gantryHeightM: 2.0,
      carparkType: TYPES[i % TYPES.length],
      fee: { weekday: '$1.20/hr', saturday: '$1.20/hr', sundayPH: '$0.60/hr', freeParking: i % 2 ? 'Sun 7am–10:30pm' : null },
    }))
  }

  if (META.length === 0) initCarparkMetaFromCsv()
  const nearby = META.filter(inRadius(center, radiusM)).map(withRates)
  const availMap = await getAvailabilityMap()
  for (const c of nearby) {
    const lots = availMap[c.id]
    if (lots) c.lotAvailability = lots
  }
  return nearby
}
