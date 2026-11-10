import './env.js'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

/**
 * Runs a multi-step write atomically. Stock and balance updates take row locks, so busy
 * moments make transactions wait. The limits are longer than Prisma's defaults for that reason.
 */
export function withTransaction(work) {
  return prisma.$transaction(work, { maxWait: 10_000, timeout: 20_000 })
}
