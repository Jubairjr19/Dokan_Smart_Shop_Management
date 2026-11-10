import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { clearAlerts, replaceAlert } from '../services/notificationService.js'
import { stockRules, syncStockStatus } from '../services/stockService.js'
import { resolveSupplierId, supplierRef } from '../services/supplierService.js'
import { ApiError } from '../utils/ApiError.js'
import { SUPPLIER_PAYMENT_CATEGORY } from '../utils/finance.js'
import { round2, taka } from '../utils/money.js'
import { nextPoNumber } from '../utils/sequence.js'
import { isoDate, money, paymentChannel, parsePagination, positiveMoney, quantity, validate } from '../utils/validate.js'

const createSchema = z.object({
  ...supplierRef,
  items: z.array(z.object({ productId: z.string().min(1), quantity, unitCost: money })).min(1),
  paidAmount: money.default(0),
  date: isoDate.optional(),
})

const payDueSchema = z.object({ amount: positiveMoney, method: paymentChannel.default('CASH') })

const INCLUDE = {
  supplier: { select: { id: true, name: true, phone: true } },
  items: { include: { product: { select: { id: true, productName: true } } } },
}

function purchaseStatus(paidAmount, dueAmount) {
  if (dueAmount <= 0) return 'PAID'
  return paidAmount > 0 ? 'PARTIAL' : 'PENDING'
}

const supplierPaymentLog = (accountId, amount, poNumber, supplierName) => ({
  type: 'EXPENSE',
  amount,
  category: SUPPLIER_PAYMENT_CATEGORY,
  accountId,
  notes: `${poNumber} • ${supplierName}`,
})

export async function listPurchases(req, res) {
  const { skip, take, meta } = parsePagination(req.query)
  const accountId = req.account.id
  const where = { accountId }

  const [purchases, total, totals, unsettled, balances, suppliers] = await Promise.all([
    prisma.purchase.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.purchase.count({ where }),
    prisma.purchase.aggregate({ where, _sum: { totalAmount: true, paidAmount: true, dueAmount: true } }),
    prisma.purchase.count({ where: { accountId, status: { not: 'PAID' } } }),
    prisma.purchase.groupBy({ by: ['supplierId'], where, _sum: { dueAmount: true } }),
    prisma.supplier.findMany({ where: { accountId }, select: { id: true, name: true } }),
  ])

  res.json({
    data: purchases,
    pagination: meta(total),
    summary: {
      totalPurchases: round2(totals._sum.totalAmount ?? 0),
      paid: round2(totals._sum.paidAmount ?? 0),
      pending: unsettled,
      supplierDue: round2(totals._sum.dueAmount ?? 0),
    },
    supplierBalances: suppliers.map((supplier) => ({
      ...supplier,
      due: round2(balances.find((row) => row.supplierId === supplier.id)?._sum.dueAmount ?? 0),
    })),
  })
}

export async function getPurchase(req, res) {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, accountId: req.account.id }, include: INCLUDE })
  if (!purchase) throw ApiError.notFound('Purchase')
  res.json({ data: purchase })
}

/**
 * Records a purchase order. Purchases increase stock and move each product's buying price to
 * the latest cost. Sorting by product id keeps lock order the same as checkout, avoiding deadlocks.
 */
export async function createPurchase(req, res) {
  const body = validate(createSchema, req.body)
  const account = req.account
  const lines = body.items
    .map((item) => ({ ...item, subtotal: round2(item.quantity * item.unitCost) }))
    .sort((a, b) => a.productId.localeCompare(b.productId))

  const totalAmount = round2(lines.reduce((sum, line) => sum + line.subtotal, 0))
  if (body.paidAmount > totalAmount) throw ApiError.badRequest('The paid amount cannot be more than the total.')
  const dueAmount = round2(totalAmount - body.paidAmount)
  if (body.date && body.date > new Date()) throw ApiError.badRequest('The purchase date cannot be in the future.')

  const purchaseId = await withTransaction(async (tx) => {
    const supplierId = await resolveSupplierId(tx, account.id, body)
    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: supplierId } })
    const rules = await stockRules(tx, account)

    for (const line of lines) {
      let updated
      try {
        updated = await tx.product.update({
          where: { id: line.productId, accountId: account.id, deletedAt: null },
          data: { stockQty: { increment: line.quantity }, buyingPrice: line.unitCost },
        })
      } catch (error) {
        if (error.code === 'P2025') throw ApiError.notFound(`Product ${line.productId}`)
        throw error
      }
      await syncStockStatus(tx, updated, updated.status, rules)
    }

    const poNumber = await nextPoNumber(tx)
    const purchase = await tx.purchase.create({
      data: {
        poNumber,
        accountId: account.id,
        supplierId,
        itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        totalAmount,
        paidAmount: body.paidAmount,
        dueAmount,
        status: purchaseStatus(body.paidAmount, dueAmount),
        createdAt: body.date,
        items: {
          create: lines.map(({ productId, quantity: qty, unitCost, subtotal }) => ({ productId, quantity: qty, unitCost, subtotal })),
        },
      },
    })

    if (body.paidAmount > 0) {
      await tx.transaction.create({ data: supplierPaymentLog(account.id, body.paidAmount, poNumber, supplier.name) })
    }

    if (dueAmount > 0) {
      const settings = await tx.setting.findUnique({ where: { accountId: account.id }, select: { paymentReminders: true } })
      if (settings?.paymentReminders) {
        await replaceAlert(tx, account.id, {
          type: 'SUPPLIER_DUE',
          title: 'Supplier payment reminder',
          message: `${supplier.name} • ${taka(dueAmount)} due on ${poNumber}`,
          entityId: purchase.id,
          link: `/purchases?view=${poNumber}`,
        })
      }
    }

    return purchase.id
  })

  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId }, include: INCLUDE })
  res.status(201).json({ data: purchase })
}

/**
 * Pays down a supplier due. The update only matches while enough is still owed, so two
 * simultaneous payments cannot overpay the order.
 */
export async function payDue(req, res) {
  const { amount, method } = validate(payDueSchema, req.body)
  const accountId = req.account.id

  const purchaseId = await withTransaction(async (tx) => {
    const current = await tx.purchase.findFirst({
      where: { id: req.params.id, accountId },
      include: { supplier: { select: { name: true } } },
    })
    if (!current) throw ApiError.notFound('Purchase')

    let locked
    try {
      locked = await tx.purchase.update({
        where: { id: current.id, dueAmount: { gte: amount } },
        data: { dueAmount: { decrement: amount }, paidAmount: { increment: amount } },
      })
    } catch (error) {
      if (error.code === 'P2025') throw ApiError.conflict(`Payment is more than the ${taka(current.dueAmount)} still due.`)
      throw error
    }

    const dueAmount = round2(locked.dueAmount)
    const paidAmount = round2(locked.paidAmount)
    await tx.purchase.update({
      where: { id: current.id },
      data: { dueAmount, paidAmount, status: purchaseStatus(paidAmount, dueAmount) },
    })

    await tx.transaction.create({
      data: {
        ...supplierPaymentLog(accountId, amount, current.poNumber, current.supplier.name),
        notes: `${current.poNumber} • ${current.supplier.name} • paid via ${method}`,
      },
    })

    if (dueAmount === 0) await clearAlerts(tx, accountId, 'SUPPLIER_DUE', current.id)
    return current.id
  })

  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId }, include: INCLUDE })
  res.json({ data: purchase })
}
