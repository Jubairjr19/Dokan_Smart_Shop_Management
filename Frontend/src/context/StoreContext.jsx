import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  SEED_CUSTOMERS,
  SEED_FINANCE,
  SEED_NOTIFICATIONS,
  SEED_PRODUCTS,
  SEED_PURCHASES,
  SEED_SALES,
  SEED_SETTINGS,
  SEED_SUPPLIERS,
  UNLISTED_PRODUCTS,
} from '../data/mockData.js'
import { daysUntil, taka } from '../lib/format.js'

/**
 * Central mock store. It implements the SRS workflow (section 7) so that pages stay
 * consistent: sales reduce stock, purchases increase stock, credit sales create
 * dues, and payments update balances. Swap dispatch calls for API requests when
 * the Express backend exists.
 */

const STORAGE_KEY = 'dokan:store:v1'

const StoreContext = createContext(null)

function seedState() {
  return {
    products: SEED_PRODUCTS,
    suppliers: SEED_SUPPLIERS,
    purchases: SEED_PURCHASES,
    customers: SEED_CUSTOMERS,
    sales: SEED_SALES,
    notifications: SEED_NOTIFICATIONS,
    settings: SEED_SETTINGS,
    finance: SEED_FINANCE,
    smsLog: [],
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : seedState()
  } catch {
    return seedState()
  }
}

/* ---------- Pure helpers, also used by pages ---------- */

export function stockStatus(stock, threshold) {
  if (stock <= 0) return 'out'
  if (stock <= threshold) return 'low'
  return 'in'
}

export function customerBalance(customer) {
  return customer.ledger.reduce((sum, entry) => sum + (entry.type === 'credit' ? entry.amount : -entry.amount), 0)
}

export function customerStatus(customer) {
  const balance = customerBalance(customer)
  if (balance <= 0) return 'settled'
  const days = daysUntil(customer.dueDate)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'open'
}

/** New credit must not push back a date the customer already owes by, or an overdue account would look fine. */
function nextDueDate(customer, newDate) {
  if (customerBalance(customer) <= 0) return newDate
  return new Date(customer.dueDate) < new Date(newDate) ? customer.dueDate : newDate
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function nextId(list, prefix, pad = 3) {
  const highest = list.reduce((max, item) => Math.max(max, Number(item.id.split('-').pop()) || 0), 0)
  return `${prefix}-${String(highest + 1).padStart(pad, '0')}`
}

function notify(state, notification) {
  return {
    ...state,
    notifications: [{ id: `N-${uid()}`, date: new Date().toISOString(), read: false, ...notification }, ...state.notifications],
  }
}

/** Adds a notification when stock has just dropped to or below the threshold. */
function alertIfLow(state, before, after) {
  const { lowStockAlerts, lowStockThreshold } = state.settings
  if (!lowStockAlerts) return state
  const was = stockStatus(before.stock, lowStockThreshold)
  const now = stockStatus(after.stock, lowStockThreshold)
  if (was === now || now === 'in') return state
  return notify(state, {
    category: 'stock',
    title: now === 'out' ? 'Out of stock' : 'Low stock alert',
    message: now === 'out' ? `${after.name} has run out.` : `${after.name} has only ${after.stock} units left.`,
    link: `/inventory?q=${encodeURIComponent(after.name)}`,
  })
}

function addToFinance(state, { revenue = 0, expense = 0 }) {
  const { finance } = state
  return {
    ...state,
    finance: {
      revenue: finance.revenue + revenue,
      expense: finance.expense + expense,
      capital: finance.capital + revenue - expense,
    },
  }
}

/* ---------- Reducer ---------- */

function reducer(state, action) {
  switch (action.type) {
    case 'product/add':
      return { ...state, products: [...state.products, { ...action.product, id: nextId(state.products, 'PRD'), unitsSold: 0, trend: 0 }] }

    case 'product/update':
      return { ...state, products: state.products.map((p) => (p.id === action.id ? { ...p, ...action.changes } : p)) }

    case 'product/delete':
      return { ...state, products: state.products.filter((p) => p.id !== action.id) }

    case 'product/import': {
      let products = state.products
      action.rows.forEach((row) => {
        products = [...products, { ...row, id: nextId(products, 'PRD'), unitsSold: 0, trend: 0 }]
      })
      return { ...state, products }
    }

    case 'sale/record': {
      const { sale, newCustomer } = action
      let next = { ...state }

      // Sales reduce stock.
      sale.items.forEach((item) => {
        const before = next.products.find((p) => p.id === item.productId)
        if (!before) return
        const after = { ...before, stock: before.stock - item.qty, unitsSold: before.unitsSold + item.qty }
        next = { ...next, products: next.products.map((p) => (p.id === before.id ? after : p)) }
        next = alertIfLow(next, before, after)
      })

      // Credit sales create customer due records.
      let customerId = sale.customerId
      if (newCustomer) {
        const created = { ...newCustomer, id: nextId(next.customers, 'CUS'), ledger: [] }
        next = { ...next, customers: [...next.customers, created] }
        customerId = created.id
      }
      if (sale.due > 0) {
        next = {
          ...next,
          customers: next.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  dueDate: nextDueDate(c, sale.dueDate),
                  ledger: [
                    ...c.ledger,
                    { id: `L-${uid()}`, type: 'credit', amount: sale.due, note: `Credit sale ${sale.id}`, date: sale.date },
                  ],
                }
              : c,
          ),
        }
      }

      next = { ...next, sales: [sale, ...next.sales] }
      return addToFinance(next, { revenue: sale.total })
    }

    case 'purchase/add': {
      const { purchase } = action
      let next = { ...state }

      // Purchases increase stock.
      purchase.lines.forEach((line) => {
        next = {
          ...next,
          products: next.products.map((p) => (p.id === line.productId ? { ...p, stock: p.stock + line.qty, buyPrice: line.cost } : p)),
        }
      })

      if (!next.suppliers.some((s) => s.name === purchase.supplier)) {
        next = {
          ...next,
          suppliers: [...next.suppliers, { id: nextId(next.suppliers, 'SUP'), name: purchase.supplier, contact: '', phone: '' }],
        }
      }

      next = { ...next, purchases: [purchase, ...next.purchases] }
      if (purchase.total > purchase.paid && state.settings.paymentReminders) {
        next = notify(next, {
          category: 'supplier',
          title: 'Supplier payment reminder',
          message: `${purchase.supplier} • ${taka(purchase.total - purchase.paid)} due on ${purchase.id}`,
          link: `/purchases?view=${purchase.id}`,
        })
      }
      return addToFinance(next, { expense: purchase.total })
    }

    case 'purchase/pay':
      return {
        ...state,
        purchases: state.purchases.map((po) => (po.id === action.id ? { ...po, paid: Math.min(po.total, po.paid + action.amount) } : po)),
      }

    case 'customer/add':
      return { ...state, customers: [...state.customers, { ...action.customer, id: nextId(state.customers, 'CUS') }] }

    case 'credit/add':
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.id
            ? {
                ...c,
                dueDate: nextDueDate(c, action.dueDate),
                ledger: [...c.ledger, { id: `L-${uid()}`, type: 'credit', amount: action.amount, note: action.note, date: new Date().toISOString() }],
              }
            : c,
        ),
      }

    case 'credit/pay': {
      const customer = state.customers.find((c) => c.id === action.id)
      const next = {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.id
            ? {
                ...c,
                ledger: [
                  ...c.ledger,
                  { id: `L-${uid()}`, type: 'payment', amount: action.amount, note: `${action.full ? 'Full' : 'Partial'} payment via ${action.method}`, date: new Date().toISOString() },
                ],
              }
            : c,
        ),
      }
      return notify(next, {
        category: 'customer',
        title: 'Payment received',
        message: `${taka(action.amount)} received from ${customer.name}`,
        link: `/credit?q=${encodeURIComponent(customer.name)}`,
      })
    }

    case 'sms/queue':
      return { ...state, smsLog: [action.message, ...state.smsLog] }

    case 'sms/status':
      return { ...state, smsLog: state.smsLog.map((m) => (m.sid === action.sid ? { ...m, status: action.status } : m)) }

    case 'notification/toggle':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: !n.read } : n)) }

    case 'notification/read':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) }

    case 'notification/readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.changes } }

    case 'demo/reset':
      return seedState()

    default:
      return state
  }
}

/* ---------- Provider ---------- */

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Without storage the demo still works; it just resets on refresh.
    }
  }, [state])

  useEffect(() => {
    document.documentElement.classList.toggle('compact', state.settings.compact)
  }, [state.settings.compact])

  const derived = useMemo(() => {
    const threshold = state.settings.lowStockThreshold
    const counts = { in: 0, low: 0, out: 0 }
    let stockValue = 0
    state.products.forEach((p) => {
      counts[stockStatus(p.stock, threshold)] += 1
      stockValue += p.stock * p.buyPrice
    })

    const receivable = state.customers.reduce((sum, c) => sum + Math.max(0, customerBalance(c)), 0)
    const supplierDue = state.purchases.reduce((sum, po) => sum + (po.total - po.paid), 0)

    return {
      threshold,
      inventory: {
        // Unlisted products count as in stock; see UNLISTED_PRODUCTS in mockData.js.
        total: state.products.length + UNLISTED_PRODUCTS,
        inStock: counts.in + UNLISTED_PRODUCTS,
        low: counts.low,
        out: counts.out,
        value: stockValue,
      },
      receivable,
      supplierDue,
      unread: state.notifications.filter((n) => !n.read).length,
      netProfit: state.finance.revenue - state.finance.expense,
    }
  }, [state])

  const value = useMemo(() => ({ ...state, derived, dispatch }), [state, derived])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  return useContext(StoreContext)
}
