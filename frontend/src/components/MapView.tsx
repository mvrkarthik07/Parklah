// frontend/src/components/MapView.tsx
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Carpark } from '../lib/ranking'

export default function MapView({
  lat,
  lng,
  carparks,
}: { lat: number; lng: number; carparks: Carpark[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  // init map once
  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return // already initialized

    const map = L.map(containerRef.current).setView([lat, lng], 14)
    L.tileLayer(
      import.meta.env.VITE_ONEMAP_TILE_URL ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: 'Map' }
    ).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      // cleanup on unmount to avoid “already initialized” on remounts
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, []) // run once

  // center updates
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView([lat, lng], mapRef.current.getZoom())
  }, [lat, lng])

  // markers updates
  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return
    const group = markersRef.current
    group.clearLayers()

    // user location
    L.marker([lat, lng]).addTo(group).bindPopup('You')

    // carparks
    carparks.forEach((c) => {
      L.circleMarker([c.lat, c.lng], { radius: 6 })
        .addTo(group)
        .bindPopup(c.name)
    })
  }, [carparks, lat, lng])

  return <div ref={containerRef} className="w-full h-80 rounded border" />
}
