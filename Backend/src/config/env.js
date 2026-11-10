import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const PLACEHOLDER_PREFIX = 'replace-this'

export const config = {
  port: Number(process.env.PORT) || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  smsMode: process.env.SMS_MODE === 'live' ? 'live' : 'simulated',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
  },
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
  // Passwordless sign-in for local testing. `npm run dev:local` turns it on; .env.example does not.
  demoLogin: process.env.DEMO_LOGIN === 'true' && process.env.NODE_ENV === 'development',
}

/** Stops the server from starting with settings that would make it insecure or broken. */
export function assertServerConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  }
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters. Copy .env.example to .env and set it.')
  }
  if (config.isProduction && config.jwtSecret.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error('JWT_SECRET still has the placeholder value from .env.example. Set a random secret.')
  }
  if (config.isProduction && process.env.DEMO_LOGIN === 'true') {
    throw new Error('DEMO_LOGIN allows sign-in without a password, so it cannot be on in production.')
  }
  if (config.smsMode === 'live' &&!(config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber)) {
    throw new Error('SMS_MODE is "live" but the Twilio settings are incomplete.')
  }
}
