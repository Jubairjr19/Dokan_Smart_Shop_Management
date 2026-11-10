import { z } from 'zod'
import { prisma } from '../config/db.js'
import { inventorySummary } from '../services/stockService.js'
import { addDays, startOfDay } from '../utils/dates.js'
import { computeCapital, computeFinance, SUPPLIER_PAYMENT_CATEGORY } from '../utils/finance.js'
import { round2 } from '../utils/money.js'
import { validate } from '../utils/validate.js'

/** Percent change, or null when there is nothing to compare with. */
function percentChange(current, previous) {
  if (!previous) return null
  return round2(((current - previous) / Math.abs(previous)) * 100)
}

export async function metrics(req, res) {
  const { id: accountId, businessCapital } = req.account
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const thisWeekStart = addDays(today, -6)
  const lastWeekStart = addDays(today, -13)

  const [finance, thisWeek, lastWeek, inventory, receivable, supplierDue, collected, unread] = await Promise.all([
    computeFinance(accountId),
    computeFinance(accountId, { from: thisWeekStart, to: tomorrow }),
    computeFinance(accountId, { from: lastWeekStart, to: thisWeekStart }),
    inventorySummary(accountId),
    prisma.customer.aggregate({ where: { accountId }, _sum: { totalCreditDue: true } }),
    prisma.purchase.aggregate({ where: { accountId }, _sum: { dueAmount: true } }),
    prisma.transaction.aggregate({ where: { accountId, type: 'DEBT_PAYMENT' }, _sum: { amount: true } }),
    prisma.notification.count({ where: { accountId, isRead: false } }),
  ])

  res.json({
    data: {
      ...finance,
      businessCapital: computeCapital(businessCapital, finance.netProfit),
      configuredCapital: businessCapital,
      profitMargin: finance.totalRevenue ? round2((finance.netProfit / finance.totalRevenue) * 100) : 0,
      receivable: round2(receivable._sum.totalCreditDue ?? 0),
      supplierDue: round2(supplierDue._sum.dueAmount ?? 0),
      debtCollected: round2(collected._sum.amount ?? 0),
      unreadNotifications: unread,
      inventory,
      weekOverWeek: {
        thisWeek,
        lastWeek,
        revenueChange: percentChange(thisWeek.totalRevenue, lastWeek.totalRevenue),
        expenseChange: percentChange(thisWeek.totalExpense, lastWeek.totalExpense),
        netProfitChange: percentChange(thisWeek.netProfit, lastWeek.netProfit),
      },
    },
  })
}

const HOUR_LABELS = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM']

/** The time buckets for each chart. Every bucket runs from `start` up to, not including, `end`. */
function buildPeriods() {
  const today = startOfDay()
  const dayBucket = (offset, length, label) => ({ label, start: addDays(today, offset), end: addDays(today, offset + length) })

  return {
    daily: {
      label: 'Today',
      previous: 'yesterday',
      buckets: HOUR_LABELS.map((label, index) => {
        const start = new Date(today)
        start.setHours(index * 3)
        const end = new Date(today)
        end.setHours((index + 1) * 3)
        return { label, start, end }
      }),
      previousRange: { start: addDays(today, -1), end: today },
    },
    weekly: {
      label: 'Weekly',
      previous: 'last week',
      buckets: [-6, -5, -4, -3, -2, -1, 0].map((offset) =>
        dayBucket(offset, 1, addDays(today, offset).toLocaleDateString('en-US', { weekday: 'short' })),
      ),
      previousRange: { start: addDays(today, -13), end: addDays(today, -6) },
    },
    monthly: {
      label: 'Monthly',
      previous: 'last month',
      buckets: [1, 2, 3, 4].map((week) => dayBucket(-34 + week * 7, 7, `Week ${week}`)),
      previousRange: { start: addDays(today, -55), end: addDays(today, -27) },
    },
  }
}

const within = (row, { start, end }) => row.createdAt >= start && row.createdAt < end
const sumWithin = (rows, range) => round2(rows.filter((row) => within(row, range)).reduce((sum, row) => sum + row.amount, 0))

const chartsQuery = z.object({ period: z.enum(['daily', 'weekly', 'monthly']).optional() })

/** Revenue and expense series ready for Chart.js: `labels` plus one array per dataset. */
export async function charts(req, res) {
  const { period } = validate(chartsQuery, req.query)
  const accountId = req.account.id
  const createdAt = { gte: addDays(startOfDay(), -55) }

  const [sales, purchases, operational] = await Promise.all([
    prisma.sale.findMany({ where: { accountId, createdAt }, select: { totalAmount: true, createdAt: true } }),
    prisma.purchase.findMany({ where: { accountId, createdAt }, select: { totalAmount: true, createdAt: true } }),
    prisma.transaction.findMany({
      where: { accountId, createdAt, type: 'EXPENSE', category: { not: SUPPLIER_PAYMENT_CATEGORY } },
      select: { amount: true, createdAt: true },
    }),
  ])

  const revenueRows = sales.map((row) => ({ amount: row.totalAmount, createdAt: row.createdAt }))
  const expenseRows = [...purchases.map((row) => ({ amount: row.totalAmount, createdAt: row.createdAt })), ...operational]

  const build = ({ label, previous, buckets, previousRange }) => {
    const revenue = buckets.map((bucket) => sumWithin(revenueRows, bucket))
    const expense = buckets.map((bucket) => sumWithin(expenseRows, bucket))
    const total = (list) => round2(list.reduce((sum, value) => sum + value, 0))
    const whole = { start: buckets[0].start, end: buckets.at(-1).end }
    return {
      label,
      previous,
      labels: buckets.map((bucket) => bucket.label),
      revenue,
      expense,
      totalRevenue: total(revenue),
      totalExpense: total(expense),
      previousRevenue: sumWithin(revenueRows, previousRange),
      orders: revenueRows.filter((row) => within(row, whole)).length,
    }
  }

  const periods = buildPeriods()
  if (period) {
    res.json({ data: build(periods[period]) })
    return
  }
  res.json({ data: { daily: build(periods.daily), weekly: build(periods.weekly), monthly: build(periods.monthly) } })
}

const topProductsQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(5) })

export async function topProducts(req, res) {
  const { limit } = validate(topProductsQuery, req.query)
  const accountId = req.account.id
  const today = startOfDay()

  const unitsBetween = (from, to) =>
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { accountId, createdAt: { gte: from, lt: to } } },
      _sum: { quantity: true },
    })

  const [ranked, thisWeek, lastWeek] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { accountId } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    }),
    unitsBetween(addDays(today, -6), addDays(today, 1)),
    unitsBetween(addDays(today, -13), addDays(today, -6)),
  ])

  const products = await prisma.product.findMany({
    where: { id: { in: ranked.map((row) => row.productId) } },
    select: { id: true, productName: true, category: true, sellingPrice: true },
  })
  const unitsOf = (list, id) => list.find((row) => row.productId === id)?._sum.quantity ?? 0

  res.json({
    data: ranked.map((row) => ({
      ...products.find((product) => product.id === row.productId),
      unitsSold: row._sum.quantity,
      revenue: round2(row._sum.subtotal),
      trend: percentChange(unitsOf(thisWeek, row.productId), unitsOf(lastWeek, row.productId)),
    })),
  })
}
