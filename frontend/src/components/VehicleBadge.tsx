export default function VehicleBadge({ type, height }: { type?: string;
height?: number }) {
return <span className="text-xs bg-slate-100 px-2 py-1 rounded">{type ??
'CAR'} • {height ?? 1.6}m</span>
}
