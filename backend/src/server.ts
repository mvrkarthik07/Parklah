import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { authGuard } from './middlewares/authGuard.js'
import authRoutes from './routes/AuthController.js'
import userRoutes from './routes/UserController.js'
import carparkRoutes from './routes/CarparkController.js'
import weatherRoutes from './routes/WeatherController.js'
import healthRoutes from './routes/health.routes.js'
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