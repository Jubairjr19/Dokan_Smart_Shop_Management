/** Marks a record's active alerts as read once their cause is gone. */
export function clearAlerts(tx, accountId, type, entityId) {
  return tx.notification.updateMany({
    where: { accountId, type, entityId, isRead: false },
    data: { isRead: true },
  })
}

export function createAlert(tx, accountId, alert) {
  return tx.notification.create({ data: { accountId, ...alert } })
}

/** Replaces any older alert for the same record, so one record never shows two. */
export async function replaceAlert(tx, accountId, alert) {
  await clearAlerts(tx, accountId, alert.type, alert.entityId)
  return createAlert(tx, accountId, alert)
}
