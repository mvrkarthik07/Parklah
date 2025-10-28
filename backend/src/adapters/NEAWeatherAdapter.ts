import { env } from '../config/env'
type Forecast = { area: string; updatedAt: string; validFrom: string; validTo:
string; condition: string }
export async function forecasts(_lat: number, _lng: number): Promise<{
twoHour?: Forecast; twentyFourHour?: Forecast } | undefined>{
if (env.USE_MOCK) {
const now = new Date()
const in2h = new Date(now.getTime()+2*3600*1000)
const in24h = new Date(now.getTime()+24*3600*1000)
return {
twoHour: { area: 'Central', updatedAt: now.toISOString(), validFrom:
now.toISOString(), validTo: in2h.toISOString(), condition: 'Light showers' },
twentyFourHour: { area: 'Central', updatedAt: now.toISOString(),
validFrom: now.toISOString(), validTo: in24h.toISOString(), condition: 'Partly cloudy' }
}
}
// TODO: call NEA APIs using NEA_API_KEY
throw new Error('NEA API not configured')
}
