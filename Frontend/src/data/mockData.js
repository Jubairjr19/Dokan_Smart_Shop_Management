import { daysFromNow } from '../lib/format.js'

/**
 * Demo data for the whole app. Figures come from the Dokan UI design, so the
 * totals reconcile: the 8 products below add up to the ৳ 118,460 stock value and
 * the 3 purchase orders add up to ৳ 86,200 / ৳ 70,600 / ৳ 15,600.
 */

export const DEMO_ACCOUNT = {
  name: 'Admin',
  email: 'admin@gmail.com',
  password: 'admin123',
  role: 'Shop owner',
}

/**
 * The brief asks for a Total Products counter of 828 while the demo table lists
 * 8 rows, so this many extra products are counted but not listed.
 * Set it to 0 and the counter shows the real row count (8).
 */
export const UNLISTED_PRODUCTS = 820

export const CATEGORIES = ['Grains', 'Essentials', 'Dairy', 'Beverages', 'Snacks', 'Household']

export const PAYMENT_CHANNELS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Upay', 'Bangla QR', 'Card']

/** Finance figures for the current week, and the week before for the "vs last week" deltas. */
export const SEED_FINANCE = { revenue: 248500, expense: 96400, capital: 685000 }
export const LAST_WEEK = { revenue: 220300, expense: 100600, capital: 637800 }

/** Revenue and expense series. The last point of each is the current period. */
export const SERIES = {
  today: {
    label: 'Today',
    previous: 'yesterday',
    labels: ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'],
    revenue: [2400, 4800, 6200, 5100, 6900, 5600, 3000],
    expense: [1200, 2100, 2600, 1900, 2800, 2000, 1400],
    previousRevenue: 44500,
    orders: 42,
  },
  weekly: {
    label: 'Weekly',
    previous: 'last week',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    revenue: [22000, 28500, 36000, 31500, 52000, 44500, 34000],
    expense: [9800, 12400, 14200, 13000, 17600, 15400, 14000],
    previousRevenue: LAST_WEEK.revenue,
    orders: 286,
  },
  monthly: {
    label: 'Monthly',
    previous: 'last month',
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    revenue: [201400, 214800, 220300, 248500],
    expense: [93200, 98700, 100600, 96400],
    previousRevenue: 812400,
    orders: 1104,
  },
}

export const SEED_PRODUCTS = [
  { id: 'PRD-001', name: 'Premium Rice 5kg', category: 'Grains', stock: 124, buyPrice: 520, sellPrice: 650, supplier: 'Bengal Wholesale', icon: 'wheat', unitsSold: 284, trend: 12.4 },
  { id: 'PRD-002', name: 'Cooking Oil 2L', category: 'Essentials', stock: 8, buyPrice: 310, sellPrice: 380, supplier: 'Fresh Supply Ltd.', icon: 'oil', unitsSold: 196, trend: 9.2 },
  { id: 'PRD-003', name: 'Sugar 1kg', category: 'Essentials', stock: 86, buyPrice: 110, sellPrice: 140, supplier: 'Bengal Wholesale', icon: 'sugar', unitsSold: 175, trend: 6.1 },
  { id: 'PRD-004', name: 'Milk Powder', category: 'Dairy', stock: 42, buyPrice: 580, sellPrice: 720, supplier: 'City Distributors', icon: 'milk', unitsSold: 128, trend: 9.5 },
  { id: 'PRD-005', name: 'Tea 400g', category: 'Beverages', stock: 56, buyPrice: 185, sellPrice: 240, supplier: 'Fresh Supply Ltd.', icon: 'tea', unitsSold: 112, trend: 4.8 },
  { id: 'PRD-006', name: 'Butter Biscuits', category: 'Snacks', stock: 62, buyPrice: 60, sellPrice: 85, supplier: 'City Distributors', icon: 'cookie', unitsSold: 94, trend: 3.2 },
  { id: 'PRD-007', name: 'Detergent 1kg', category: 'Household', stock: 0, buyPrice: 145, sellPrice: 180, supplier: 'City Distributors', icon: 'detergent', unitsSold: 71, trend: 1.4 },
  { id: 'PRD-008', name: 'Mineral Water', category: 'Beverages', stock: 180, buyPrice: 20, sellPrice: 30, supplier: 'Fresh Supply Ltd.', icon: 'water', unitsSold: 66, trend: 2.7 },
]

export const SEED_SUPPLIERS = [
  { id: 'SUP-001', name: 'Fresh Supply Ltd.', contact: 'Sylhet, Zindabazar', phone: '01700-000201' },
  { id: 'SUP-002', name: 'Bengal Wholesale', contact: 'Dhaka, Karwan Bazar', phone: '01700-000202' },
  { id: 'SUP-003', name: 'City Distributors', contact: 'Sylhet, Ambarkhana', phone: '01700-000203' },
]

const year = new Date().getFullYear()

export const SEED_PURCHASES = [
  {
    id: `PO-${year}-018`,
    supplier: 'Fresh Supply Ltd.',
    date: daysFromNow(-1),
    total: 28400,
    paid: 18000,
    lines: [
      { name: 'Cooking Oil 2L', qty: 5, unit: 'ctn', cost: 3600 },
      { name: 'Tea 400g', qty: 4, unit: 'ctn', cost: 1850 },
      { name: 'Mineral Water', qty: 3, unit: 'ctn', cost: 1000 },
    ],
  },
  {
    id: `PO-${year}-017`,
    supplier: 'Bengal Wholesale',
    date: daysFromNow(-2),
    total: 42600,
    paid: 42600,
    lines: [
      { name: 'Premium Rice 5kg', qty: 5, unit: 'ctn', cost: 6240 },
      { name: 'Sugar 1kg', qty: 3, unit: 'ctn', cost: 3800 },
    ],
  },
  {
    id: `PO-${year}-016`,
    supplier: 'City Distributors',
    date: daysFromNow(-3),
    total: 15200,
    paid: 10000,
    lines: [
      { name: 'Milk Powder', qty: 2, unit: 'ctn', cost: 5600 },
      { name: 'Butter Biscuits', qty: 2, unit: 'ctn', cost: 1200 },
      { name: 'Detergent 1kg', qty: 2, unit: 'ctn', cost: 800 },
    ],
  },
]

// Phone numbers are placeholders from an unassigned-looking range, not real customers.
export const SEED_CUSTOMERS = [
  {
    id: 'CUS-001',
    name: 'Rahim Ahmed',
    phone: '01700-000101',
    dueDate: daysFromNow(-4),
    ledger: [
      { id: 'L-101', type: 'credit', amount: 14950, note: 'Credit sale INV-2041', date: daysFromNow(-18) },
      { id: 'L-102', type: 'payment', amount: 2450, note: 'Partial payment via bKash', date: daysFromNow(-1) },
    ],
  },
  {
    id: 'CUS-002',
    name: 'Fatema Begum',
    phone: '01700-000102',
    dueDate: daysFromNow(3),
    ledger: [{ id: 'L-103', type: 'credit', amount: 6160, note: 'Credit sale INV-2044', date: daysFromNow(-9) }],
  },
  {
    id: 'CUS-003',
    name: 'Karim Uddin',
    phone: '01700-000103',
    dueDate: daysFromNow(-9),
    ledger: [
      { id: 'L-104', type: 'credit', amount: 9800, note: 'Credit sale INV-2036', date: daysFromNow(-24) },
      { id: 'L-105', type: 'payment', amount: 5000, note: 'Partial payment in cash', date: daysFromNow(-12) },
    ],
  },
  {
    id: 'CUS-004',
    name: 'Nasrin Akter',
    phone: '01700-000104',
    dueDate: daysFromNow(12),
    ledger: [{ id: 'L-106', type: 'credit', amount: 3160, note: 'Credit sale INV-2046', date: daysFromNow(-3) }],
  },
  {
    id: 'CUS-005',
    name: 'Jamal Hossain',
    phone: '01700-000105',
    dueDate: daysFromNow(-20),
    ledger: [
      { id: 'L-107', type: 'credit', amount: 4300, note: 'Credit sale INV-2029', date: daysFromNow(-34) },
      { id: 'L-108', type: 'payment', amount: 4300, note: 'Full payment via Nagad', date: daysFromNow(-22) },
    ],
  },
]

function sale(id, customer, method, daysAgo, items, paid) {
  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0)
  return { id, customer, method, date: daysFromNow(-daysAgo), items, subtotal: total, discount: 0, total, paid: paid ?? total, due: total - (paid ?? total) }
}

export const SEED_SALES = [
  sale('INV-2048', 'Walk-in customer', 'bKash', 0.1, [{ name: 'Premium Rice 5kg', qty: 2, price: 650 }, { name: 'Sugar 1kg', qty: 3, price: 140 }]),
  sale('INV-2047', 'Walk-in customer', 'Cash', 0.3, [{ name: 'Tea 400g', qty: 2, price: 240 }, { name: 'Butter Biscuits', qty: 4, price: 85 }]),
  sale('INV-2046', 'Nasrin Akter', 'Credit', 3, [{ name: 'Milk Powder', qty: 3, price: 720 }, { name: 'Cooking Oil 2L', qty: 2, price: 380 }, { name: 'Tea 400g', qty: 1, price: 240 }], 0),
  sale('INV-2045', 'Walk-in customer', 'Nagad', 4, [{ name: 'Mineral Water', qty: 12, price: 30 }]),
  sale('INV-2044', 'Fatema Begum', 'Credit', 9, [{ name: 'Premium Rice 5kg', qty: 8, price: 650 }, { name: 'Tea 400g', qty: 4, price: 240 }], 0),
  sale('INV-2043', 'Walk-in customer', 'Card', 11, [{ name: 'Milk Powder', qty: 1, price: 720 }, { name: 'Cooking Oil 2L', qty: 1, price: 380 }]),
]

const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString()

export const SEED_NOTIFICATIONS = [
  { id: 'N-1', category: 'stock', title: 'Low stock alert', message: 'Cooking Oil 2L has only 8 units left.', date: hoursAgo(1), read: false, link: '/inventory?q=Cooking%20Oil' },
  { id: 'N-2', category: 'customer', title: 'Customer payment due', message: `Rahim Ahmed • ৳ 12,500 outstanding`, date: hoursAgo(2), read: false, link: '/credit?q=Rahim' },
  { id: 'N-3', category: 'supplier', title: 'Supplier payment reminder', message: 'Fresh Supply Ltd. • Due tomorrow', date: hoursAgo(3), read: false, link: `/purchases?view=PO-${year}-018` },
  { id: 'N-4', category: 'customer', title: 'Payment received', message: `৳ 2,450 received from Rahim Ahmed`, date: hoursAgo(4), read: false, link: '/credit?q=Rahim' },
  { id: 'N-5', category: 'reorder', title: 'Reorder reminder', message: '2 products need replenishment.', date: hoursAgo(5), read: false, link: '/inventory?stock=attention' },
]

export const SEED_SETTINGS = {
  shop: {
    name: 'Dokan General Store',
    phone: '01700-000100',
    email: 'hello@dokan.example',
    address: 'Zindabazar, Sylhet, Bangladesh',
  },
  sms: {
    enabled: true,
    beforeDue: true,
    overdueDaily: true,
    daysBefore: 3,
    template: 'Dear {name}, your outstanding balance at {shop} is {amount}. Please pay by {date}. Thank you.',
  },
  lowStockAlerts: true,
  lowStockThreshold: 10,
  paymentReminders: true,
  twoFactor: false,
  compact: false,
  paymentMethods: {
    bKash: { enabled: true, account: '01700-000111', label: 'Merchant number' },
    Nagad: { enabled: true, account: '01700-000112', label: 'Merchant number' },
    Rocket: { enabled: false, account: '', label: 'Merchant number' },
    Upay: { enabled: false, account: '', label: 'Merchant number' },
    'Bangla QR': { enabled: true, account: 'DOKAN-QR-0001', label: 'QR merchant ID' },
    'Card API': { enabled: false, account: '', label: 'API key' },
  },
}
