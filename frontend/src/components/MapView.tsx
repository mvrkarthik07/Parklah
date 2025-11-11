import { useEffect, useRef } from 'react'
import L from 'leaflet'
// Ensure default marker icons load correctly in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url'
import markerIcon from 'leaflet/dist/images/marker-icon.png?url'
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url'
import 'leaflet/dist/leaflet.css'
import type { Carpark } from '../lib/ranking'
import { getAvailabilityLines } from '../utils/availability'
import { formatDistance, formatEta } from '../utils/format'

type Props = { 
  lat: number; 
  lng: number; 
  carparks: Carpark[]; 
  selectedCarpark?: Carpark | null
  userLocation?: { lat: number; lng: number } | null
  onCarparkSelect?: (carpark: Carpark) => void
}

export default function MapView({ lat, lng, carparks, selectedCarpark, userLocation, onCarparkSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.FeatureGroup | null>(null)
  const userRef = useRef<L.CircleMarker | null>(null)
  const selectedRef = useRef<L.CircleMarker | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  // Create Google Maps-style pin icon
  const createPinIcon = (isSelected: boolean) => {
    const color = isSelected ? '#2563eb' : '#e11d48'
    
    return L.divIcon({
      className: 'custom-pin-icon',
      html: `
        <div style="position: relative; width: 0; height: 0;">
          <svg width="14" height="18" viewBox="0 0 32 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="5" fill="#fff"/>
          </svg>
        </div>
      `,
      iconSize: [14, 18],
      iconAnchor: [7, 18],
      popupAnchor: [0, -18],
    })
  }

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
      // Default to satellite map
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maxZoom: 19,
      }).addTo(mapRef.current)
      // Ensure tiles render if container sizing changed recently
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 0)
      layerRef.current = L.featureGroup().addTo(mapRef.current)
    }
  }, [])

  // recenter when lat/lng change (only if no carparks and no carpark selected)
  useEffect(() => {
    if (mapRef.current && !selectedCarpark && carparks.length === 0) {
      // Only recenter if there are no carparks to show
      mapRef.current.setView([lat, lng], 14, { animate: true })
    }
  }, [lat, lng, selectedCarpark, carparks.length])

  // Always show user location marker when available
  useEffect(() => {
    if (!mapRef.current) return
    const userPos = userLocation || (lat && lng ? { lat, lng } : null)
    if (userPos) {
      if (!userRef.current) {
        userRef.current = L.circleMarker([userPos.lat, userPos.lng], {
          radius: 10,
          color: '#0ea5e9',
          weight: 3,
          fillColor: '#38bdf8',
          fillOpacity: 0.8,
        }).addTo(mapRef.current)
        userRef.current.bindPopup('<b>You are here</b>')
      } else {
        userRef.current.setLatLng([userPos.lat, userPos.lng])
      }
    }
  }, [userLocation, lat, lng])

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
      const isSelected = selectedCarpark?.id === c.id
      // Use Google Maps-style pin markers
      const marker = L.marker(pos, {
        icon: createPinIcon(isSelected),
      })
      
      const availabilityLines = getAvailabilityLines(c.lotAvailability).slice(0, 2)
      const availabilityHtml = availabilityLines.length
        ? availabilityLines
            .map((line) => `<span style=\"display:block;color:#475569;\">${line}</span>`)
            .join('')
        : '<span style="display:block;color:#94a3b8;">Availability data unavailable</span>'
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${c.lat},${c.lng}`
      )}`

      const popupContent = `
        <div style="min-width:170px;font-family:system-ui,-apple-system,sans-serif;font-size:11px;line-height:1.4;color:#1f2937;">
          <div style="display:flex;justify-content:space-between;align-items-center;margin-bottom:2px;">
            <strong style="font-size:12px;">${c.name}</strong>
            <button data-close-popup style="border:none;background:transparent;color:#64748b;font-size:14px;cursor:pointer;padding:0;" aria-label="Close">×</button>
          </div>
          ${c.distanceM ? `<span style=\"display:block;color:#475569;\">${formatDistance(c.distanceM)} · ${formatEta(c.etaS)}</span>` : ''}
          ${c.carparkType ? `<span style=\"display:block;color:#475569;margin-top:2px;\">Type: ${c.carparkType}</span>` : ''}
          <div style="margin-top:4px;">${availabilityHtml}</div>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:4px 8px;border-radius:6px;background:#2563eb;color:#fff;text-decoration:none;font-size:10px;">Navigate</a>
        </div>
      `

      marker
        .bindPopup(popupContent, {
          closeButton: false,
          offset: L.point(0, -10),
          autoPan: true,
          className: 'carpark-mini-popup',
        })
        .on('click', () => {
          if (onCarparkSelect) {
            onCarparkSelect(c)
          }
          marker.openPopup()
        })
        .on('popupopen', (evt) => {
          const container = evt.popup.getElement()
          if (!container) return
          const closeBtn = container.querySelector('[data-close-popup]') as HTMLButtonElement | null
          if (closeBtn) {
            closeBtn.onclick = () => {
              evt.popup.close()
            }
          }
        })
        .addTo(layerRef.current)
      
      if (isSelected) {
        marker.openPopup()
      }
    }
    // force size recalculation after rendering markers
    if (mapRef.current) {
      mapRef.current.invalidateSize()
    }
    // debug count
    console.debug('[MapView] markers added:', points.length)
    
    // Zoom behavior: only fit bounds if no carpark is selected
    if (selectedCarpark) {
      // If a carpark is selected, zoom to it (don't reset)
      const selected = carparks.find((c) => c.id === selectedCarpark.id)
      if (selected && typeof selected.lat === 'number' && typeof selected.lng === 'number') {
        if (mapRef.current) {
          mapRef.current.setView([selected.lat, selected.lng], 16, { animate: true })
        }
      }
    } else if (points.length > 0) {
      // If no selection, fit all markers with a slight delay to ensure smooth update
      setTimeout(() => {
        if (!selectedCarpark && mapRef.current) {
          if (points.length === 1) {
            const [p] = points
            mapRef.current.setView(p as L.LatLngExpression, 16, { animate: true })
          } else if (layerRef.current && (layerRef.current as any).getBounds) {
            const bounds = layerRef.current.getBounds()
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds.pad(0.1), { animate: true })
            }
          }
        }
      }, 150)
    }
  }, [carparks, selectedCarpark])

  const recenterToUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true })
    }
  }

  return (
    <div className="relative h-[50vh] sm:h-[55vh] md:h-[60vh] w-full rounded-lg overflow-hidden shadow-md" ref={containerRef}>
      {/* User location button - bottom right */}
      {userLocation && (
        <button
          onClick={recenterToUser}
          className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-[1000] p-2.5 sm:p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Center map on my location"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  )
}
