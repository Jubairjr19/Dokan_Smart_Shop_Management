import { Router } from 'express'
import { createSupplier, listSuppliers, updateSupplier } from '../controllers/supplierController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listSuppliers)
router.post('/', createSupplier)
router.put('/:id', updateSupplier)

export default router
