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

export function rankCarparks(items: Carpark[], lotKey: keyof
Carpark['lotAvailability'] = 'C') {
return [...items].sort((a,b) => {
const ar = ratio(a.lotAvailability[lotKey])
const br = ratio(b.lotAvailability[lotKey])
if (br !== ar) return br - ar
const af = feeScore(a.fee)
const bf = feeScore(b.fee)
if (af !== bf) return af - bf
return (a.distanceM ?? 9e9) - (b.distanceM ?? 9e9) || (a.etaS ?? 9e9) -
(b.etaS ?? 9e9) || a.name.localeCompare(b.name)
})
}
const ratio = (l?: Lot) => l ? (l.available / Math.max(1, l.total)) : 0
const feeScore = (f: Carpark['fee']) => {
if (f?.freeParking) return 0
// crude heuristic until you parse strings
const pick = (f?.weekday || f?.saturday || f?.sundayPH || '').match(/\d+(?:\.\d+)?/)
return pick ? parseFloat(pick[0]) : 999
}
