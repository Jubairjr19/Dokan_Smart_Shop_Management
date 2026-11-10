import { ApiError } from '../utils/ApiError.js'
import { round2, taka } from '../utils/money.js'
import { clearAlerts, createAlert, replaceAlert } from './notificationService.js'

const METHOD_LABELS = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  UPAY: 'Upay',
  BANGLA_QR: 'Bangla QR',
  CARD: 'Card',
  CASH: 'Cash',
}

const creditLink = (name) => `/credit?q=${encodeURIComponent(name)}`

/** New credit must not push back a date the customer already owes by, or an overdue account would look fine. */
function nextDueDate(previousBalance, currentDueDate, newDate) {
  if (previousBalance <= 0 || !currentDueDate) return newDate
  return currentDueDate < newDate ? currentDueDate : newDate
}

/** Adds to a customer's balance and ledger, and raises the due alert. */
export async function addCustomerCredit(tx, customer, { amount, dueDate, note, alertsEnabled }) {
  // The increment takes the row lock, so simultaneous credit sales cannot lose an amount.
  const locked = await tx.customer.update({
    where: { id: customer.id },
    data: { totalCreditDue: { increment: amount } },
  })
  const updated = await tx.customer.update({
    where: { id: customer.id },
    data: {
      totalCreditDue: round2(locked.totalCreditDue),
      dueDate: nextDueDate(locked.totalCreditDue - amount, locked.dueDate, dueDate),
    },
  })
  await tx.creditEntry.create({ data: { customerId: customer.id, type: 'CREDIT', amount, note } })

  if (alertsEnabled) {
    await replaceAlert(tx, customer.accountId, {
      type: 'DEBT_DUE',
      title: 'Customer payment due',
      message: `${customer.name} • ${taka(updated.totalCreditDue)} outstanding`,
      entityId: customer.id,
      link: creditLink(customer.name),
    })
  }
  return updated
}

/**
 * Settles part or all of a customer's debt, oldest invoice first. The balance update is
 * conditional, so two simultaneous payments cannot take the balance below zero: the second
 * waits for the row lock and then fails the condition.
 *
 * Revenue is not touched. It already counted the full amount when the credit sale was made.
 */
export async function settleCustomerDebt(tx, customer, { amount, method }) {
  let updated
  try {
    updated = await tx.customer.update({
      where: { id: customer.id, totalCreditDue: { gte: amount } },
      data: { totalCreditDue: { decrement: amount } },
    })
  } catch (error) {
    if (error.code === 'P2025') {
      throw ApiError.conflict(`Payment is more than the outstanding balance of ${taka(customer.totalCreditDue)}.`)
    }
    throw error
  }

  const balance = round2(updated.totalCreditDue)
  updated = await tx.customer.update({ where: { id: customer.id }, data: { totalCreditDue: balance } })

  let remaining = amount
  const openSales = await tx.sale.findMany({
    where: { customerId: customer.id, dueAmount: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  })
  for (const sale of openSales) {
    if (remaining <= 0) break
    const applied = Math.min(remaining, sale.dueAmount)
    await tx.sale.update({
      where: { id: sale.id },
      data: { paidAmount: round2(sale.paidAmount + applied), dueAmount: round2(sale.dueAmount - applied) },
    })
    remaining = round2(remaining - applied)
  }

  const label = METHOD_LABELS[method]
  const isFull = balance === 0
  await tx.creditEntry.create({
    data: { customerId: customer.id, type: 'PAYMENT', amount, note: `${isFull ? 'Full' : 'Partial'} payment via ${label}` },
  })
  await tx.transaction.create({
    data: {
      type: 'DEBT_PAYMENT',
      amount,
      category: 'Customer Credit',
      accountId: customer.accountId,
      notes: `${customer.name} paid via ${label}`,
    },
  })

  await clearAlerts(tx, customer.accountId, 'DEBT_DUE', customer.id)
  await createAlert(tx, customer.accountId, {
    type: 'PAYMENT_RECEIVED',
    title: 'Payment received',
    message: `${taka(amount)} received from ${customer.name}`,
    entityId: customer.id,
    link: creditLink(customer.name),
  })

  return updated
}
