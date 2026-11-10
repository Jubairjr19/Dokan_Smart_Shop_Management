import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { addCustomerCredit, settleCustomerDebt } from '../services/creditService.js'
import { sendSms } from '../services/smsService.js'
import { ApiError } from '../utils/ApiError.js'
import { addDays, daysUntil } from '../utils/dates.js'
import { taka } from '../utils/money.js'
import { isoDate, money, paymentChannel, parsePagination, positiveMoney, validate } from '../utils/validate.js'

const DEFAULT_CREDIT_DAYS = 7
const SOON_DAYS = 3

const name = z.string().trim().min(1).max(120)
const phone = z.string().trim().max(30)

const createSchema = z.object({
  name,
  phone: phone.default(''),
  openingCredit: money.default(0),
  dueDate: isoDate.optional(),
  note: z.string().trim().max(200).default('Opening balance'),
})
const updateSchema = z.object({ name, phone, dueDate: isoDate }).partial()
const addCreditSchema = z.object({
  amount: positiveMoney,
  dueDate: isoDate.optional(),
  note: z.string().trim().max(200).default('Credit added'),
})
const payDebtSchema = z.object({ amount: positiveMoney, method: paymentChannel.default('CASH') })
const reminderSchema = z.object({ body: z.string().trim().min(1).max(1000).optional() })
const listQuery = z.object({
  search: z.string().trim().optional(),
  withDebt: z.enum(['true', 'false']).optional(),
})

function creditStatus(customer) {
  if (customer.totalCreditDue <= 0) return 'SETTLED'
  if (!customer.dueDate) return 'OPEN'
  const days = daysUntil(customer.dueDate)
  if (days < 0) return 'OVERDUE'
  return days <= SOON_DAYS ? 'DUE_SOON' : 'OPEN'
}

const serialize = (customer) => ({ ...customer, creditStatus: creditStatus(customer) })

async function findCustomer(client, req) {
  const customer = await client.customer.findFirst({ where: { id: req.params.id, accountId: req.account.id } })
  if (!customer) throw ApiError.notFound('Customer')
  return customer
}

async function remindersEnabled(tx, accountId) {
  const settings = await tx.setting.findUnique({ where: { accountId }, select: { paymentReminders: true } })
  return settings?.paymentReminders ?? true
}

export async function listCustomers(req, res) {
  const filters = validate(listQuery, req.query)
  const { skip, take, meta } = parsePagination(req.query)
  const accountId = req.account.id
  const where = {
    accountId,
    ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    ...(filters.withDebt === 'true' ? { totalCreditDue: { gt: 0 } } : {}),
    ...(filters.withDebt === 'false' ? { totalCreditDue: { lte: 0 } } : {}),
  }
  const [customers, total, totals] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { name: 'asc' }, include: { ledger: { orderBy: { createdAt: 'asc' } } }, skip, take }),
    prisma.customer.count({ where }),
    prisma.customer.aggregate({ where: { accountId }, _sum: { totalCreditDue: true } }),
  ])
  res.json({
    data: customers.map(serialize),
    pagination: meta(total),
    summary: { totalOutstanding: totals._sum.totalCreditDue ?? 0 },
  })
}

export async function getCustomer(req, res) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, accountId: req.account.id },
    include: { ledger: { orderBy: { createdAt: 'asc' } } },
  })
  if (!customer) throw ApiError.notFound('Customer')
  res.json({ data: serialize(customer) })
}

export async function createCustomer(req, res) {
  const { openingCredit, dueDate, note, ...fields } = validate(createSchema, req.body)
  const accountId = req.account.id

  const customer = await withTransaction(async (tx) => {
    const created = await tx.customer.create({ data: { ...fields, accountId } })
    if (openingCredit === 0) return created
    return addCustomerCredit(tx, created, {
      amount: openingCredit,
      dueDate: dueDate ?? addDays(new Date(), DEFAULT_CREDIT_DAYS),
      note,
      alertsEnabled: await remindersEnabled(tx, accountId),
    })
  })
  res.status(201).json({ data: serialize(customer) })
}

export async function updateCustomer(req, res) {
  const body = validate(updateSchema, req.body)
  const customer = await findCustomer(prisma, req)
  const updated = await prisma.customer.update({ where: { id: customer.id }, data: body })
  res.json({ data: serialize(updated) })
}

/** Records credit given outside a sale, such as an old balance from a paper ledger. */
export async function addCredit(req, res) {
  const { amount, dueDate, note } = validate(addCreditSchema, req.body)
  const accountId = req.account.id

  const customer = await withTransaction(async (tx) =>
    addCustomerCredit(tx, await findCustomer(tx, req), {
      amount,
      dueDate: dueDate ?? addDays(new Date(), DEFAULT_CREDIT_DAYS),
      note,
      alertsEnabled: await remindersEnabled(tx, accountId),
    }),
  )
  res.status(201).json({ data: serialize(customer) })
}

export async function payDebt(req, res) {
  const { amount, method } = validate(payDebtSchema, req.body)
  const accountId = req.account.id

  const customer = await withTransaction(async (tx) => {
    const current = await findCustomer(tx, req)
    const updated = await settleCustomerDebt(tx, current, { amount, method })
    await tx.payment.create({
      data: { accountId, customerId: current.id, method, amount, appliedAmount: amount, status: 'SUCCESS' },
    })
    return updated
  })
  res.json({ data: serialize(customer) })
}

function fillTemplate(template, customer, shopName) {
  const date = customer.dueDate ? customer.dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'the agreed date'
  return template
    .replaceAll('{name}', customer.name)
    .replaceAll('{shop}', shopName)
    .replaceAll('{amount}', taka(customer.totalCreditDue))
    .replaceAll('{date}', date)
}

/** Sends the shop's template, or the owner's edited text when the request includes a body. */
export async function sendReminder(req, res) {
  const { body: customBody } = validate(reminderSchema, req.body)
  const account = req.account
  const customer = await findCustomer(prisma, req)
  const settings = await prisma.setting.findUniqueOrThrow({ where: { accountId: account.id } })

  if (!settings.smsEnabled) throw ApiError.conflict('SMS reminders are turned off in Settings.')
  if (!customer.phone) throw ApiError.badRequest('This customer has no phone number.')
  if (customer.totalCreditDue <= 0) throw ApiError.conflict('This customer has nothing outstanding.')

  const body = customBody ?? fillTemplate(settings.smsTemplate, customer, account.shopName)
  const base = { accountId: account.id, customerId: customer.id, to: customer.phone, body }

  let result
  try {
    result = await sendSms({ to: customer.phone, body })
  } catch (error) {
    console.error('SMS failed:', error.message)
    await prisma.smsMessage.create({ data: { ...base, status: 'failed', simulated: false } })
    throw new ApiError(502, 'SMS_FAILED', 'The SMS provider could not send this message.')
  }

  const [message] = await prisma.$transaction([
    prisma.smsMessage.create({ data: { ...base, ...result } }),
    prisma.customer.update({ where: { id: customer.id }, data: { lastReminderSentAt: new Date() } }),
  ])
  res.status(201).json({ data: message })
}

export async function smsLog(req, res) {
  const { skip, take, meta } = parsePagination(req.query)
  const where = { accountId: req.account.id }
  const [messages, total] = await Promise.all([
    prisma.smsMessage.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.smsMessage.count({ where }),
  ])
  res.json({ data: messages, pagination: meta(total) })
}
