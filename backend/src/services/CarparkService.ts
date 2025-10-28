import { nearbyCarparks, Carpark } from '../adapters/HDBCarparkAdapter'
import { route } from '../adapters/GeocoderOneMap'
type Lot = { total:number; available:number }
export async function search(center: {lat:number; lng:number}, radiusM: number,
vehicle: { type: string; height: number }) {
const cps = await nearbyCarparks(center, radiusM)
// filter by gantry height & lot type
const key = lotKey(vehicle.type)
const filtered = cps.filter(c => (c.gantryHeightM ?? 9) >= vehicle.height &&
(!!(c.lotAvailability as any)[key]))
// enrich with distance/eta
const enriched: (Carpark & { distanceM:number; etaS:number })[] = []
for (const c of filtered) {
const r = await route(center, { lat: c.lat, lng: c.lng })
enriched.push({ ...c, distanceM: r.distanceMeters, etaS:
r.durationSeconds })
}
27
return rank(enriched, key as any)
}
function lotKey(type: string) { return type.startsWith('CAR') ? 'C' :
type.startsWith('HEAVY') ? 'H' : type.includes('SIDECAR') ? 'S' : 'Y' }
function ratio(l?: Lot) { return l ? (l.available/Math.max(1,l.total)) : 0 }
function feeScore(f: any) { if (f?.freeParking) return 0; const m =
(f?.weekday||'').match(/\d+(?:\.\d+)?/); return m?parseFloat(m[0]):999 }
function rank(items: any[], key: 'C'|'H'|'S'|'Y') {
return items.sort((a,b)=>{
const ar = ratio(a.lotAvailability[key]); const br =
ratio(b.lotAvailability[key])
if (br !== ar) return br - ar
const af = feeScore(a.fee); const bf = feeScore(b.fee)
if (af !== bf) return af - bf
return (a.distanceM - b.distanceM) || (a.etaS - b.etaS) ||
a.name.localeCompare(b.name)
})
}