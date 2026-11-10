import { z } from 'zod'
import { prisma } from '../config/db.js'
import { ApiError } from '../utils/ApiError.js'
import { validate } from '../utils/validate.js'

const fields = {
  name: z.string().trim().min(1).max(120),
  contact: z.string().trim().max(200),
  phone: z.string().trim().max(30),
}

const createSchema = z.object({ name: fields.name, contact: fields.contact.default(''), phone: fields.phone.default('') })
const updateSchema = z.object(fields).partial()

export async function listSuppliers(req, res) {
  const suppliers = await prisma.supplier.findMany({ where: { accountId: req.account.id }, orderBy: { name: 'asc' } })
  res.json({ data: suppliers })
}

export async function createSupplier(req, res) {
  const body = validate(createSchema, req.body)
  const supplier = await prisma.supplier.create({ data: { ...body, accountId: req.account.id } })
  res.status(201).json({ data: supplier })
}

export async function updateSupplier(req, res) {
  const body = validate(updateSchema, req.body)
  const { count } = await prisma.supplier.updateMany({ where: { id: req.params.id, accountId: req.account.id }, data: body })
  if (!count) throw ApiError.notFound('Supplier')
  res.json({ data: await prisma.supplier.findUniqueOrThrow({ where: { id: req.params.id } }) })
}
