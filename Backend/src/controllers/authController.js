import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma, withTransaction } from '../config/db.js'
import { PUBLIC_USER_FIELDS, signToken } from '../middleware/auth.js'
import { createAccount } from '../services/accountService.js'
import { ApiError } from '../utils/ApiError.js'
import { validate } from '../utils/validate.js'

const BCRYPT_ROUNDS = 12
const DEMO_EMAIL = 'admin@dokan.example'

// Compared against when the email is unknown, so both failures take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS)

const email = z.string().trim().toLowerCase().pipe(z.email())
const password = z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be at most 72 characters.')

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  password,
  shopName: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(30).default(''),
})

const loginSchema = z.object({ email, password: z.string().min(1).max(200) })

const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: password })

const listAccounts = (userId) =>
  prisma.account.findMany({ where: { users: { some: { id: userId } } }, orderBy: { createdAt: 'asc' } })

/** Everyone who registers becomes the admin of their own new shop, with its own separate data. */
export async function register(req, res) {
  const body = validate(registerSchema, req.body)
  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } })
  if (existing) throw ApiError.conflict('An account with this email already exists.')

  const hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS)

  const user = await withTransaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: body.name, email: body.email, password: hash, role: 'ADMIN' },
      select: PUBLIC_USER_FIELDS,
    })
    await createAccount(tx, created.id, {
      shopName: body.shopName ?? `${body.name}'s Shop`,
      ownerName: body.name,
      phone: body.phone,
    })
    return created
  })

  res.status(201).json({ data: { token: signToken(user.id), user, accounts: await listAccounts(user.id) } })
}

export async function login(req, res) {
  const body = validate(loginSchema, req.body)
  const record = await prisma.user.findUnique({ where: { email: body.email } })
  const matches = await bcrypt.compare(body.password, record?.password ?? DUMMY_HASH)
  if (!record || !matches) throw ApiError.unauthorized('Incorrect email or password.')

  const { password: _hash, ...user } = record
  res.json({ data: { token: signToken(user.id), user, accounts: await listAccounts(user.id) } })
}

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * Signs in as the demo owner without a password, for local testing only. The route exists only
 * when config.demoLogin is on, and it answers only requests from this same computer, so others
 * on the network cannot use it.
 */
export async function demoLogin(req, res) {
  if (!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress)) throw ApiError.forbidden()

  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: PUBLIC_USER_FIELDS })
  if (!user) throw ApiError.notFound('Demo account')

  res.json({ data: { token: signToken(user.id), user, accounts: await listAccounts(user.id) } })
}

export async function me(req, res) {
  res.json({ data: { user: req.user, accounts: await listAccounts(req.user.id) } })
}

export async function changePassword(req, res) {
  const body = validate(changePasswordSchema, req.body)
  const record = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } })
  if (!(await bcrypt.compare(body.currentPassword, record.password))) {
    throw ApiError.badRequest('The current password is incorrect.')
  }
  await prisma.user.update({
    where: { id: record.id },
    data: { password: await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS) },
  })
  res.json({ data: { changed: true } })
}
