import { useEffect, useState } from 'react'
import api from '../lib/api'
import WeatherPanel from '../components/Weatherpanel'
type Forecast = { area: string; updatedAt: string; validFrom: string; validTo:
string; condition: string }
export default function Weather() {
const [data, setData] = useState<{ twoHour?: Forecast; twentyFourHour?:
Forecast }>()
useEffect(() => { (async () => {
const { data } = await api.get('/weather/current', { params: { lat: 1.3521,
lng: 103.8198 } })
setData(data.data)
})() }, [])
return <WeatherPanel twoHour={data?.twoHour}
twentyFourHour={data?.twentyFourHour} />
}
/** View: WeatherTab
 * Lifelines: WeatherTab → WeatherController
 * Use Cases: UC 3.x (Weather)
 */
