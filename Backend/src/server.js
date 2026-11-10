import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './config/db.js'
import { assertServerConfig, config } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import accountRoutes from './routes/accountRoutes.js'
import authRoutes from './routes/authRoutes.js'
import creditRoutes from './routes/creditRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import { paymentRouter, webhookRouter } from './routes/paymentRoutes.js'
import productRoutes from './routes/productRoutes.js'
import purchaseRoutes from './routes/purchaseRoutes.js'
import salesRoutes from './routes/salesRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import supplierRoutes from './routes/supplierRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'

assertServerConfig()

const app = express()

app.set('trust proxy', config.trustProxy)
app.use(helmet())
app.use(cors({ origin: config.corsOrigins }))
app.use(
  express.json({
    limit: '2mb',
    // Webhook signatures are computed over the exact bytes received.
    verify: (req, res, buffer) => {
      req.rawBody = buffer
    },
  }),
)

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok' })
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/purchases', purchaseRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/customers', creditRoutes)
app.use('/api/credit', creditRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/payments', paymentRouter)
app.use('/api/webhooks', webhookRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(config.port, () => {
  console.log(`Dokan API running at http://localhost:${config.port} (SMS: ${config.smsMode})`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other program or change PORT in .env.`)
  } else {
    console.error(error)
  }
  process.exit(1)
})

async function shutdown() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
