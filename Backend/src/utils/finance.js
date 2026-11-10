import { prisma } from '../config/db.js'
import { round2 } from './money.js'

/**
 * Supplier payments are logged as EXPENSE transactions for the cash record, but the
 * purchase's full total already counts as an expense when it is created. This category
 * keeps them out of the operational expense sum, so nothing is counted twice.
 */
export const SUPPLIER_PAYMENT_CATEGORY = 'Supplier Payment'

/**
 * Business Capital = Configured Account Capital + Net Profit
 * Net profit is revenue minus expenses, so each expense counts exactly once.
 * This is the only place capital is computed.
 */
export function computeCapital(configuredCapital, netProfit) {
  return round2(configuredCapital + netProfit)
}

/** Revenue, expense and profit for an account, optionally limited to a date range. */
export async function computeFinance(accountId, range) {
  const createdAt = range ? { gte: range.from, lt: range.to } : undefined

  const [sales, purchases, operational] = await Promise.all([
    prisma.sale.aggregate({ where: { accountId, createdAt }, _sum: { totalAmount: true } }),
    prisma.purchase.aggregate({ where: { accountId, createdAt }, _sum: { totalAmount: true } }),
    prisma.transaction.aggregate({
      where: { accountId, createdAt, type: 'EXPENSE', category: { not: SUPPLIER_PAYMENT_CATEGORY } },
      _sum: { amount: true },
    }),
  ])

  const totalRevenue = round2(sales._sum.totalAmount ?? 0)
  const purchaseExpense = round2(purchases._sum.totalAmount ?? 0)
  const operationalExpense = round2(operational._sum.amount ?? 0)
  const totalExpense = round2(purchaseExpense + operationalExpense)

  return { totalRevenue, purchaseExpense, operationalExpense, totalExpense, netProfit: round2(totalRevenue - totalExpense) }
}
