# ParkLah System Architecture & Algorithm Documentation

## Overview

ParkLah is a carpark search and discovery application for Singapore. The system uses **local CSV data** for carpark information, **OpenStreetMap Nominatim** for weather location geocoding, and **local haversine calculations** for routing (no external routing APIs).

---

## System Architecture

### High-Level Components

```
┌─────────────────┐
│   Frontend       │  React + TypeScript + Leaflet Maps
│   (React SPA)    │
└────────┬─────────┘
         │ HTTP/REST
         │ (withCredentials)
         ▼
┌─────────────────┐
│   Backend       │  Express.js + TypeScript
│   (Node.js)     │
└────────┬─────────┘
         │
    ┌────┴────┬──────────┬──────────────┐
    │         │          │              │
    ▼         ▼          ▼              ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌─────────────┐
│  CSV   │ │ HDB  │ │ OpenSt   │ │   Prisma    │
│  Data  │ │ API  │ │ Map API  │ │  (SQLite)   │
│        │ │      │ │ (Nomin.) │ │             │
└────────┘ └──────┘ └──────────┘ └─────────────┘
```

### Key Technologies

- **Frontend**: React, TypeScript, Leaflet (maps), Tailwind CSS
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Data Sources**:
  - **CSV Files**: HDB carpark metadata and rates
  - **HDB API** (optional): Real-time availability (`data.gov.sg`)
  - **OpenStreetMap Nominatim**: Weather location geocoding
  - **NEA API**: Weather forecasts
- **Routing**: Local haversine calculation (no external API)
- **Database**: SQLite (Prisma) for user data

---

## Data Flow & Algorithms

### 1. Text Search Flow (Search by Location Name)

**Use Case**: User searches for "Choa Chu Kang" or "Tampines West"

```
User Input → Frontend → Backend API → CSV Matching → Distance/ETA Calculation → Ranking → Results
```

#### Detailed Algorithm:

1. **Frontend** (`SearchView.tsx`):
   - User enters text query
   - Calls `GET /carparks/search?q={query}&originLat={lat}&originLng={lng}`

2. **Backend Controller** (`CarparkController.ts`):
   - Validates query
   - Extracts optional `originLat/originLng` (user's current location)
   - Calls `searchCarparks(q, radiusM, 'C', origin)`

3. **Service Layer** (`CarparkService.ts`):
   - **Step 1: Derive Search Center**
     - Calls `findMetaByText(q)` → searches CSV metadata for matching names/addresses
     - Uses **fuzzy text matching** (substring, case-insensitive)
     - Calculates centroid of matched carparks using `centroidOfMeta()`
     - If no matches found → fallback to Singapore center `(1.3521, 103.8198)`
   
   - **Step 2: Find Nearby Carparks**
     - Calls `nearbyCarparks(center, radiusM)` → filters CSV carparks within radius
     - Uses **planar distance approximation** (fast, good for Singapore's small area)
     - Formula: `distance = sqrt((dx * lngToM)² + (dy * latToM)²)`
     - If text matches found → prioritizes matched carparks in results
   
   - **Step 3: Optional Live Availability**
     - If `USE_LIVE_AVAIL=1` → fetches from HDB API (`data.gov.sg`)
     - Merges live data with CSV metadata
     - Falls back to random availability if API unavailable
   
   - **Step 4: Calculate Distance & ETA**
     - For each carpark candidate (capped at 200 for performance):
       - Calls `routeToCarpark(from, to)` → uses **haversine distance** with road factor
       - Haversine formula: `distance = 2R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)))`
       - Road distance = beeline × `ROUTE_FALLBACK_ROAD_FACTOR` (default: 1.3)
       - ETA = road distance / speed (default: 30 km/h)
       - If routing fails → fallback to direct distance calculation
   
   - **Step 5: Rank Results**
     - Sorts by: **Availability ratio** → **Fee score** → **Distance** → **ETA**
     - Availability ratio = `available / total`
     - Fee score = extracts first price from fee string (lower = better)

4. **Response**: Returns ranked carparks with distance, ETA, availability, rates

5. **Frontend Display**:
   - Renders carparks on Leaflet map as pins
   - Shows list of carparks with details
   - Applies client-side filters (carpark type, vehicle type, price, distance, availability)

---

### 2. "Locate Me" Flow (GPS-Based Search)

**Use Case**: User clicks "Locate me" button

```
Browser Geolocation → Frontend → Backend API → Nearby Search → Distance/ETA → Ranking → Results
```

#### Detailed Algorithm:

1. **Frontend** (`SearchView.tsx`):
   - Requests browser geolocation (`navigator.geolocation.getCurrentPosition()`)
   - Stores location in `localStorage` for future use
   - Calls `GET /carparks/near?lat={lat}&lng={lng}&radiusM={radius}`

2. **Backend Controller** (`CarparkController.ts`):
   - Validates lat/lng coordinates
   - Calls `searchCarparksByCoords(center, radiusM, 'C')`

3. **Service Layer** (`CarparkService.ts`):
   - **Step 1**: Calls `nearbyCarparks(center, radiusM)` → finds all carparks within radius
   - **Step 2**: Optional live availability merge (if enabled)
   - **Step 3**: Calculates distance & ETA from user location to each carpark
   - **Step 4**: Ranks results (same algorithm as text search)

4. **Response**: Returns ranked carparks sorted by distance/availability

---

### 3. "Show All Carparks" Flow

**Use Case**: User clicks "Show all carparks" button

```
Frontend → Backend API → Load All CSV Carparks → Client-Side Distance/ETA → Display
```

#### Detailed Algorithm:

1. **Frontend** (`SearchView.tsx`):
   - Calls `GET /carparks/all`
   - Gets all carparks from CSV (no filtering)

2. **Backend Controller** (`CarparkController.ts`):
   - Calls `getAllAsCarparks()` → returns all CSV carparks with rates and random availability

3. **Frontend Processing**:
   - For each carpark, calculates distance/ETA from user's stored location (or Singapore center)
   - Uses client-side haversine: `computeDistanceMeters(userLoc, carpark)`
   - Applies client-side filters
   - Displays all carparks on map

---

### 4. Weather Forecast Flow

**Use Case**: Weather widget displays forecast for user location or search query

```
Frontend → Backend API → OpenStreetMap Geocoding → NEA Weather API → Forecast Data
```

#### Detailed Algorithm:

1. **Frontend** (`WeatherWidget.tsx`):
   - On mount: Fetches islandwide forecast (Singapore center)
   - If user location available: Fetches local forecast
   - If search query available: Fetches forecast for search location
   - Calls `GET /weather/current?lat={lat}&lng={lng}` OR `?location={query}`

2. **Backend Controller** (`WeatherController.ts`):
   - If `location` query param provided:
     - Calls `geocodeLocation(location)` → uses **OpenStreetMap Nominatim**
     - URL: `https://nominatim.openstreetmap.org/search?format=json&q={location}, Singapore`
     - Extracts lat/lng from first result
   - Calls `getForecast(lat, lng)` → fetches from NEA API

3. **NEA Service** (`NEAService.ts`):
   - Fetches 2-hour and 24-hour forecasts from NEA API
   - Returns formatted forecast data

4. **Frontend Display**:
   - Shows islandwide and local forecasts with weather icons
   - Displays condition, time range, and update timestamp

---

### 5. Coordinate Conversion (SVY21 → WGS84)

**Use Case**: CSV contains SVY21 coordinates (Singapore local projection), need WGS84 for maps

#### Algorithm:

1. **Detection**: Checks if CSV has X/Y columns with large values (>1000) → indicates SVY21
2. **Conversion**: Uses `proj4` library to convert SVY21 (EPSG:3414) → WGS84
   - Formula: Transverse Mercator projection with Singapore-specific parameters
   - Parameters: `lat_0=1.366666, lon_0=103.833333, k=1, x_0=28001.642, y_0=38744.572`
3. **Result**: Carparks stored with WGS84 lat/lng for map display

---

## Use Case Diagrams

### Primary Use Cases

1. **UC-1: Search Carparks by Location Name**
   - Actor: User
   - Precondition: User is logged in
   - Flow:
     1. User enters location name (e.g., "Tampines")
     2. System searches CSV for matching carparks
     3. System finds nearby carparks within radius
     4. System calculates distance/ETA from user location
     5. System ranks results by availability, price, distance
     6. System displays results on map and list

2. **UC-2: Find Carparks Near Me**
   - Actor: User
   - Precondition: User is logged in, browser geolocation enabled
   - Flow:
     1. User clicks "Locate me"
     2. Browser requests GPS location
     3. System finds carparks within 15km radius
     4. System calculates distance/ETA
     5. System displays results sorted by distance

3. **UC-3: View All Carparks**
   - Actor: User
   - Precondition: User is logged in
   - Flow:
     1. User clicks "Show all carparks"
     2. System loads all carparks from CSV
     3. System calculates distance/ETA from user location
     4. System displays all carparks on map

4. **UC-4: Filter Carparks**
   - Actor: User
   - Precondition: Carparks are displayed
   - Flow:
     1. User opens filters panel
     2. User selects filters (type, vehicle, price, distance, availability)
     3. System applies filters to displayed carparks
     4. System updates map and list

5. **UC-5: View Weather Forecast**
   - Actor: User
   - Precondition: User is on home page
   - Flow:
     1. System fetches islandwide forecast (on mount)
     2. If user location available, system fetches local forecast
     3. System displays forecasts with icons

6. **UC-6: View Carpark Details**
   - Actor: User
   - Precondition: Carparks are displayed
   - Flow:
     1. User clicks carpark card or map pin
     2. System displays detailed information (rates, availability, distance, ETA)
     3. User can navigate to carpark (Google Maps link)

---

## Sequence Diagrams

### Sequence: Text Search

```
User          Frontend          Backend          CSV Adapter      Route Adapter
  |               |                 |                  |                 |
  |--[Enter Query]-->|              |                  |                 |
  |               |--[GET /search]-->|                 |                 |
  |               |                 |--[findMetaByText]-->|             |
  |               |                 |<--[matches]------|                 |
  |               |                 |--[nearbyCarparks]-->|              |
  |               |                 |<--[candidates]---|                 |
  |               |                 |--[routeToCarpark]----------------->|
  |               |                 |<--[distance/ETA]-------------------|
  |               |                 |--[rankCarparks]-->|                |
  |               |<--[ranked results]--|                |                |
  |<--[Display]---|                 |                  |                 |
```

### Sequence: Locate Me

```
User          Browser          Frontend          Backend          Route Adapter
  |               |                 |                 |                 |
  |--[Click]------>|                 |                 |                 |
  |               |--[getCurrentPosition]-->|          |                 |
  |               |<--[GPS coords]---|                 |                 |
  |               |                 |--[GET /near]---->|                 |
  |               |                 |                 |--[nearbyCarparks]|
  |               |                 |                 |--[routeToCarpark]-->|
  |               |                 |<--[results]-----|                 |
  |<--[Display]---|                 |                 |                 |
```

### Sequence: Weather Forecast

```
User          Frontend          Backend          OpenStreetMap    NEA API
  |               |                 |                 |              |
  |--[Load Page]-->|                 |                 |              |
  |               |--[GET /weather]-->|                |              |
  |               |                 |--[geocodeLocation]-->|          |
  |               |                 |<--[lat/lng]------|              |
  |               |                 |--[getForecast]------------------>|
  |               |<--[forecast]----|                 |              |
  |<--[Display]---|                 |                 |              |
```

---

## Key Algorithms

### 1. Text Matching Algorithm (`findMetaByText`)

```typescript
// Scoring-based fuzzy matching
- Exact match (case-insensitive): score = 100
- Starts with query: score = 80
- Contains query: score = 60
- Address contains query: score = 40
- Sorted by score descending
```

### 2. Distance Calculation (Haversine)

```typescript
function haversineMeters(a: {lat, lng}, b: {lat, lng}) {
  const R = 6371000 // Earth radius in meters
  const dLat = (b.lat - a.lat) * π / 180
  const dLng = (b.lng - a.lng) * π / 180
  const s1 = sin²(dLat/2) + cos(a.lat) * cos(b.lat) * sin²(dLng/2)
  return 2 * R * arcsin(√s1)
}
```

### 3. Road Distance Estimation

```typescript
// Assumes roads are 30% longer than beeline distance
roadDistance = haversineDistance × 1.3
ETA = roadDistance / (30 km/h / 3.6) // Convert to m/s
```

### 4. Ranking Algorithm

```typescript
// Multi-criteria sorting:
1. Availability ratio (descending): available / total
2. Fee score (ascending): extract first price from fee string
3. Distance (ascending): distanceM
4. ETA (ascending): etaS
```

### 5. Region-Based Rate Assignment

```typescript
// Determines region from coordinates:
- Central: within 5km of Singapore center
- North: lat > center.lat && lng > center.lng
- South: lat <= center.lat && lng <= center.lng
- East: lat <= center.lat && lng > center.lng
- West: lat > center.lat && lng <= center.lng

// Assigns default rates if carpark-specific rates not found
```

---

## Data Structures

### Carpark Type

```typescript
type Carpark = {
  id: string                    // Unique identifier (e.g., "ACB")
  name: string                  // Carpark name
  address: string               // Full address
  lat: number                   // WGS84 latitude
  lng: number                   // WGS84 longitude
  carparkType?: string          // "MULTI-STOREY", "SURFACE", "BASEMENT"
  lotAvailability: {            // Availability by vehicle type
    C?: { total: number; available: number }  // Car
    H?: { total: number; available: number }  // Heavy
    S?: { total: number; available: number }  // Small
    Y?: { total: number; available: number }   // Motorcycle
  }
  gantryHeightM?: number        // Gantry height in meters
  fee: {                        // Parking rates
    weekday?: string            // e.g., "$1.20 for 1st hr; $0.60 for sub. ½ hr"
    saturday?: string
    sundayPH?: string
    freeParking?: string | null
  }
  distanceM?: number            // Distance from user (meters)
  etaS?: number                 // Estimated time of arrival (seconds)
}
```

---

## External API Usage

### 1. OpenStreetMap Nominatim (Weather Geocoding)

- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Purpose**: Convert location name → coordinates
- **Usage**: Only for weather forecasts (not for carpark search)
- **Rate Limit**: Requires `User-Agent` header

### 2. HDB Carpark Availability API (Optional)

- **Endpoint**: `https://api.data.gov.sg/v1/transport/carpark-availability`
- **Purpose**: Real-time carpark availability
- **Usage**: Only when `USE_LIVE_AVAIL=1`
- **Fallback**: Random availability if API unavailable

### 3. NEA Weather API

- **Endpoint**: NEA 2-hour and 24-hour forecast APIs
- **Purpose**: Weather forecasts for Singapore
- **Usage**: Weather widget on home page

---

## Performance Optimizations

1. **CSV Caching**: Carpark metadata loaded once at startup, kept in memory
2. **Routing Limit**: Only calculates distance/ETA for top 200 carparks
3. **Planar Distance**: Uses fast planar approximation for initial filtering (accurate for Singapore's small area)
4. **Client-Side Filtering**: Filters applied on frontend to reduce backend load
5. **Lazy Loading**: Weather forecasts loaded separately, don't block carpark search

---

## Security & Authentication

- **JWT-based authentication**: Tokens stored in HTTP-only cookies
- **Protected routes**: All carpark/weather endpoints require authentication
- **2FA support**: Optional two-factor authentication via TOTP
- **Password reset**: Token-based password reset flow
- **CORS**: Configured for frontend origin only

---

## Summary

**Key Points:**
- **No OneMap usage**: System uses local CSV matching for carpark search
- **OpenStreetMap**: Only used for weather location geocoding
- **Local routing**: Haversine distance with road factor (no external routing API)
- **CSV-first**: All carpark data from CSV files, optional live availability from HDB API
- **Client-side filtering**: Filters applied on frontend for performance
- **Multi-criteria ranking**: Availability → Price → Distance → ETA

This architecture prioritizes **performance**, **reliability** (no external dependencies for core search), and **cost-effectiveness** (minimal API usage).

