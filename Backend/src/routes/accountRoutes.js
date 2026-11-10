import { Router } from 'express'
import { addAccount, listAccounts, updateAccount } from '../controllers/accountController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/', listAccounts)
router.post('/', requireRole('ADMIN'), addAccount)
router.put('/:id', requireRole('ADMIN'), updateAccount)

export default router
