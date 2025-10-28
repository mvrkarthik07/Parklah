import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Carpark } from '../lib/ranking'

type Props = { lat: number; lng: number; carparks: Carpark[] }

export default function MapView({ lat, lng, carparks }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // init once
  useEffect(() => {
    if (!mapRef.current && containerRef.current) {
      mapRef.current = L.map(containerRef.current).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapRef.current)
      layerRef.current = L.layerGroup().addTo(mapRef.current)
    }
  }, [])

  // recenter when lat/lng change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14)
    }
  }, [lat, lng])

  // markers
  useEffect(() => {
    if (!layerRef.current) return
    layerRef.current.clearLayers()
    for (const c of carparks) {
      if (typeof c.lat !== 'number' || typeof c.lng !== 'number') continue
      L.marker([c.lat, c.lng])
        .bindPopup(`
          <b>${c.name}</b><br/>
          ${c.address}<br/>
          ${c.fee?.weekday ? `Weekday: ${c.fee.weekday}<br/>` : ''}
          ${c.fee?.saturday ? `Sat: ${c.fee.saturday}<br/>` : ''}
          ${c.fee?.sundayPH ? `Sun/PH: ${c.fee.sundayPH}<br/>` : ''}
          ${c.fee?.freeParking ? `Free parking: ${c.fee.freeParking}` : ''}
        `)
        .addTo(layerRef.current)
    }
  }, [carparks])

  return <div ref={containerRef} className="h-[60vh] w-full rounded" />
}
