import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { createAccount } from '../services/accountService.js'
import { recalculateStatuses } from '../services/stockService.js'
import { ApiError } from '../utils/ApiError.js'
import { money, validate } from '../utils/validate.js'

const threshold = z.number().int().min(0).max(1_000_000)

const accountFields = {
  shopName: z.string().trim().min(1).max(160),
  ownerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
  businessCapital: money,
  lowStockThreshold: threshold,
  currency: z.string().trim().min(3).max(3).toUpperCase(),
}

const createAccountSchema = z.object({
  shopName: accountFields.shopName,
  ownerName: accountFields.ownerName,
  phone: accountFields.phone.default(''),
  businessCapital: accountFields.businessCapital.optional(),
  lowStockThreshold: accountFields.lowStockThreshold.optional(),
  currency: accountFields.currency.optional(),
})

const updateAccountSchema = z.object(accountFields).partial()

const paymentMethodSchema = z.object({
  enabled: z.boolean().optional(),
  account: z.string().trim().max(200).optional(),
  label: z.string().trim().max(60).optional(),
  apiKey: z.string().trim().max(500).optional(),
})

const updateSettingsSchema = z.object({
  shop: z
    .object({
      name: accountFields.shopName,
      ownerName: accountFields.ownerName,
      phone: accountFields.phone,
      email: z.string().trim().max(160),
      address: z.string().trim().max(300),
    })
    .partial()
    .optional(),
  sms: z
    .object({
      enabled: z.boolean(),
      beforeDue: z.boolean(),
      overdueDaily: z.boolean(),
      daysBefore: z.number().int().min(0).max(60),
      template: z.string().trim().min(1).max(500),
    })
    .partial()
    .optional(),
  lowStockAlerts: z.boolean().optional(),
  lowStockThreshold: threshold.optional(),
  paymentReminders: z.boolean().optional(),
  twoFactor: z.boolean().optional(),
  compact: z.boolean().optional(),
  paymentMethods: z.record(z.string().max(40), paymentMethodSchema).optional(),
})

/* ---------- Branches ---------- */

export async function listAccounts(req, res) {
  const accounts = await prisma.account.findMany({
    where: { users: { some: { id: req.user.id } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ data: accounts })
}

export async function addAccount(req, res) {
  const body = validate(createAccountSchema, req.body)
  const account = await withTransaction((tx) => createAccount(tx, req.user.id, body))
  res.status(201).json({ data: account })
}

export async function updateAccount(req, res) {
  const body = validate(updateAccountSchema, req.body)
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, users: { some: { id: req.user.id } } },
  })
  if (!account) throw ApiError.notFound('Account')

  const updated = await withTransaction(async (tx) => {
    const saved = await tx.account.update({ where: { id: account.id }, data: body })
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== account.lowStockThreshold) {
      await recalculateStatuses(tx, account.id, body.lowStockThreshold)
    }
    return saved
  })
  res.json({ data: updated })
}

/* ---------- Settings ---------- */

const MASK = '••••'
const maskSecret = (value) => (value ? `${MASK}${value.length > 8 ? value.slice(-4) : ''}` : '')

/** A card API key is held in `account`, because that is the field the Settings page edits. */
const accountIsSecret = (method) => method.label === 'API key'

/** Gateway secrets are never sent back to the browser in full. */
function maskPaymentMethods(methods) {
  return Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
      name,
      {
        ...method,
        ...(accountIsSecret(method) ? { account: maskSecret(method.account) } : {}),
        ...(method.apiKey ? { apiKey: maskSecret(method.apiKey) } : {}),
      },
    ]),
  )
}

/** Merges changes into stored methods. A masked value sent back unchanged keeps the stored secret. */
function mergePaymentMethods(stored, changes) {
  const merged = { ...stored }
  for (const [name, change] of Object.entries(changes)) {
    const next = { ...merged[name], ...change }
    for (const field of ['account', 'apiKey']) {
      if (change[field]?.startsWith(MASK)) next[field] = merged[name]?.[field] ?? ''
    }
    merged[name] = next
  }
  return merged
}

function serializeSettings(account, settings, user) {
  return {
    shop: {
      name: account.shopName,
      ownerName: account.ownerName,
      phone: account.phone,
      email: settings.shopEmail,
      address: settings.shopAddress,
    },
    sms: {
      enabled: settings.smsEnabled,
      beforeDue: settings.smsBeforeDue,
      overdueDaily: settings.smsOverdueDaily,
      daysBefore: settings.smsDaysBefore,
      template: settings.smsTemplate,
    },
    currency: account.currency,
    lowStockAlerts: settings.lowStockAlerts,
    lowStockThreshold: account.lowStockThreshold,
    paymentReminders: settings.paymentReminders,
    twoFactor: user.twoFactorEnabled,
    compact: settings.compact,
    paymentMethods: maskPaymentMethods(settings.paymentMethods),
  }
}

export async function getSettings(req, res) {
  const settings = await prisma.setting.findUniqueOrThrow({ where: { accountId: req.account.id } })
  res.json({ data: serializeSettings(req.account, settings, req.user) })
}

/** Accepts any part of the structure GET returns. */
export async function updateSettings(req, res) {
  const body = validate(updateSettingsSchema, req.body)
  const { account, user } = req

  const result = await withTransaction(async (tx) => {
    const current = await tx.setting.findUniqueOrThrow({ where: { accountId: account.id } })

    const savedAccount = await tx.account.update({
      where: { id: account.id },
      data: {
        shopName: body.shop?.name,
        ownerName: body.shop?.ownerName,
        phone: body.shop?.phone,
        lowStockThreshold: body.lowStockThreshold,
      },
    })

    const savedSettings = await tx.setting.update({
      where: { accountId: account.id },
      data: {
        shopEmail: body.shop?.email,
        shopAddress: body.shop?.address,
        smsEnabled: body.sms?.enabled,
        smsBeforeDue: body.sms?.beforeDue,
        smsOverdueDaily: body.sms?.overdueDaily,
        smsDaysBefore: body.sms?.daysBefore,
        smsTemplate: body.sms?.template,
        lowStockAlerts: body.lowStockAlerts,
        paymentReminders: body.paymentReminders,
        compact: body.compact,
        paymentMethods: body.paymentMethods ? mergePaymentMethods(current.paymentMethods, body.paymentMethods) : undefined,
      },
    })

    const savedUser =
      body.twoFactor === undefined
        ? user
        : await tx.user.update({ where: { id: user.id }, data: { twoFactorEnabled: body.twoFactor } })

    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== account.lowStockThreshold) {
      await recalculateStatuses(tx, account.id, body.lowStockThreshold)
    }

    return serializeSettings(savedAccount, savedSettings, savedUser)
  })

  res.json({ data: result })
}
