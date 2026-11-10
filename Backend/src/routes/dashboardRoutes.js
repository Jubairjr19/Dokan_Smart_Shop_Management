import { Router } from 'express'
import { charts, metrics, topProducts } from '../controllers/dashboardController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/metrics', metrics)
router.get('/charts', charts)
router.get('/top-products', topProducts)

export default router
