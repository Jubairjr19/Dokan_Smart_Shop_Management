import crypto from 'node:crypto'
import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { config } from '../config/env.js'
import { settleCustomerDebt } from '../services/creditService.js'
import { ApiError } from '../utils/ApiError.js'
import { round2 } from '../utils/money.js'
import { parsePagination, positiveMoney, validate } from '../utils/validate.js'

const GATEWAYS = {
  bkash: 'BKASH',
  nagad: 'NAGAD',
  rocket: 'ROCKET',
  upay: 'UPAY',
  'bangla-qr': 'BANGLA_QR',
  card: 'CARD',
}

const webhookSchema = z.object({
  transactionId: z.string().trim().min(1).max(120),
  status: z.enum(['SUCCESS', 'FAILED', 'CANCELLED']),
  amount: positiveMoney,
  customerId: z.string().min(1),
})

const listQuery = z.object({
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional(),
})

/** Checks the HMAC-SHA256 of the exact request bytes, in constant time. */
function assertValidSignature(req) {
  if (!config.paymentWebhookSecret) {
    throw new ApiError(503, 'WEBHOOKS_DISABLED', 'PAYMENT_WEBHOOK_SECRET is not set on the server.')
  }
  const expected = crypto.createHmac('sha256', config.paymentWebhookSecret).update(req.rawBody ?? '').digest()
  const received = Buffer.from(req.get('x-dokan-signature') ?? '', 'hex')
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw ApiError.unauthorized('Invalid webhook signature.')
  }
}

/**
 * Receives a payment result from a gateway. Gateways retry deliveries, so handling must be
 * idempotent: the payment row is claimed under a lock, and a transaction id that has already
 * succeeded never settles debt a second time. A failed attempt may later succeed.
 */
export async function handleWebhook(req, res) {
  const method = GATEWAYS[req.params.gateway]
  if (!method) throw ApiError.notFound('Payment gateway')
  assertValidSignature(req)

  const body = validate(webhookSchema, req.body)
  const { transactionId: gatewayTxnId, status, amount } = body

  const result = await withTransaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: body.customerId } })
    if (!customer) throw ApiError.notFound('Customer')

    await tx.payment.createMany({
      data: [{ accountId: customer.accountId, customerId: customer.id, method, gatewayTxnId, amount, status: 'PENDING' }],
      skipDuplicates: true,
    })
    const claim = await tx.payment.updateMany({
      where: { method, gatewayTxnId, status: { not: 'SUCCESS' } },
      data: { status },
    })
    if (claim.count === 0) return { duplicate: true, status: 'SUCCESS', appliedAmount: 0 }
    if (status !== 'SUCCESS') return { duplicate: false, status, appliedAmount: 0 }

    // Money has already moved at the gateway, so an overpayment is recorded and only the owed part applied.
    const current = await tx.customer.findUniqueOrThrow({ where: { id: customer.id } })
    const appliedAmount = round2(Math.min(amount, current.totalCreditDue))
    if (appliedAmount > 0) await settleCustomerDebt(tx, current, { amount: appliedAmount, method })
    await tx.payment.updateMany({ where: { method, gatewayTxnId }, data: { appliedAmount } })

    return { duplicate: false, status, appliedAmount }
  })

  res.json({ data: { received: true, ...result } })
}

/** Payment history for the current branch (SRS FR-15). */
export async function listPayments(req, res) {
  const filters = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const where = { accountId: req.account.id, ...filters }
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.payment.count({ where }),
  ])
  res.json({ data: payments, pagination: meta(total) })
}
