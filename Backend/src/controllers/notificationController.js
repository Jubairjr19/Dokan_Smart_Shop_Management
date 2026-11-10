import { z } from 'zod'
import { prisma } from '../config/db.js'
import { ApiError } from '../utils/ApiError.js'
import { parsePagination, validate } from '../utils/validate.js'

const TYPES = ['LOW_STOCK', 'DEBT_DUE', 'SUPPLIER_DUE', 'REORDER', 'PAYMENT_RECEIVED']

const createSchema = z.object({
  type: z.enum(TYPES),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(500),
  link: z.string().trim().max(300).optional(),
})
const readSchema = z.object({ isRead: z.boolean().optional() })
const listQuery = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  type: z.enum(TYPES).optional(),
})

export async function listNotifications(req, res) {
  const filters = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const accountId = req.account.id
  const where = {
    accountId,
    type: filters.type,
    ...(filters.isRead ? { isRead: filters.isRead === 'true' } : {}),
  }
  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { accountId, isRead: false } }),
  ])
  res.json({ data: notifications, pagination: meta(total), unread })
}

export async function createNotification(req, res) {
  const body = validate(createSchema, req.body)
  const notification = await prisma.notification.create({ data: { ...body, accountId: req.account.id } })
  res.status(201).json({ data: notification })
}

/** Sets the read state from { isRead }. With an empty body it flips the current state. */
export async function markRead(req, res) {
  const { isRead } = validate(readSchema, req.body)
  const current = await prisma.notification.findFirst({ where: { id: req.params.id, accountId: req.account.id } })
  if (!current) throw ApiError.notFound('Notification')
  const updated = await prisma.notification.update({
    where: { id: current.id },
    data: { isRead: isRead ?? !current.isRead },
  })
  res.json({ data: updated })
}

export async function markAllRead(req, res) {
  const { count } = await prisma.notification.updateMany({
    where: { accountId: req.account.id, isRead: false },
    data: { isRead: true },
  })
  res.json({ data: { updated: count } })
}

export async function deleteNotification(req, res) {
  const { count } = await prisma.notification.deleteMany({ where: { id: req.params.id, accountId: req.account.id } })
  if (!count) throw ApiError.notFound('Notification')
  res.json({ data: { deleted: true } })
}
