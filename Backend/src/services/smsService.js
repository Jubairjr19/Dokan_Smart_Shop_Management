import crypto from 'node:crypto'
import twilio from 'twilio'
import { config } from '../config/env.js'

let liveClient

function getLiveClient() {
  liveClient ??= twilio(config.twilio.accountSid, config.twilio.authToken)
  return liveClient
}

/** Same id format as Twilio ("SM" plus 32 hex characters), so stored records look alike. */
const simulatedSid = () => `SM${crypto.randomBytes(16).toString('hex')}`

/** Twilio needs E.164 numbers. Shops store local ones like 01700-000101 (Bangladesh, +880). */
function toE164(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `+880${digits.slice(1)}` : `+${digits}`
}

/** Sends one SMS. In simulated mode nothing leaves the server. */
export async function sendSms({ to, body }) {
  if (config.smsMode === 'live') {
    const message = await getLiveClient().messages.create({ to: toE164(to), body, from: config.twilio.fromNumber })
    return { sid: message.sid, status: message.status, simulated: false }
  }
  return { sid: simulatedSid(), status: 'delivered', simulated: true }
}
