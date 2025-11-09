import { env } from '../config/env'
import fetch from 'node-fetch'

export async function geocodeLocation(location: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Singapore')}`
  const resp = await fetch(url, { headers: { 'User-Agent': 'ParkLah/1.0' } })
  if (!resp.ok) throw new Error('Geocoding failed')
  const data = (await resp.json()) as Array<{ lat: string; lon: string }>
  if (!data.length) throw new Error('Location not found')
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  }
}
