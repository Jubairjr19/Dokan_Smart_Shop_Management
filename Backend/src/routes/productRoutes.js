import { Router } from 'express'
import {
  createProduct,
  deleteProduct,
  getProduct,
  importProducts,
  listProducts,
  updateProduct,
} from '../controllers/productController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listProducts)
router.post('/', createProduct)
router.post('/import', importProducts)
router.get('/:id', getProduct)
router.put('/:id', updateProduct)
router.delete('/:id', deleteProduct)

export default router
