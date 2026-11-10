import { prisma } from '../config/db.js'
import { clearAlerts, createAlert } from './notificationService.js'

/** The account's stock rules, in the form syncStockStatus expects. */
export async function stockRules(tx, account) {
  const settings = await tx.setting.findUnique({ where: { accountId: account.id }, select: { lowStockAlerts: true } })
  return { threshold: account.lowStockThreshold, alertsEnabled: settings?.lowStockAlerts ?? true }
}

/** Live totals for the Inventory page. They are computed on request, so they can never drift. */
export async function inventorySummary(accountId) {
  const where = { accountId, deletedAt: null }
  const [[totals], groups] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS "totalProducts",
             COALESCE(SUM("stockQty"), 0)::int AS "totalStockQty",
             COALESCE(SUM("stockQty" * "buyingPrice"), 0)::float8 AS "inventoryValue"
      FROM "Product"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL`,
    prisma.product.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ])
  const count = (status) => groups.find((group) => group.status === status)?._count._all ?? 0
  return { ...totals, inStock: count('IN_STOCK'), lowStock: count('LOW_STOCK'), outOfStock: count('OUT_OF_STOCK') }
}

export function stockStatus(stockQty, threshold) {
  if (stockQty <= 0) return 'OUT_OF_STOCK'
  if (stockQty <= threshold) return 'LOW_STOCK'
  return 'IN_STOCK'
}

/**
 * Brings a product's status in line with its quantity after any stock change. An alert is
 * raised only when the status changes, so each sale of a low item does not raise another.
 * `previousStatus` is null for a newly created product.
 */
export async function syncStockStatus(tx, product, previousStatus, { threshold, alertsEnabled }) {
  const status = stockStatus(product.stockQty, threshold)
  if (status !== product.status) {
    await tx.product.update({ where: { id: product.id }, data: { status } })
  }

  if (status !== previousStatus) {
    const link = `/inventory?q=${encodeURIComponent(product.productName)}`
    if (previousStatus && previousStatus !== 'IN_STOCK') {
      await clearAlerts(tx, product.accountId, 'LOW_STOCK', product.id)
      await clearAlerts(tx, product.accountId, 'REORDER', product.id)
    }
    if (alertsEnabled && status === 'LOW_STOCK') {
      await createAlert(tx, product.accountId, {
        type: 'LOW_STOCK',
        title: 'Low stock alert',
        message: `${product.productName} has only ${product.stockQty} units left.`,
        entityId: product.id,
        link,
      })
    }
    if (alertsEnabled && status === 'OUT_OF_STOCK') {
      await createAlert(tx, product.accountId, {
        type: 'REORDER',
        title: 'Reorder reminder',
        message: `${product.productName} has run out and needs reordering.`,
        entityId: product.id,
        link,
      })
    }
  }

  return { ...product, status }
}

/** Recalculates every product's status after an account's low-stock threshold changes. */
export async function recalculateStatuses(tx, accountId, threshold) {
  const scope = { accountId, deletedAt: null }
  await tx.product.updateMany({ where: { ...scope, stockQty: { lte: 0 } }, data: { status: 'OUT_OF_STOCK' } })
  await tx.product.updateMany({ where: { ...scope, stockQty: { gt: 0, lte: threshold } }, data: { status: 'LOW_STOCK' } })
  await tx.product.updateMany({ where: { ...scope, stockQty: { gt: threshold } }, data: { status: 'IN_STOCK' } })
}
