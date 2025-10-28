import { useState } from 'react'
export default function SearchBar({ onSearch }: { onSearch: (q: string) =>
void }) {
const [q, setQ] = useState('')
return (
<div className="flex gap-2">
<input className="border rounded px-3 py-2 w-full" placeholder="Search 
Address" value={q} onChange={e=>setQ(e.target.value)} />
<button className="bg-slate-900 text-white px-4 rounded" onClick={()=>
onSearch(q)}>Search</button>
</div>
)
}
