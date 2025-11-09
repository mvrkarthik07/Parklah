import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  // Default to mock mode unless explicitly disabled with USE_MOCK=0
  USE_MOCK: process.env.USE_MOCK !== '0',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  ONEMAP_EMAIL: process.env.ONEMAP_EMAIL || '',
  ONEMAP_PASSWORD: process.env.ONEMAP_PASSWORD || '',
  CARPARKS_CSV_PATH: process.env.CARPARKS_CSV_PATH,
  CARPARK_RATES_CSV_PATH: process.env.CARPARK_RATES_CSV_PATH,
  HDB_API_KEY: process.env.HDB_API_KEY || '',
  NEA_API_KEY: process.env.NEA_API_KEY || '',
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '6000', 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || '2', 10),
   ONEMAP_TOKEN: process.env.ONEMAP_TOKEN || '', 
  // Routing fallback controls
  ROUTE_FALLBACK: (process.env.ROUTE_FALLBACK || 'haversine') as 'haversine' | 'none',
  ROUTE_FALLBACK_ROAD_FACTOR: parseFloat(process.env.ROUTE_FALLBACK_ROAD_FACTOR || '1.3'),
  ROUTE_FALLBACK_SPEED_KMH: parseFloat(process.env.ROUTE_FALLBACK_SPEED_KMH || '30'),
  ROUTE_FALLBACK_SILENT: process.env.ROUTE_FALLBACK_SILENT !== '0',

}
