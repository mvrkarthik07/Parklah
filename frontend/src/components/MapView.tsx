import { useEffect, useRef } from 'react'
import L from 'leaflet'
// Ensure default marker icons load correctly in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url'
import markerIcon from 'leaflet/dist/images/marker-icon.png?url'
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url'
import 'leaflet/dist/leaflet.css'
import type { Carpark } from '../lib/ranking'

type Props = { lat: number; lng: number; carparks: Carpark[] }

export default function MapView({ lat, lng, carparks }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.FeatureGroup | null>(null)
  const userRef = useRef<L.CircleMarker | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // init once
  useEffect(() => {
    // configure default marker icons for bundlers
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    })
    if (!mapRef.current && containerRef.current) {
      mapRef.current = L.map(containerRef.current).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
      // Ensure tiles render if container sizing changed recently
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 0)
      layerRef.current = L.featureGroup().addTo(mapRef.current)
    }
  }, [])

  // recenter when lat/lng change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14)
    }
    // draw/update user location marker
    if (mapRef.current) {
      if (!userRef.current) {
        userRef.current = L.circleMarker([lat, lng], {
          radius: 10,
          color: '#0ea5e9',
          weight: 3,
          fillColor: '#38bdf8',
          fillOpacity: 0.6,
        }).addTo(mapRef.current)
        userRef.current.bindPopup('<b>You are here</b>')
      } else {
        userRef.current.setLatLng([lat, lng])
      }
    }
  }, [lat, lng])

  // markers
  useEffect(() => {
    if (!mapRef.current) return
    if (!layerRef.current) {
      layerRef.current = L.featureGroup().addTo(mapRef.current)
    } else {
      layerRef.current.clearLayers()
    }
    const points: L.LatLngExpression[] = []
    // To avoid multiple markers overlapping at identical coords, jitter duplicates slightly
    const seen = new Map<string, number>()
    for (const c of carparks) {
      if (typeof c.lat !== 'number' || typeof c.lng !== 'number') continue
      let lat0 = c.lat
      let lng0 = c.lng
      const key = `${lat0.toFixed(6)},${lng0.toFixed(6)}`
      const count = (seen.get(key) || 0) + 1
      seen.set(key, count)
      if (count > 1) {
        const angle = (count - 1) * (Math.PI / 4) // 45° steps
        const r = 0.0002 // ~20m jitter
        const dLat = r * Math.sin(angle)
        const dLng = (r * Math.cos(angle)) / Math.max(0.1, Math.cos((lat0 * Math.PI) / 180))
        lat0 += dLat
        lng0 += dLng
      }
      const pos: L.LatLngExpression = [lat0, lng0]
      points.push(pos)
      // Use circle markers to avoid any icon asset issues
      L.circleMarker(pos, {
        radius: 8,
        color: '#e11d48',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.95,
      })
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
    // force size recalculation after rendering markers
    if (mapRef.current) {
      mapRef.current.invalidateSize()
    }
    // debug count
    console.debug('[MapView] markers added:', points.length)
    // Fit map to show all markers if any
    if (points.length === 1) {
      const [p] = points
      mapRef.current.setView(p as L.LatLngExpression, 16)
    } else if (layerRef.current && (layerRef.current as any).getBounds && points.length > 0) {
      const bounds = layerRef.current.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds.pad(0.1))
      }
    }
  }, [carparks])

  return <div ref={containerRef} className="h-[60vh] w-full rounded" />
}
