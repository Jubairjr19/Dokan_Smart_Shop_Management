import jwt from 'jsonwebtoken'
import { prisma } from '../config/db.js'
import { config } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

export const PUBLIC_USER_FIELDS = { id: true, name: true, email: true, role: true, twoFactorEnabled: true, createdAt: true }

export function signToken(userId) {
  return jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' })
}

/** Requires a valid Bearer token and loads the user, so a deleted user loses access at once. */
export async function authenticate(req, res, next) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) throw ApiError.unauthorized()

  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: PUBLIC_USER_FIELDS })
  if (!user) throw ApiError.unauthorized()

  req.user = user
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw ApiError.forbidden()
    next()
  }
}

/**
 * Sets the branch the request works on. The branch switcher sends X-Account-Id; without it
 * the user's first branch is used. The lookup goes through the user's own memberships, so a
 * branch belonging to someone else is simply not found.
 */
export async function resolveAccount(req, res, next) {
  const requestedId = req.get('x-account-id')
  const account = await prisma.account.findFirst({
    where: { users: { some: { id: req.user.id } }, ...(requestedId ? { id: requestedId } : {}) },
    orderBy: { createdAt: 'asc' },
  })
  if (!account) throw ApiError.notFound('Account')

  req.account = account
  next()
}
