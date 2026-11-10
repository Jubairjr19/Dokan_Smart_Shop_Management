import { Router } from 'express'
import { createSale, getSale, listSales } from '../controllers/salesController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listSales)
router.post('/', createSale)
router.get('/:id', getSale)

export default router
