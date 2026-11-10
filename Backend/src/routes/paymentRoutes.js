import { Router } from 'express'
import { handleWebhook, listPayments } from '../controllers/paymentController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

export const paymentRouter = Router()
paymentRouter.get('/', authenticate, resolveAccount, listPayments)

// Gateways call this directly, so it is authenticated by signature rather than by a user token.
export const webhookRouter = Router()
webhookRouter.post('/payments/:gateway', handleWebhook)
