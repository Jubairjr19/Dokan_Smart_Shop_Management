import { z } from 'zod'
import { prisma } from '../config/db.js'
import { ApiError } from '../utils/ApiError.js'
import { SUPPLIER_PAYMENT_CATEGORY } from '../utils/finance.js'
import { isoDate, parsePagination, positiveMoney, validate } from '../utils/validate.js'

const expenseSchema = z.object({
  amount: positiveMoney,
  category: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).optional(),
  date: isoDate.optional(),
})
const listQuery = z.object({ type: z.enum(['INCOME', 'EXPENSE', 'DEBT_PAYMENT', 'SUPPLIER_PAYMENT']).optional() })

export async function listTransactions(req, res) {
  const { type } = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const where = { accountId: req.account.id, type }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.transaction.count({ where }),
  ])
  res.json({ data: transactions, pagination: meta(total) })
}

/**
 * Records an operational expense such as rent or electricity. Other transaction types are
 * logged automatically by sales, purchases and debt payments, so they cannot be added by hand.
 */
export async function createExpense(req, res) {
  const { date, ...body } = validate(expenseSchema, req.body)
  if (body.category === SUPPLIER_PAYMENT_CATEGORY) {
    throw ApiError.badRequest('Record supplier payments through the purchase order.')
  }
  const transaction = await prisma.transaction.create({
    data: { ...body, type: 'EXPENSE', accountId: req.account.id, createdAt: date },
  })
  res.status(201).json({ data: transaction })
}
