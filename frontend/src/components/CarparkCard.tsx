import type { Carpark } from '../lib/ranking'
export default function CarparkCard({ c, low }: { c: Carpark; low: boolean }) {
return (
<div className="border rounded p-3 flex justify-between items-start">
<div>
<div className="font-medium">{c.name}</div>
<div className="text-sm text-slate-600">{c.address}</div>
<div className="text-xs mt-1">Distance: {Math.round(c.distanceM ?? 0)}
m • ETA: {Math.round((c.etaS ?? 0)/60)} min</div>
<div className="text-xs">Fee: {c.fee.weekday || c.fee.saturday ||
c.fee.sundayPH || 'n/a'}{c.fee.freeParking ? ` • Free: ${c.fee.freeParking}`:
''}</div>
</div>
{low && <span className="text-xs bg-red-100 text-red-700 px-2 py-1
rounded">&lt;10% lots</span>}
</div>
)
}