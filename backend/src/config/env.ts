import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  USE_MOCK: process.env.USE_MOCK === '0',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ONEMAP_EMAIL: process.env.ONEMAP_EMAIL || '',
  ONEMAP_PASSWORD: process.env.ONEMAP_PASSWORD || '',
  CARPARKS_CSV_PATH: process.env.CARPARKS_CSV_PATH,
  CARPARK_RATES_CSV_PATH: process.env.CARPARK_RATES_CSV_PATH,
  HDB_API_KEY: process.env.HDB_API_KEY || '',
  NEA_API_KEY: process.env.NEA_API_KEY || '',
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '6000', 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || '2', 10),
   ONEMAP_TOKEN: process.env.ONEMAP_TOKEN || '', 

}
