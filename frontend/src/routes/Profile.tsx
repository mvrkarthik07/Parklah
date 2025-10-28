import { useEffect, useState } from 'react'
import api from '../lib/api'
export default function Profile() {
const [type, setType] = useState('CAR')
const [height, setHeight] = useState(1.6)
useEffect(() => { (async () => {
const { data } = await api.get('/user/vehicle')
if (data?.data) { setType(data.data.vehicleType);
setHeight(data.data.vehicleHeight) }
})() }, [])
const save = async () => { await api.put('/user/vehicle', { vehicleType:
type, vehicleHeight: height }) }
return (
<div className="space-y-4 max-w-md">
<h2 className="text-xl font-semibold">Vehicle Profile</h2>
<label className="block">Type
<select className="border rounded px-2 py-1 ml-2" value={type}
onChange={e=>setType(e.target.value)}>
<option>CAR</option>
<option>HEAVY</option>
<option>MOTORCYCLE_WITH_SIDECAR</option>
<option>MOTORCYCLE</option>
</select>
</label>
<label className="block">Height (m)
<input type="number" step="0.01" className="border rounded px-2 py-1
ml-2" value={height} onChange={e=>setHeight(parseFloat(e.target.value))} />
</label>
<button className="bg-black text-white px-4 py-2 rounded" onClick={save}
>Save</button>
</div>
)
}
/** View: Profile
 * Lifelines: Profile → UserController
 * Use Cases: UC 4.1 (Profile/Vehicle settings)
 */
