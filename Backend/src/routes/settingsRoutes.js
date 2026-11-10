import { Router } from 'express'
import { getSettings, updateSettings } from '../controllers/accountController.js'
import { authenticate, requireRole, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', getSettings)
router.put('/', requireRole('ADMIN'), updateSettings)

export default router
