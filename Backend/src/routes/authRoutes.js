import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { config } from '../config/env.js'
import { changePassword, demoLogin, login, me, register } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const FIFTEEN_MINUTES = 15 * 60 * 1000

const limiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please try again in 15 minutes.' } },
})

const router = Router()

router.post('/register', limiter, register)
router.post('/login', limiter, login)
if (config.demoLogin) router.post('/demo', limiter, demoLogin)
router.get('/me', authenticate, me)
router.put('/password', authenticate, limiter, changePassword)

export default router
