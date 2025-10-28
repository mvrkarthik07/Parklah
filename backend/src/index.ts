import express from 'express'
import cors from 'cors'
import carparkRoutes from './routes/CarparkController'

const app = express()
app.use(cors({ origin: (o,cb)=>cb(null,true) }))
app.use(express.json())

// THIS is what makes `/carparks/...` work
app.use('/carparks', carparkRoutes)

app.listen(8080, () => console.log('API on :8080'))
