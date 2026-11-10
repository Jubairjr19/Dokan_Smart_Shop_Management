import { Router } from 'express'
import {
  createNotification,
  deleteNotification,
  listNotifications,
  markAllRead,
  markRead,
} from '../controllers/notificationController.js'
import { authenticate, resolveAccount } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, resolveAccount)
router.get('/', listNotifications)
router.post('/', createNotification)
router.put('/read-all', markAllRead)
router.put('/:id/read', markRead)
router.delete('/:id', deleteNotification)

export default router
