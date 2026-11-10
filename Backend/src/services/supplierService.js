import { z } from 'zod'
import { ApiError } from '../utils/ApiError.js'

/** Request fields that identify a supplier: an existing id, or a name to find or create. */
export const supplierRef = {
  supplierId: z.string().min(1).optional(),
  supplierName: z.string().trim().min(1).max(120).optional(),
}

export async function resolveSupplierId(tx, accountId, { supplierId, supplierName }) {
  if (supplierId) {
    const supplier = await tx.supplier.findFirst({ where: { id: supplierId, accountId }, select: { id: true } })
    if (!supplier) throw ApiError.notFound('Supplier')
    return supplier.id
  }
  if (supplierName) {
    const supplier = await tx.supplier.upsert({
      where: { accountId_name: { accountId, name: supplierName } },
      update: {},
      create: { accountId, name: supplierName },
    })
    return supplier.id
  }
  throw ApiError.badRequest('A supplierId or supplierName is required.')
}
