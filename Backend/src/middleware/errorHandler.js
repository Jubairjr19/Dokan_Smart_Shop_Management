import { Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError.js'

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}.`))
}

const unavailable = () => new ApiError(503, 'UNAVAILABLE', 'The database is busy or unreachable. Please try again.')

function toApiError(error) {
  if (error instanceof ApiError) return error

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return ApiError.conflict('A record with these details already exists.')
    if (error.code === 'P2025') return ApiError.notFound()
    if (error.code === 'P2003') return ApiError.conflict('This record is linked to other records.')
    if (error.code === 'P2028' || error.code === 'P1001') return unavailable()
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return unavailable()

  if (error.type === 'entity.parse.failed') return ApiError.badRequest('The request body is not valid JSON.')
  if (error.type === 'entity.too.large') return new ApiError(413, 'TOO_LARGE', 'The request body is too large.')

  return null
}

// Express recognises error handlers by their four parameters, so `next` must stay.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const known = toApiError(error)
  if (!known) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' } })
    return
  }
  res.status(known.status).json({ error: { code: known.code, message: known.message, details: known.details } })
}
