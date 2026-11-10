import { Router } from 'express'
import {
  addCredit,
  createCustomer,
  getCustomer,
  listCustomers,
  payDebt,
  sendReminder,
  smsLog,
  updateCustomer,
} from '../controllers/creditController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listCustomers)
router.post('/', createCustomer)
router.get('/sms-log', smsLog)
router.get('/:id', getCustomer)
router.put('/:id', updateCustomer)
router.post('/:id/add-credit', addCredit)
router.post('/:id/pay-debt', payDebt)
router.post('/:id/send-sms', sendReminder)

export default router
