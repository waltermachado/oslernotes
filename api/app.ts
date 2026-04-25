import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import webhookRoutes from './routes/webhooks.js'
import subscriptionRoutes from './routes/subscriptions.js'
import patientRoutes from './routes/patients.js'
import queueRoutes from './routes/queue.js'
import { buildOpenApiSpec } from './swagger.js'

dotenv.config()

const app = express()

app.use(cors())

app.use('/api/webhooks', webhookRoutes)

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/queue', queueRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const openApiSpec = buildOpenApiSpec('/api')
app.get('/api/docs-json', (_req, res) => res.json(openApiSpec))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))

export default app
