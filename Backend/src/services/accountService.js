/** The payment channels from the Settings page. All start switched off for a new shop. */
export const DEFAULT_PAYMENT_METHODS = {
  bKash: { enabled: false, account: '', label: 'Merchant number' },
  Nagad: { enabled: false, account: '', label: 'Merchant number' },
  Rocket: { enabled: false, account: '', label: 'Merchant number' },
  Upay: { enabled: false, account: '', label: 'Merchant number' },
  'Bangla QR': { enabled: false, account: '', label: 'QR merchant ID' },
  'Card API': { enabled: false, account: '', label: 'API key' },
}

/** Creates a shop or branch, with its settings, and links it to the user who created it. */
export function createAccount(tx, userId, data) {
  return tx.account.create({
    data: {
      ...data,
      users: { connect: { id: userId } },
      settings: { create: { paymentMethods: DEFAULT_PAYMENT_METHODS } },
    },
  })
}
