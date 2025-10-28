import { fmtTimeSGT } from '../lib/formats'
type Forecast = { area: string; updatedAt: string; validFrom: string; validTo:
string; condition: string }
export default function WeatherPanel({ twoHour, twentyFourHour }: { twoHour?:
Forecast; twentyFourHour?: Forecast }) {
return (
<div className="grid md:grid-cols-2 gap-3">
{[twoHour, twentyFourHour].filter(Boolean).map((f, i) => (
<div key={i} className="border rounded p-3">
<div className="font-medium">{i===0 ? '2‑Hour' : '24‑Hour'} •
{f!.area}</div>
<div className="text-xs text-slate-600">Updated
{fmtTimeSGT(f!.updatedAt)}</div>
<div className="text-sm mt-1">{f!.condition}</div>
<div className="text-xs">{fmtTimeSGT(f!.validFrom)} →
{fmtTimeSGT(f!.validTo)}</div>
</div>
))}
</div>
)
}