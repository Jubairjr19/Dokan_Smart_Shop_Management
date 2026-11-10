import { Router } from 'express'
import { createPurchase, getPurchase, listPurchases, payDue } from '../controllers/purchaseController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listPurchases)
router.post('/', createPurchase)
router.get('/:id', getPurchase)
router.post('/:id/pay-due', payDue)

export default router
