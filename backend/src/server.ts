import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './config/env'
import { errorHandler } from './middlewares/errorHandler'
import { authGuard } from './middlewares/authGuard'
import authRoutes from './routes/AuthController'
import userRoutes from './routes/UserController'
import carparkRoutes from './routes/CarparkController'
import weatherRoutes from './routes/WeatherController'
import healthRoutes from './routes/health.routes'
export function createServer() {
const app = express()
app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/auth', authRoutes)
app.use('/user', authGuard, userRoutes)
app.use('/carparks', authGuard, carparkRoutes)
app.use('/weather', authGuard, weatherRoutes)
app.use('/', healthRoutes) // Health check doesn't need auth
app.use(errorHandler)
return app
}