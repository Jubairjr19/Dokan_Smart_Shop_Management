import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { clearAlerts } from '../services/notificationService.js'
import { inventorySummary, stockRules, stockStatus, syncStockStatus } from '../services/stockService.js'
import { resolveSupplierId, supplierRef } from '../services/supplierService.js'
import { ApiError } from '../utils/ApiError.js'
import { money, parsePagination, validate } from '../utils/validate.js'

const productFields = {
  productName: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  stockQty: z.number().int().min(0).max(100_000_000),
  buyingPrice: money,
  sellingPrice: money,
}

const createSchema = z.object({ ...productFields, ...supplierRef })
const updateSchema = z.object({ ...productFields, ...supplierRef }).partial()
const importSchema = z.object({ products: z.array(createSchema).min(1).max(5000) })

const listQuery = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
})

const INCLUDE = { supplier: { select: { id: true, name: true } } }

export async function listProducts(req, res) {
  const filters = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const accountId = req.account.id

  const where = {
    accountId,
    deletedAt: null,
    category: filters.category,
    supplierId: filters.supplierId,
    status: filters.status,
    ...(filters.search ? { productName: { contains: filters.search, mode: 'insensitive' } } : {}),
  }

  const [products, total, summary] = await Promise.all([
    prisma.product.findMany({ where, include: INCLUDE, orderBy: [{ createdAt: 'asc' }, { productName: 'asc' }], skip, take }),
    prisma.product.count({ where }),
    inventorySummary(accountId),
  ])
  res.json({ data: products, pagination: meta(total), summary })
}

export async function getProduct(req, res) {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, accountId: req.account.id, deletedAt: null },
    include: INCLUDE,
  })
  if (!product) throw ApiError.notFound('Product')
  res.json({ data: product })
}

async function createOne(tx, account, rules, body) {
  const { supplierId, supplierName, ...fields } = body
  const product = await tx.product.create({
    data: {
      ...fields,
      accountId: account.id,
      supplierId: await resolveSupplierId(tx, account.id, { supplierId, supplierName }),
      status: stockStatus(fields.stockQty, rules.threshold),
    },
  })
  // Passing null as the previous status raises an alert if it starts out low.
  await syncStockStatus(tx, product, null, rules)
  return product
}

export async function createProduct(req, res) {
  const body = validate(createSchema, req.body)
  const created = await withTransaction(async (tx) => createOne(tx, req.account, await stockRules(tx, req.account), body))
  const [product, summary] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: created.id }, include: INCLUDE }),
    inventorySummary(req.account.id),
  ])
  res.status(201).json({ data: product, summary })
}

/** Bulk creation for the Inventory page's CSV import. All rows are saved, or none are. */
export async function importProducts(req, res) {
  const { products } = validate(importSchema, req.body)
  const created = await prisma.$transaction(
    async (tx) => {
      const rules = await stockRules(tx, req.account)
      let count = 0
      for (const body of products) {
        await createOne(tx, req.account, rules, body)
        count += 1
      }
      return count
    },
    { maxWait: 10_000, timeout: 120_000 },
  )
  res.status(201).json({ data: { imported: created }, summary: await inventorySummary(req.account.id) })
}

export async function updateProduct(req, res) {
  const { supplierId, supplierName, ...fields } = validate(updateSchema, req.body)
  const account = req.account

  await withTransaction(async (tx) => {
    const current = await tx.product.findFirst({ where: { id: req.params.id, accountId: account.id, deletedAt: null } })
    if (!current) throw ApiError.notFound('Product')

    const updated = await tx.product.update({
      where: { id: current.id },
      data: {
        ...fields,
        ...(supplierId || supplierName ? { supplierId: await resolveSupplierId(tx, account.id, { supplierId, supplierName }) } : {}),
      },
    })
    await syncStockStatus(tx, updated, current.status, await stockRules(tx, account))
  })

  const [product, summary] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: req.params.id }, include: INCLUDE }),
    inventorySummary(account.id),
  ])
  res.json({ data: product, summary })
}

/** Removes the product from the shop while past invoices and purchases keep their reference to it. */
export async function deleteProduct(req, res) {
  const accountId = req.account.id
  await withTransaction(async (tx) => {
    const { count } = await tx.product.updateMany({
      where: { id: req.params.id, accountId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (!count) throw ApiError.notFound('Product')
    await clearAlerts(tx, accountId, 'LOW_STOCK', req.params.id)
    await clearAlerts(tx, accountId, 'REORDER', req.params.id)
  })
  res.json({ data: { deleted: true }, summary: await inventorySummary(accountId) })
}
