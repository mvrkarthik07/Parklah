# Traceability Matrix (UC ↔ Code)

| Use Case | Lifelines (Sequence) | Backend | Frontend |
|---|---|---|---|
| UC 1.1/1.2 Query System | SearchView → CarparkController → GeocoderOneMap | `routes/CarparkController.ts (GET /carparks/search)`, `adapters/GeocoderOneMap.ts (normalizeLocation)` | `routes/SearchView.tsx`, `lib/api.ts` |
| UC 2.1/2.2/2.3 Results & Map | CarparkController → CarparkService → HDBCarparkAdapter, RouteOneMap | `services/CarparkService.ts (fetchAndRankCarparks, rankResults)`, `adapters/HDBCarparkAdapter.ts (nearbyCarparks)`, `adapters/RouteOneMap.ts (routeToCarpark)` | `routes/ResultsView.tsx`, `components/MapView.tsx` |
| UC 3.x Weather | WeatherTab → WeatherController → NEAWeatherAdapter | `routes/WeatherController.ts (GET /weather/current)`, `adapters/NEAWeatherAdapter.ts (forecasts)` | `routes/WeatherTab.tsx` |
| UC 4.1 Registration | AuthView → AuthController → AuthService | `routes/AuthController.ts`, `services/AuthService.ts`, `prisma/schema.prisma` | `routes/AuthView.tsx` |
