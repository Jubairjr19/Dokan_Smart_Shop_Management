import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { addCustomerCredit } from '../services/creditService.js'
import { stockRules, syncStockStatus } from '../services/stockService.js'
import { ApiError } from '../utils/ApiError.js'
import { addDays } from '../utils/dates.js'
import { round2 } from '../utils/money.js'
import { nextSaleNumber } from '../utils/sequence.js'
import { isoDate, money, parsePagination, quantity, validate } from '../utils/validate.js'

const DEFAULT_CREDIT_DAYS = 7

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity })).min(1),
  customerId: z.string().min(1).optional(),
  newCustomer: z
    .object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).default('') })
    .optional(),
  discount: money.default(0),
  paidAmount: money.optional(),
  paymentMethod: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'UPAY', 'BANGLA_QR', 'CARD', 'CASH', 'CREDIT']).default('CASH'),
  dueDate: isoDate.optional(),
})

const listQuery = z.object({
  customerId: z.string().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

const INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  items: { include: { product: { select: { id: true, productName: true } } } },
}

export async function listSales(req, res) {
  const filters = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const where = {
    accountId: req.account.id,
    customerId: filters.customerId,
    createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
  }
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.sale.count({ where }),
  ])
  res.json({ data: sales, pagination: meta(total) })
}

export async function getSale(req, res) {
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, accountId: req.account.id }, include: INCLUDE })
  if (!sale) throw ApiError.notFound('Sale')
  res.json({ data: sale })
}

/** Adds up repeated lines and sorts by id. A fixed lock order stops two checkouts from deadlocking. */
function normalizeItems(items) {
  const totals = new Map()
  for (const item of items) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity)
  return [...totals.entries()]
    .map(([productId, qty]) => ({ productId, quantity: qty }))
    .sort((a, b) => a.productId.localeCompare(b.productId))
}

/**
 * POS checkout. Prices come from the database, never the request. The stock decrement only
 * matches when enough stock remains, so simultaneous checkouts cannot oversell an item.
 */
export async function createSale(req, res) {
  const body = validate(checkoutSchema, req.body)
  const account = req.account
  const items = normalizeItems(body.items)

  const saleId = await withTransaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, accountId: account.id, deletedAt: null },
    })
    const lines = items.map((item) => {
      const product = products.find((row) => row.id === item.productId)
      if (!product) throw ApiError.notFound(`Product ${item.productId}`)
      return { ...item, product, unitPrice: product.sellingPrice, subtotal: round2(product.sellingPrice * item.quantity) }
    })

    const subtotal = round2(lines.reduce((sum, line) => sum + line.subtotal, 0))
    if (body.discount > subtotal) throw ApiError.badRequest('The discount cannot be more than the subtotal.')
    const totalAmount = round2(subtotal - body.discount)
    const paidAmount = body.paidAmount ?? totalAmount
    if (paidAmount > totalAmount) throw ApiError.badRequest('The paid amount cannot be more than the total.')
    const dueAmount = round2(totalAmount - paidAmount)

    if (paidAmount > 0 && body.paymentMethod === 'CREDIT') {
      throw ApiError.badRequest('Choose how the paid part was received. CREDIT only applies when nothing is paid.')
    }
    let paymentMethod = body.paymentMethod
    if (paidAmount === 0) paymentMethod = dueAmount > 0 ? 'CREDIT' : 'CASH'

    // The customer.
    let customer = null
    if (body.customerId) {
      customer = await tx.customer.findFirst({ where: { id: body.customerId, accountId: account.id } })
      if (!customer) throw ApiError.notFound('Customer')
    } else if (body.newCustomer) {
      customer = await tx.customer.create({ data: { ...body.newCustomer, accountId: account.id } })
    }
    if (dueAmount > 0 && !customer) throw ApiError.badRequest('Choose a customer to sell on credit.')
    if (dueAmount > 0 && !customer.phone) throw ApiError.badRequest('A phone number is needed for payment reminders.')

    // Sales reduce stock.
    const rules = await stockRules(tx, account)
    for (const line of lines) {
      let updated
      try {
        updated = await tx.product.update({
          where: { id: line.productId, accountId: account.id, deletedAt: null, stockQty: { gte: line.quantity } },
          data: { stockQty: { decrement: line.quantity } },
        })
      } catch (error) {
        if (error.code !== 'P2025') throw error
        const left = await tx.product.findUnique({ where: { id: line.productId }, select: { stockQty: true } })
        throw ApiError.conflict(`Only ${left?.stockQty ?? 0} of ${line.product.productName} in stock.`, {
          productId: line.productId,
          available: left?.stockQty ?? 0,
        })
      }
      await syncStockStatus(tx, updated, updated.status, rules)
    }

    const sale = await tx.sale.create({
      data: {
        saleNumber: await nextSaleNumber(tx),
        accountId: account.id,
        customerId: customer?.id,
        totalAmount,
        paidAmount,
        dueAmount,
        discount: body.discount,
        paymentMethod,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
    })

    // Credit sales create customer due records.
    if (dueAmount > 0) {
      const settings = await tx.setting.findUnique({ where: { accountId: account.id }, select: { paymentReminders: true } })
      await addCustomerCredit(tx, customer, {
        amount: dueAmount,
        dueDate: body.dueDate ?? addDays(new Date(), DEFAULT_CREDIT_DAYS),
        note: `Credit sale ${sale.saleNumber}`,
        alertsEnabled: settings?.paymentReminders ?? true,
      })
    }

    // Income records money received. Any credit part is logged when the customer pays it.
    if (paidAmount > 0) {
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: paidAmount,
          category: 'Sales',
          accountId: account.id,
          notes: `Sale ${sale.saleNumber}`,
        },
      })
      await tx.payment.create({
        data: {
          accountId: account.id,
          customerId: customer?.id,
          saleId: sale.id,
          method: paymentMethod,
          amount: paidAmount,
          appliedAmount: paidAmount,
          status: 'SUCCESS',
        },
      })
    }

    return sale.id
  })

  const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId }, include: INCLUDE })
  res.status(201).json({ data: sale })
}
