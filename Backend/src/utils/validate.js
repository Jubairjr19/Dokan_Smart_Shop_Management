import { z } from 'zod'
import { ApiError } from './ApiError.js'
import { round2 } from './money.js'

/** Parses input against a schema, or throws a 400 that lists each invalid field. */
export function validate(schema, input) {
  const result = schema.safeParse(input ?? {})
  if (result.success) return result.data
  const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
  throw ApiError.badRequest('Some fields are invalid.', details)
}

const MAX_MONEY = 1_000_000_000_000

/** A non-negative amount, stored to 2 decimal places. */
export const money = z.number().finite().min(0).max(MAX_MONEY).transform(round2)

/** An amount above zero, stored to 2 decimal places. */
export const positiveMoney = z.number().finite().min(0.01).max(MAX_MONEY).transform(round2)

export const quantity = z.number().int().min(1).max(1_000_000)

/** An ISO 8601 date or date-time string, parsed to a Date. */
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a valid date.')
  .transform((value) => new Date(value))

export const paymentChannel = z.enum(['BKASH', 'NAGAD', 'ROCKET', 'UPAY', 'BANGLA_QR', 'CARD', 'CASH'])

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
})

/** Reads ?page and ?limit. Returns Prisma skip/take plus a builder for the response block. */
export function parsePagination(query) {
  const { page, limit } = validate(paginationSchema, query)
  return {
    skip: (page - 1) * limit,
    take: limit,
    meta: (total) => ({ page, limit, total, pages: Math.ceil(total / limit) }),
  }
}
