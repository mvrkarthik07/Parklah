import { env } from '../config/env'
import fetch from 'node-fetch'

export async function geocodeLocation(location: string) {
  // Normalize query: ensure Singapore context is added
  const normalizedQuery = location.trim()
  const queryWithContext = normalizedQuery.includes('Singapore') 
    ? normalizedQuery 
    : `${normalizedQuery}, Singapore`
  
  // Use detailed search with address details for better precision
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithContext)}&addressdetails=1&limit=5&countrycodes=SG`
  const resp = await fetch(url, { 
    headers: { 
      'User-Agent': 'ParkLah/1.0',
      'Accept-Language': 'en'
    } 
  })
  if (!resp.ok) throw new Error('Geocoding failed')
  const data = (await resp.json()) as Array<{ 
    lat: string
    lon: string
    display_name: string
    importance?: number
    type?: string
  }>
  if (!data.length) throw new Error('Location not found')
  
  // Prefer results with higher importance or more specific types
  const sorted = data.sort((a, b) => {
    const aImportance = a.importance || 0
    const bImportance = b.importance || 0
    // Prefer more specific location types (building, place, etc. over administrative)
    const aIsSpecific = a.type && !['administrative', 'boundary'].includes(a.type)
    const bIsSpecific = b.type && !['administrative', 'boundary'].includes(b.type)
    if (aIsSpecific && !bIsSpecific) return -1
    if (!aIsSpecific && bIsSpecific) return 1
    return bImportance - aImportance
  })
  
  const bestMatch = sorted[0]
  return {
    lat: parseFloat(bestMatch.lat),
    lng: parseFloat(bestMatch.lon),
  }
}
