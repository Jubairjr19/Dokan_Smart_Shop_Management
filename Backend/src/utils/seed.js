/**
 * Replaces ALL data in the database with the Dokan demo data.
 *
 * Every figure on the dashboard is computed from real rows, so the targets are reached with
 * real sales and purchases, and the script checks the computed result before it finishes:
 *   Revenue ৳ 248,500 | Expense ৳ 96,400 | Profit ৳ 152,100 | Capital ৳ 685,000 | 828 products
 */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/db.js'
import { config } from '../config/env.js'
import { stockStatus } from '../services/stockService.js'
import { addDays, startOfDay } from './dates.js'
import { computeCapital, computeFinance, SUPPLIER_PAYMENT_CATEGORY } from './finance.js'

const TARGET = { revenue: 248500, expense: 96400, profit: 152100, capital: 685000, products: 828 }

/**
 * Capital is configured capital + net profit, so showing ৳ 685,000 with a ৳ 152,100 profit
 * needs a configured capital of ৳ 532,900.
 */
const CONFIGURED_CAPITAL = TARGET.capital - TARGET.profit

// The UI design flags Cooking Oil at 8 units as low stock, which needs a threshold of at least 8.
const LOW_STOCK_THRESHOLD = 10

const uuid = () => crypto.randomUUID()
const now = new Date()
const today = startOfDay(now)

/** A moment on a past or current day. Today's rows are spread up to now, never in the future. */
function moment(daysAgo, fraction = 0.5) {
  if (daysAgo === 0) return new Date(today.getTime() + (now.getTime() - today.getTime()) * fraction)
  const date = addDays(today, -daysAgo)
  date.setHours(9 + Math.floor(fraction * 12), Math.floor((fraction * 720) % 60))
  return date
}

/* ---------- Fixed reference data, matching the UI design ---------- */

const SUPPLIERS = [
  { name: 'Fresh Supply Ltd.', contact: 'Sylhet, Zindabazar', phone: '01700-000201' },
  { name: 'Bengal Wholesale', contact: 'Dhaka, Karwan Bazar', phone: '01700-000202' },
  { name: 'City Distributors', contact: 'Sylhet, Ambarkhana', phone: '01700-000203' },
]

const PRODUCTS = [
  { key: 'rice', productName: 'Premium Rice 5kg', category: 'Grains', stockQty: 124, buyingPrice: 520, sellingPrice: 650, supplier: 'Bengal Wholesale' },
  { key: 'oil', productName: 'Cooking Oil 2L', category: 'Essentials', stockQty: 8, buyingPrice: 310, sellingPrice: 380, supplier: 'Fresh Supply Ltd.' },
  { key: 'sugar', productName: 'Sugar 1kg', category: 'Essentials', stockQty: 86, buyingPrice: 110, sellingPrice: 140, supplier: 'Bengal Wholesale' },
  { key: 'milk', productName: 'Milk Powder', category: 'Dairy', stockQty: 42, buyingPrice: 580, sellingPrice: 720, supplier: 'City Distributors' },
  { key: 'tea', productName: 'Tea 400g', category: 'Beverages', stockQty: 56, buyingPrice: 185, sellingPrice: 240, supplier: 'Fresh Supply Ltd.' },
  { key: 'biscuits', productName: 'Butter Biscuits', category: 'Snacks', stockQty: 62, buyingPrice: 60, sellingPrice: 85, supplier: 'City Distributors' },
  { key: 'detergent', productName: 'Detergent 1kg', category: 'Household', stockQty: 0, buyingPrice: 145, sellingPrice: 180, supplier: 'City Distributors' },
  { key: 'water', productName: 'Mineral Water', category: 'Beverages', stockQty: 180, buyingPrice: 20, sellingPrice: 30, supplier: 'Fresh Supply Ltd.' },
]

/** Three purchase orders totalling ৳ 86,200, of which ৳ 70,600 is paid and ৳ 15,600 is due. */
const PURCHASES = [
  { poNumber: 16, supplier: 'City Distributors', daysAgo: 3, paid: 10000, lines: [['milk', 2, 5600], ['biscuits', 2, 1200], ['detergent', 2, 800]] },
  { poNumber: 17, supplier: 'Bengal Wholesale', daysAgo: 2, paid: 42600, lines: [['rice', 5, 6240], ['sugar', 3, 3800]] },
  { poNumber: 18, supplier: 'Fresh Supply Ltd.', daysAgo: 1, paid: 18000, lines: [['oil', 5, 3600], ['tea', 4, 1850], ['water', 3, 1000]] },
]

/** ৳ 86,200 of purchases plus these ৳ 10,200 of running costs gives the ৳ 96,400 expense. */
const OPERATIONAL_EXPENSES = [
  { amount: 6000, category: 'Rent', notes: 'Shop rent', daysAgo: 6 },
  { amount: 2200, category: 'Utilities', notes: 'Electricity bill', daysAgo: 4 },
  { amount: 2000, category: 'Transport', notes: 'Delivery van', daysAgo: 2 },
]

/** The Revenue & Expenses chart from the UI design, oldest day first. Adds up to ৳ 248,500. */
const DAILY_REVENUE = [22000, 28500, 36000, 31500, 52000, 44500, 34000]

/** Customers with the credit sale behind each balance. `paidLater` is a payment after the sale. */
const CUSTOMERS = [
  { name: 'Rahim Ahmed', phone: '01700-000101', saleDaysAgo: 6, dueInDays: -4, paidLater: { amount: 2450, daysAgo: 1, label: 'bKash' }, items: [['rice', 13], ['milk', 5], ['oil', 5], ['sugar', 5], ['water', 10]] },
  { name: 'Fatema Begum', phone: '01700-000102', saleDaysAgo: 5, dueInDays: 3, items: [['rice', 8], ['tea', 4]] },
  { name: 'Karim Uddin', phone: '01700-000103', saleDaysAgo: 5, dueInDays: -2, paidLater: { amount: 5000, daysAgo: 3, label: 'Cash' }, items: [['rice', 8], ['milk', 5], ['sugar', 5], ['water', 10]] },
  { name: 'Nasrin Akter', phone: '01700-000104', saleDaysAgo: 3, dueInDays: 12, items: [['milk', 3], ['oil', 2], ['tea', 1]] },
  { name: 'Jamal Hossain', phone: '01700-000105', saleDaysAgo: 6, dueInDays: -5, paidLater: { amount: 4300, daysAgo: 4, label: 'Nagad' }, items: [['rice', 5], ['oil', 1], ['tea', 1], ['sugar', 1], ['biscuits', 2], ['water', 4]] },
]

/* ---------- The other 820 products in the 828-item catalogue ---------- */

const CATALOGUE = {
  Grains: ['Miniket Rice', 'Nazirshail Rice', 'Chinigura Rice', 'Red Lentils', 'Mung Dal', 'Chickpeas', 'Atta Flour', 'Maida Flour', 'Semolina', 'Vermicelli'],
  Essentials: ['Mustard Oil', 'Soybean Oil', 'Iodized Salt', 'Turmeric Powder', 'Chili Powder', 'Cumin Powder', 'Coriander Powder', 'Garam Masala', 'Onion Flakes', 'Tomato Sauce'],
  Dairy: ['Full Cream Milk', 'Condensed Milk', 'Ghee', 'Butter', 'Cheese Slices', 'Yogurt', 'Whitener', 'Malted Milk', 'Cream', 'Paneer'],
  Beverages: ['Black Tea', 'Green Tea', 'Instant Coffee', 'Mango Juice', 'Orange Drink', 'Soft Drink', 'Energy Drink', 'Lemon Squash', 'Soda Water', 'Tonic Water'],
  Snacks: ['Salted Chips', 'Potato Crackers', 'Chanachur', 'Cream Biscuits', 'Wafers', 'Noodles', 'Popcorn', 'Peanuts', 'Cake Slices', 'Chocolate Bar'],
  Household: ['Dish Soap', 'Floor Cleaner', 'Glass Cleaner', 'Toilet Cleaner', 'Bath Soap', 'Shampoo', 'Toothpaste', 'Hand Wash', 'Tissue Roll', 'Mosquito Coil'],
}
const BRANDS = ['Padma', 'Meghna', 'Surma', 'Jamuna', 'Teesta', 'Karnaphuli', 'Sundarban', 'Ruposhi', 'Shapla', 'Kushiara', 'Bijoy', 'Sonali', 'Dhansiri', 'Barak']
const SIZES = ['Small', 'Medium', 'Large']

/** A small fixed-seed generator, so every run produces the same data. */
function createRandom(seed) {
  let state = seed
  return (max) => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return Math.floor((state / 4294967296) * max)
  }
}

/** Every generated product stays above the threshold, so low and out of stock match the design: 1 each. */
function generateCatalogue(count, suppliersByName) {
  const random = createRandom(828)
  const supplierIds = [...suppliersByName.values()]
  const rows = []
  const combos = Object.entries(CATALOGUE).flatMap(([category, items]) =>
    items.flatMap((item) => BRANDS.flatMap((brand) => SIZES.map((size) => ({ category, name: `${brand} ${item} ${size}` })))),
  )
  for (let index = 0; rows.length < count; index += 1) {
    const combo = combos[(index * 37) % combos.length]
    const buyingPrice = (random(60) + 4) * 5
    rows.push({
      productName: combo.name,
      category: combo.category,
      stockQty: LOW_STOCK_THRESHOLD + 5 + random(120),
      buyingPrice,
      sellingPrice: buyingPrice + (random(8) + 2) * 5,
      supplierId: supplierIds[index % supplierIds.length],
    })
  }
  return rows
}

/* ---------- Sales that add up to the daily chart exactly ---------- */

/** The fewest items whose prices add up to exactly `amount`. */
function exactBasket(amount, prices) {
  const best = new Map([[0, []]])
  for (let total = 5; total <= amount; total += 5) {
    for (const { key, price } of prices) {
      const previous = best.get(total - price)
      if (previous && (!best.has(total) || previous.length + 1 < best.get(total).length)) {
        best.set(total, [...previous, key])
      }
    }
  }
  const keys = best.get(amount)
  if (!keys) throw new Error(`No basket adds up to ${amount}.`)
  const counts = new Map()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts]
}

/** Fills a day's remaining revenue with walk-in baskets, finishing with one exact basket. */
function fillDay(amount, prices, random) {
  const smallestExact = 500
  const popular = ['rice', 'rice', 'oil', 'sugar', 'milk', 'tea', 'tea', 'biscuits', 'water', 'sugar', 'detergent']
  const priceOf = Object.fromEntries(prices.map(({ key, price }) => [key, price]))
  const baskets = []
  let remaining = amount

  while (remaining > 0) {
    const basket = new Map()
    for (let line = random(3) + 1; line > 0; line -= 1) {
      const key = popular[random(popular.length)]
      basket.set(key, (basket.get(key) ?? 0) + random(3) + 1)
    }
    const value = [...basket].reduce((sum, [key, qty]) => sum + priceOf[key] * qty, 0)
    if (value <= remaining - smallestExact) {
      baskets.push([...basket])
      remaining -= value
    } else {
      baskets.push(exactBasket(remaining, prices))
      remaining = 0
    }
  }
  return baskets
}

/* ---------- Writing the data ---------- */

async function wipe() {
  await prisma.$transaction([
    prisma.saleItem.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.creditEntry.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.smsMessage.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.product.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.sequence.deleteMany(),
  ])
}

async function createOwner() {
  const password = await bcrypt.hash('dokan123', 12)
  const account = await prisma.account.create({
    data: {
      shopName: 'Dokan General Store',
      ownerName: 'Admin',
      phone: '01700-000100',
      businessCapital: CONFIGURED_CAPITAL,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      currency: 'BDT',
      users: {
        create: [
          { name: 'Admin', email: 'admin@dokan.example', password, role: 'ADMIN' },
          { name: 'Manager', email: 'manager@dokan.example', password, role: 'MANAGER' },
        ],
      },
      settings: {
        create: {
          shopEmail: 'hello@dokan.example',
          shopAddress: 'Zindabazar, Sylhet, Bangladesh',
          paymentMethods: {
            bKash: { enabled: true, account: '01700-000111', label: 'Merchant number' },
            Nagad: { enabled: true, account: '01700-000112', label: 'Merchant number' },
            Rocket: { enabled: false, account: '', label: 'Merchant number' },
            Upay: { enabled: false, account: '', label: 'Merchant number' },
            'Bangla QR': { enabled: true, account: 'DOKAN-QR-0001', label: 'QR merchant ID' },
            'Card API': { enabled: false, account: '', label: 'API key' },
          },
        },
      },
    },
  })
  return account.id
}

async function createCatalogue(accountId) {
  await prisma.supplier.createMany({ data: SUPPLIERS.map((supplier) => ({ ...supplier, accountId })) })
  const suppliers = await prisma.supplier.findMany({ where: { accountId } })
  const suppliersByName = new Map(suppliers.map((supplier) => [supplier.name, supplier.id]))

  // The 8 named products are created first, so they head the default product list.
  const named = PRODUCTS.map(({ key, supplier, ...fields }, index) => ({
    ...fields,
    id: uuid(),
    key,
    supplierId: suppliersByName.get(supplier),
    status: stockStatus(fields.stockQty, LOW_STOCK_THRESHOLD),
    createdAt: new Date(addDays(today, -60).getTime() + index * 1000),
  }))
  await prisma.product.createMany({ data: named.map(({ key, ...row }) => ({ ...row, accountId })) })

  const generated = generateCatalogue(TARGET.products - named.length, suppliersByName)
  await prisma.product.createMany({
    data: generated.map((row) => ({
      ...row,
      accountId,
      status: stockStatus(row.stockQty, LOW_STOCK_THRESHOLD),
      createdAt: addDays(today, -59),
    })),
  })

  return { byKey: new Map(named.map((row) => [row.key, row])), suppliersByName }
}

async function createPurchases(accountId, { byKey, suppliersByName }) {
  const year = now.getFullYear()
  const transactions = []

  for (const purchase of PURCHASES) {
    const lines = purchase.lines.map(([key, quantity, unitCost]) => ({
      productId: byKey.get(key).id,
      quantity,
      unitCost,
      subtotal: quantity * unitCost,
    }))
    const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0)
    const dueAmount = totalAmount - purchase.paid
    const createdAt = moment(purchase.daysAgo)
    const poNumber = `PO-${year}-${String(purchase.poNumber).padStart(3, '0')}`

    await prisma.purchase.create({
      data: {
        poNumber,
        accountId,
        supplierId: suppliersByName.get(purchase.supplier),
        itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        totalAmount,
        paidAmount: purchase.paid,
        dueAmount,
        status: dueAmount === 0 ? 'PAID' : 'PARTIAL',
        createdAt,
        items: { create: lines },
      },
    })
    transactions.push({
      type: 'EXPENSE',
      amount: purchase.paid,
      category: SUPPLIER_PAYMENT_CATEGORY,
      accountId,
      notes: `${poNumber} • ${purchase.supplier}`,
      createdAt,
    })
  }

  for (const { daysAgo, ...expense } of OPERATIONAL_EXPENSES) {
    transactions.push({ ...expense, type: 'EXPENSE', accountId, createdAt: moment(daysAgo) })
  }
  await prisma.transaction.createMany({ data: transactions })

  return `PO-${year}-018`
}

async function createSales(accountId, { byKey }) {
  const random = createRandom(2048)
  const prices = [...byKey].map(([key, product]) => ({ key, price: product.sellingPrice }))
  const basketTotal = (items) => items.reduce((sum, [key, qty]) => sum + byKey.get(key).sellingPrice * qty, 0)

  // Sales from the design, with their real payment channels.
  const drafts = [
    { daysAgo: 0, method: 'BKASH', items: [['rice', 2], ['sugar', 3]] },
    { daysAgo: 0, method: 'CASH', items: [['tea', 2], ['biscuits', 4]] },
    { daysAgo: 4, method: 'NAGAD', items: [['water', 12]] },
    { daysAgo: 5, method: 'CARD', items: [['milk', 1], ['oil', 1]] },
  ]

  const customers = []
  for (const person of CUSTOMERS) {
    const id = uuid()
    const total = basketTotal(person.items)
    const paid = person.paidLater?.amount ?? 0
    customers.push({ ...person, id, total, balance: total - paid })
    drafts.push({ daysAgo: person.saleDaysAgo, method: 'CREDIT', items: person.items, customerId: id, paid, name: person.name })
  }

  // Walk-in sales bring each day up to its total on the chart.
  const methods = ['CASH', 'CASH', 'CASH', 'BKASH', 'BKASH', 'NAGAD', 'ROCKET', 'UPAY', 'BANGLA_QR', 'CARD']
  DAILY_REVENUE.forEach((target, index) => {
    const daysAgo = DAILY_REVENUE.length - 1 - index
    const planned = drafts.filter((draft) => draft.daysAgo === daysAgo).reduce((sum, draft) => sum + basketTotal(draft.items), 0)
    for (const items of fillDay(target - planned, prices, random)) {
      drafts.push({ daysAgo, method: methods[random(methods.length)], items })
    }
  })

  await prisma.customer.createMany({
    data: customers.map((person) => ({
      id: person.id,
      accountId,
      name: person.name,
      phone: person.phone,
      totalCreditDue: person.balance,
      dueDate: addDays(today, person.dueInDays),
      createdAt: moment(person.saleDaysAgo, 0.1),
    })),
  })

  // Number the invoices in date order, so the newest has the highest number.
  const perDay = new Map()
  const dated = drafts
    .map((draft) => {
      const position = perDay.get(draft.daysAgo) ?? 0
      perDay.set(draft.daysAgo, position + 1)
      return { ...draft, position }
    })
    .map((draft) => ({ ...draft, createdAt: moment(draft.daysAgo, (draft.position + 1) / (perDay.get(draft.daysAgo) + 1)) }))
    .sort((a, b) => a.createdAt - b.createdAt)

  const firstNumber = 2001
  const sales = []
  const items = []
  const payments = []
  const transactions = []
  const ledger = []

  dated.forEach((draft, index) => {
    const id = uuid()
    const saleNumber = `INV-${firstNumber + index}`
    const totalAmount = basketTotal(draft.items)
    const isCredit = draft.method === 'CREDIT'
    const paidAmount = isCredit ? draft.paid : totalAmount

    sales.push({
      id,
      saleNumber,
      accountId,
      customerId: draft.customerId,
      totalAmount,
      paidAmount,
      dueAmount: totalAmount - paidAmount,
      paymentMethod: draft.method,
      createdAt: draft.createdAt,
    })
    for (const [key, quantity] of draft.items) {
      const product = byKey.get(key)
      items.push({ saleId: id, productId: product.id, quantity, unitPrice: product.sellingPrice, subtotal: product.sellingPrice * quantity })
    }

    if (isCredit) {
      ledger.push({ customerId: draft.customerId, type: 'CREDIT', amount: totalAmount, note: `Credit sale ${saleNumber}`, createdAt: draft.createdAt })
    } else {
      transactions.push({ type: 'INCOME', amount: totalAmount, category: 'Sales', accountId, notes: `Sale ${saleNumber}`, createdAt: draft.createdAt })
      payments.push({ accountId, saleId: id, method: draft.method, amount: totalAmount, appliedAmount: totalAmount, status: 'SUCCESS', createdAt: draft.createdAt })
    }
  })

  // Payments customers made after their credit sales.
  const LABEL_TO_METHOD = { bKash: 'BKASH', Cash: 'CASH', Nagad: 'NAGAD' }
  for (const person of customers) {
    if (!person.paidLater) continue
    const { amount, daysAgo, label } = person.paidLater
    const createdAt = moment(daysAgo)
    const kind = amount === person.total ? 'Full' : 'Partial'
    ledger.push({ customerId: person.id, type: 'PAYMENT', amount, note: `${kind} payment via ${label}`, createdAt })
    transactions.push({ type: 'DEBT_PAYMENT', amount, category: 'Customer Credit', accountId, notes: `${person.name} paid via ${label}`, createdAt })
    payments.push({ accountId, customerId: person.id, method: LABEL_TO_METHOD[label], amount, appliedAmount: amount, status: 'SUCCESS', createdAt })
  }

  await prisma.sale.createMany({ data: sales })
  await prisma.saleItem.createMany({ data: items })
  await prisma.payment.createMany({ data: payments })
  await prisma.transaction.createMany({ data: transactions })
  await prisma.creditEntry.createMany({ data: ledger })

  return { saleCount: sales.length, lastNumber: firstNumber + sales.length - 1, customers }
}

async function createNotifications(accountId, { byKey }, customers, poNumber) {
  const hoursAgo = (hours) => new Date(now.getTime() - hours * 3_600_000)
  const rahim = customers.find((person) => person.name === 'Rahim Ahmed')
  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { poNumber } })

  await prisma.notification.createMany({
    data: [
      { type: 'LOW_STOCK', title: 'Low stock alert', message: 'Cooking Oil 2L has only 8 units left.', entityId: byKey.get('oil').id, link: '/inventory?q=Cooking%20Oil', createdAt: hoursAgo(1) },
      { type: 'DEBT_DUE', title: 'Customer payment due', message: 'Rahim Ahmed • ৳ 12,500 outstanding', entityId: rahim.id, link: '/credit?q=Rahim', createdAt: hoursAgo(2) },
      { type: 'SUPPLIER_DUE', title: 'Supplier payment reminder', message: 'Fresh Supply Ltd. • Due tomorrow', entityId: purchase.id, link: `/purchases?view=${poNumber}`, createdAt: hoursAgo(3) },
      { type: 'PAYMENT_RECEIVED', title: 'Payment received', message: '৳ 2,450 received from Rahim Ahmed', entityId: rahim.id, link: '/credit?q=Rahim', createdAt: hoursAgo(4) },
      { type: 'REORDER', title: 'Reorder reminder', message: 'Detergent 1kg has run out and needs reordering.', entityId: byKey.get('detergent').id, link: '/inventory?q=Detergent', createdAt: hoursAgo(5) },
    ].map((row) => ({ ...row, accountId })),
  })
}

/** Reads the totals back through the same code the dashboard uses. A mismatch fails the seed. */
async function verify(accountId) {
  const finance = await computeFinance(accountId)
  const products = await prisma.product.count({ where: { accountId, deletedAt: null } })
  const actual = {
    revenue: finance.totalRevenue,
    expense: finance.totalExpense,
    profit: finance.netProfit,
    capital: computeCapital(CONFIGURED_CAPITAL, finance.netProfit),
    products,
  }
  for (const [name, value] of Object.entries(TARGET)) {
    if (actual[name] !== value) throw new Error(`Seed check failed: ${name} is ${actual[name]}, expected ${value}.`)
  }
  return actual
}

async function main() {
  if (config.isProduction) {
    throw new Error('The seed deletes all existing data, so it will not run with NODE_ENV=production.')
  }

  await wipe()
  const accountId = await createOwner()
  const catalogue = await createCatalogue(accountId)
  const poNumber = await createPurchases(accountId, catalogue)
  const { saleCount, lastNumber, customers } = await createSales(accountId, catalogue)
  await createNotifications(accountId, catalogue, customers, poNumber)

  await prisma.sequence.createMany({
    data: [
      { name: 'sale', value: lastNumber },
      { name: 'purchase', value: PURCHASES.at(-1).poNumber },
    ],
  })

  const totals = await verify(accountId)
  console.log('Seed complete.')
  console.log(`  Revenue:  ৳ ${totals.revenue.toLocaleString('en-US')} from ${saleCount} sales`)
  console.log(`  Expense:  ৳ ${totals.expense.toLocaleString('en-US')}`)
  console.log(`  Profit:   ৳ ${totals.profit.toLocaleString('en-US')}`)
  console.log(`  Capital:  ৳ ${totals.capital.toLocaleString('en-US')}`)
  console.log(`  Products: ${totals.products}`)
  console.log('  Sign in:  admin@dokan.example / dokan123')
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
