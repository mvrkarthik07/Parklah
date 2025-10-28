import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import api from '../lib/api'
export default function Home() {
const nav = useNavigate()
const search = async (q: string) => {
const { data } = await api.get('/carparks/search', { params: { q } }) //backend accepts q or lat/lng
nav('/results', { state: data.data })
}
const useMyLocation = () => {
navigator.geolocation.getCurrentPosition(async (pos) => {
const { latitude, longitude } = pos.coords
const { data } = await api.get('/carparks/search', { params: { lat:
latitude, lng: longitude } })
nav('/results', { state: data.data })
})
}
return (
<div className="space-y-4">
<h1 className="text-2xl font-semibold">Find nearby carparks</h1>
<div className="flex gap-2">
<button className="bg-black text-white px-4 py-2 rounded"
onClick={useMyLocation}> Use My Location</button>
<span className="text-sm text-slate-500 self-center">or</span>
<SearchBar onSearch={search} />
</div>
</div>
)
}
/** View: SearchView
 * Lifelines: SearchView → CarparkController
 * Use Cases: UC 1.1/1.2 (Query System)
 */
