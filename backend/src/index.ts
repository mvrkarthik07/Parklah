import { createServer } from './server'
import { env } from './config/env'
const app = createServer()
app.listen(env.PORT, () => console.log(`API on :${env.PORT}`))
import { initCarparkMetaFromCsv } from './adapters/HDBCarparkAdapter';
initCarparkMetaFromCsv();
