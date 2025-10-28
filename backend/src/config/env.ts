import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  USE_MOCK: process.env.USE_MOCK === '1',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ONEMAP_EMAIL: process.env.ONEMAP_EMAIL || '',
  ONEMAP_PASSWORD: process.env.ONEMAP_PASSWORD || '',
  CARPARKS_CSV_PATH: process.env.CARPARKS_CSV_PATH,
  CARPARK_RATES_CSV_PATH: process.env.CARPARK_RATES_CSV_PATH,
}
