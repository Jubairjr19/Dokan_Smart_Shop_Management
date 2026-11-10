import { Router } from 'express'
import { createExpense, listTransactions } from '../controllers/transactionController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listTransactions)
router.post('/', createExpense)

export default router
