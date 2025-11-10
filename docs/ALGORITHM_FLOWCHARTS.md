# ParkLah Algorithm Flowcharts

## 1. Text Search Algorithm Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ENTERS QUERY                        │
│                  (e.g., "Choa Chu Kang")                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Frontend: SearchView.tsx   │
        │   GET /carparks/search?q=... │
        └───────────────┬─────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Backend: CarparkController   │
        │  Validates query              │
        └───────────────┬─────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Service: CarparkService        │
        │  searchCarparks(q, ...)        │
        └───────────────┬─────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐           ┌──────────────────┐
│ Step 1:       │           │ Step 2:           │
│ Find Search   │           │ Find Nearby       │
│ Center        │           │ Carparks          │
│               │           │                   │
│ findMetaByText│           │ nearbyCarparks    │
│ (CSV match)   │           │ (radius filter)   │
└───────┬───────┘           └─────────┬─────────┘
        │                             │
        │  ┌──────────────────────────┘
        │  │
        ▼  ▼
┌───────────────────────────────┐
│ Step 3: Optional Live Avail  │
│ (if USE_LIVE_AVAIL=1)         │
│ HDB API → merge availability  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Step 4: Calculate Distance   │
│ & ETA                         │
│                               │
│ For each carpark (max 200):   │
│   routeToCarpark()            │
│   → Haversine + road factor   │
│   → ETA = distance / speed    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Step 5: Rank Results          │
│                               │
│ Sort by:                      │
│ 1. Availability ratio (↓)     │
│ 2. Fee score (↑)              │
│ 3. Distance (↑)               │
│ 4. ETA (↑)                    │
└───────────────┬───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Return JSON  │
        │ (ranked list) │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Frontend      │
        │ Display Map   │
        │ + List        │
        └───────────────┘
```

## 2. Locate Me Algorithm Flow

```
┌─────────────────────────────────────┐
│   USER CLICKS "LOCATE ME"           │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ Browser Geolocation│
        │ getCurrentPosition │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Store in          │
        │ localStorage      │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ GET /carparks/near│
        │ ?lat=X&lng=Y      │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ nearbyCarparks()  │
        │ (radius filter)   │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Calculate Distance│
        │ & ETA             │
        │ (haversine)        │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Rank & Return     │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Display Results   │
        └───────────────────┘
```

## 3. Show All Carparks Flow

```
┌─────────────────────────────────────┐
│   USER CLICKS "SHOW ALL CARPARKS"   │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ GET /carparks/all │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ getAllAsCarparks()│
        │ (all CSV data)    │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Frontend:         │
        │ Client-side calc  │
        │ distance/ETA      │
        │ (from user loc)   │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Apply Filters     │
        │ (client-side)      │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Display All       │
        │ on Map            │
        └───────────────────┘
```

## 4. Weather Forecast Flow

```
┌─────────────────────────────────────┐
│   WEATHER WIDGET LOADS              │
└───────────────┬─────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Islandwide   │  │ Local        │
│ Forecast      │  │ Forecast     │
│ (SG center)  │  │ (user loc)   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │                 │ (if location query)
       │                 ▼
       │         ┌──────────────┐
       │         │ OpenStreetMap │
       │         │ Nominatim     │
       │         │ geocode()     │
       │         └──────┬───────┘
       │                │
       └────────┬───────┘
                │
                ▼
        ┌──────────────┐
        │ NEA API      │
        │ getForecast()│
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Display      │
        │ Forecasts    │
        │ with Icons   │
        └──────────────┘
```

## 5. Coordinate Conversion Flow (SVY21 → WGS84)

```
┌─────────────────────────────────────┐
│   CSV FILE LOADED                   │
│   (hdb_carparks.csv)                │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Check Columns │
        │ X, Y present? │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    ┌───────┐      ┌──────────┐
    │ Yes   │      │ No       │
    │ (SVY21│      │ (WGS84)  │
    │ format)│     │          │
    └───┬───┘      └────┬─────┘
        │               │
        │               │ Use as-is
        │               │
        ▼               │
┌───────────────┐       │
│ proj4 convert │       │
│ EPSG:3414     │       │
│ → WGS84       │       │
└───────┬───────┘       │
        │               │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Store WGS84   │
        │ lat/lng       │
        └───────────────┘
```

## 6. Ranking Algorithm Flow

```
┌─────────────────────────────────────┐
│   CARPARK CANDIDATES                │
│   (with distance, ETA, availability) │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ For each carpark: │
        │ Calculate scores  │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Availability │    │ Fee Score    │
│ Ratio        │    │              │
│ = available/ │    │ Extract $X   │
│   total      │    │ from string  │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ Sort by:          │
        │ 1. Avail ratio ↓  │
        │ 2. Fee score ↑    │
        │ 3. Distance ↑     │
        │ 4. ETA ↑          │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ RANKED RESULTS    │
        └───────────────────┘
```

## 7. Text Matching Algorithm (findMetaByText)

```
┌─────────────────────────────────────┐
│   USER QUERY: "tampines west"       │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ For each carpark  │
        │ in CSV:           │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Check Name   │    │ Check Address│
│ field        │    │ field        │
└──────┬───────┘    └──────┬───────┘
       │                   │
       │                   │
       └─────────┬─────────┘
                 │
        ┌────────┴────────┐
        │                  │
        ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Exact match  │   │ Starts with  │
│ (case-insens)│   │ query        │
│ Score: 100   │   │ Score: 80    │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
        ┌───────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Contains     │   │ Address      │
│ query        │   │ contains     │
│ Score: 60    │   │ Score: 40    │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
                ▼
        ┌───────────────────┐
        │ Sort by score ↓  │
        │ Return matches   │
        └───────────────────┘
```

## 8. Distance Calculation (Haversine)

```
┌─────────────────────────────────────┐
│   TWO POINTS:                       │
│   A = {lat1, lng1}                  │
│   B = {lat2, lng2}                  │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ Calculate:        │
        │ Δlat = lat2-lat1  │
        │ Δlng = lng2-lng1 │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Convert to radians│
        │ dLat = Δlat × π/180│
        │ dLng = Δlng × π/180│
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Haversine formula:│
        │ a = sin²(Δlat/2) + │
        │     cos(lat1) ×   │
        │     cos(lat2) ×   │
        │     sin²(Δlng/2)  │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ c = 2 × atan2(    │
        │     √a, √(1-a))  │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ distance = R × c  │
        │ R = 6371000m      │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Return distance   │
        │ in meters         │
        └───────────────────┘
```

## 9. Road Distance & ETA Estimation

```
┌─────────────────────────────────────┐
│   HAVERSINE DISTANCE (beeline)      │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ Apply Road Factor │
        │ road = beeline ×  │
        │       1.3          │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Calculate ETA     │
        │ speed = 30 km/h   │
        │ = 8.33 m/s        │
        │ ETA = road / speed│
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Return:           │
        │ {distanceM, etaS} │
        └───────────────────┘
```

## 10. System Component Interaction

```
┌──────────────┐
│   Frontend   │
│  (React SPA) │
└──────┬───────┘
       │ HTTP/REST
       │
       ▼
┌──────────────┐
│   Backend    │
│  (Express)   │
└──────┬───────┘
       │
       ├──────────┬──────────┬──────────┐
       │          │          │          │
       ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ CSV     │ │ HDB API │ │ OpenSt  │ │ Prisma  │
│ Adapter │ │ (opt)   │ │ Map API │ │ (DB)    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
       │          │          │          │
       │          │          │          │
       └──────────┴──────────┴──────────┘
                    │
                    ▼
            ┌──────────────┐
            │   Route      │
            │   Adapter    │
            │ (Haversine)  │
            └──────────────┘
```

---

## Key Formulas

### Haversine Distance
```
distance = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)))
where R = 6371000 meters (Earth radius)
```

### Road Distance
```
roadDistance = haversineDistance × ROAD_FACTOR
where ROAD_FACTOR = 1.3 (default)
```

### ETA Calculation
```
ETA = roadDistance / speed
where speed = 30 km/h = 8.33 m/s (default)
```

### Availability Ratio
```
availabilityRatio = available / total
```

### Fee Score
```
feeScore = extractFirstPrice(feeString)
if freeParking: feeScore = 0
```

