import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, CircleDollarSign, Download, FileSearch, Minus, PackageSearch, Plus, ReceiptText, ShoppingBag, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GlassCard, { CardHeader } from '../components/ui/GlassCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import InvoiceModal from '../components/ui/InvoiceModal.jsx'
import MetricCard from '../components/ui/MetricCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProductAvatar from '../components/ui/ProductAvatar.jsx'
import SalesReportChart from '../components/charts/SalesReportChart.jsx'
import { Field, SearchInput, SegmentedControl, Select } from '../components/ui/Form.jsx'
import { SaleStatusBadge } from '../components/dashboard/RecentTransactions.jsx'
import { nextId, stockStatus, useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PAYMENT_CHANNELS, SEED_SALES } from '../data/mockData.js'
import { periodSeries } from '../lib/charts.js'
import { downloadText, toCsv } from '../lib/csv.js'
import { daysFromNow, formatDate, number, percentChange, taka, toInputDate } from '../lib/format.js'

const TABS = [
  { value: 'pos', label: 'New Sale' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'reports', label: 'Reports' },
]

/* ---------- Point of sale ---------- */

function Pos({ onCompleted }) {
  const { products, customers, sales, settings, derived, dispatch } = useStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // [{ productId, qty }]
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [discount, setDiscount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [paid, setPaid] = useState('') // Blank means paid in full.
  const [dueDate, setDueDate] = useState(toInputDate(daysFromNow(7)))
  const [errors, setErrors] = useState({})

  const channels = useMemo(() => {
    const enabled = PAYMENT_CHANNELS.filter((channel) => {
      if (channel === 'Cash') return true
      const key = channel === 'Card' ? 'Card API' : channel
      return settings.paymentMethods[key]?.enabled
    })
    return [...enabled, 'Credit']
  }, [settings.paymentMethods])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => !q || `${p.name} ${p.id} ${p.category}`.toLowerCase().includes(q))
  }, [products, search])

  const lines = cart.map((line) => ({ ...line, product: products.find((p) => p.id === line.productId) })).filter((line) => line.product)
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.product.sellPrice, 0)
  const discountValue = Math.min(subtotal, Math.max(0, Number(discount) || 0))
  const total = subtotal - discountValue
  const paidValue = method === 'Credit' && paid === '' ? 0 : paid === '' ? total : Math.max(0, Number(paid) || 0)
  const due = Math.max(0, total - paidValue)
  const change = Math.max(0, paidValue - total)

  const setQty = (productId, qty) => {
    setCart((list) => (qty <= 0 ? list.filter((line) => line.productId !== productId) : list.map((line) => (line.productId === productId ? { ...line, qty } : line))))
  }

  const addToCart = (product) => {
    const existing = cart.find((line) => line.productId === product.id)
    if (existing) {
      if (existing.qty >= product.stock) return toast(`Only ${product.stock} of ${product.name} in stock.`, 'error')
      setQty(product.id, existing.qty + 1)
    } else {
      setCart((list) => [...list, { productId: product.id, qty: 1 }])
    }
    setErrors({})
  }

  const complete = () => {
    const next = {}
    if (!lines.length) next.cart = 'Add at least one product.'
    if (due > 0 && !customerId) next.customer = 'Choose a customer to sell on credit.'
    if (customerId === 'new' && !newCustomer.name.trim()) next.newName = 'Enter the customer name.'
    if (customerId === 'new' && due > 0 && !newCustomer.phone.trim()) next.newPhone = 'A phone number is needed for reminders.'
    if (due > 0 && !dueDate) next.dueDate = 'Choose a due date.'
    setErrors(next)
    if (Object.keys(next).length) return

    const existing = customers.find((c) => c.id === customerId)
    const customerName = customerId === 'new' ? newCustomer.name.trim() : existing?.name || 'Walk-in customer'
    // The date field can be blank on a fully paid sale, where it isn't used.
    const dueIso = dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : daysFromNow(7)

    const sale = {
      id: nextId(sales, 'INV', 4),
      customerId: existing?.id,
      customer: customerName,
      method,
      date: new Date().toISOString(),
      dueDate: dueIso,
      items: lines.map((line) => ({ productId: line.productId, name: line.product.name, qty: line.qty, price: line.product.sellPrice })),
      subtotal,
      discount: discountValue,
      total,
      paid: Math.min(paidValue, total),
      due,
    }

    dispatch({
      type: 'sale/record',
      sale,
      newCustomer: customerId === 'new' ? { name: customerName, phone: newCustomer.phone.trim(), dueDate: dueIso } : undefined,
    })
    toast(`Sale ${sale.id} recorded${due > 0 ? `, ${taka(due)} added to ${customerName}'s dues` : ''}.`)
    onCompleted(sale)

    setCart([])
    setCustomerId('')
    setNewCustomer({ name: '', phone: '' })
    setDiscount('')
    setPaid('')
    setMethod('Cash')
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <GlassCard className="p-4">
        <SearchInput label="Search products to sell" placeholder="Search products to sell..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {visible.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products match" message="Try a different search." />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((product) => {
              const status = stockStatus(product.stock, derived.threshold)
              const inCart = cart.find((line) => line.productId === product.id)?.qty
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={status === 'out'}
                    onClick={() => addToCart(product)}
                    className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-brand-cyan/50 enabled:hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50 ${
                      inCart ? 'border-brand-cyan/50 bg-brand-cyan/10' : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <ProductAvatar product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-frost">{product.name}</span>
                      <span className={`block text-xs ${status === 'in' ? 'text-frost-muted' : status === 'low' ? 'text-[#FDBA74]' : 'text-[#FDA4B4]'}`}>{status === 'out' ? 'Out of stock' : `${number(product.stock)} in stock`}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[13.5px] font-bold text-frost">{taka(product.sellPrice)}</span>
                      {inCart && <span className="block text-xs font-semibold text-brand-cyan">× {inCart}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>

      <GlassCard className="p-5 xl:sticky xl:top-[92px]">
        <CardHeader title="Current Sale" action={<ShoppingCart className="h-[18px] w-[18px] text-frost-muted" aria-hidden="true" />} />

        {lines.length === 0 ? (
          <p className={`mt-3 rounded-xl border border-dashed px-3 py-6 text-center text-[13px] ${errors.cart ? 'border-brand-rose/50 text-[#FDA4B4]' : 'border-white/15 text-frost-muted'}`}>{errors.cart || 'Tap a product to add it to this sale.'}</p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-0.5">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-frost">{product.name}</span>
                  <span className="block text-xs tabular-nums text-frost-muted">{taka(qty * product.sellPrice)}</span>
                </span>
                <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => setQty(product.id, qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-frost-soft transition hover:bg-white/10 active:scale-95">
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-[13px] font-bold tabular-nums text-frost">{qty}</span>
                <button type="button" aria-label={`Add one ${product.name}`} disabled={qty >= product.stock} onClick={() => setQty(product.id, qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-frost-soft transition hover:bg-white/10 active:scale-95 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove ${product.name} from sale`} onClick={() => setQty(product.id, 0)} className="flex h-7 w-7 items-center justify-center rounded-lg text-frost-muted transition hover:bg-brand-rose/10 hover:text-brand-rose">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3">
          <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} error={errors.customer}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="new">+ New customer</option>
          </Select>
          {customerId === 'new' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} error={errors.newName} />
              <Field label="Phone" type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} error={errors.newPhone} />
            </div>
          )}

          <div>
            <p className="field-label">Payment method</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Payment method">
              {channels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={method === channel}
                  onClick={() => {
                    setMethod(channel)
                    setPaid('')
                  }}
                  className={`h-8 rounded-lg border px-2.5 text-xs font-semibold transition duration-200 active:scale-95 ${
                    method === channel ? 'border-brand-cyan/60 bg-brand-cyan/15 text-frost shadow-[0_0_14px_-4px_rgba(34,211,238,.8)]' : 'border-white/15 text-frost-soft hover:border-white/30 hover:bg-white/[0.07]'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (৳)" type="number" min="0" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Field label="Amount paid (৳)" type="number" min="0" inputMode="decimal" placeholder={taka(method === 'Credit' ? 0 : total)} value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
          {due > 0 && <Field label="Balance due by" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate} />}
        </div>

        <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-[13.5px]">
          <div className="flex justify-between text-frost-soft">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{taka(subtotal)}</dd>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-frost-soft">
              <dt>Discount</dt>
              <dd className="tabular-nums">-{taka(discountValue)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[17px] font-bold text-frost">
            <dt>Total</dt>
            <dd className="tabular-nums">{taka(total)}</dd>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-semibold text-[#FDBA74]">
              <dt>Balance due</dt>
              <dd className="tabular-nums">{taka(due)}</dd>
            </div>
          )}
          {change > 0 && (
            <div className="flex justify-between font-semibold text-[#6EE7B7]">
              <dt>Change to return</dt>
              <dd className="tabular-nums">{taka(change)}</dd>
            </div>
          )}
        </dl>

        <Button variant="primary" size="lg" className="mt-4 w-full" icon={ReceiptText} onClick={complete}>
          Complete Sale
        </Button>
      </GlassCard>
    </div>
  )
}

/* ---------- Invoices ---------- */

function Invoices({ onView }) {
  const { sales } = useStore()
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales.filter((s) => !q || `${s.id} ${s.customer} ${s.method}`.toLowerCase().includes(q))
  }, [sales, search])

  return (
    <GlassCard className="overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <SearchInput label="Search invoices" placeholder="Search by invoice, customer or payment method..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={FileSearch} title="No invoices match" message="Try a different search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Customer</th>
                <th scope="col" className="num">
                  Items
                </th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col" className="num">
                  Due
                </th>
                <th scope="col">Payment</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((sale) => (
                <tr key={sale.id}>
                  <td className="font-semibold text-frost">{sale.id}</td>
                  <td>{sale.customer}</td>
                  <td className="num">{number(sale.items.reduce((sum, item) => sum + item.qty, 0))}</td>
                  <td className="num font-semibold text-frost">{taka(sale.total)}</td>
                  <td className="num">{taka(sale.due)}</td>
                  <td>{sale.method}</td>
                  <td>
                    <SaleStatusBadge sale={sale} />
                  </td>
                  <td>{formatDate(sale.date)}</td>
                  <td>
                    <Button size="sm" onClick={() => onView(sale)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}

/* ---------- Reports (FR-05) ---------- */

const REPORT_PERIODS = [
  { value: 'today', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function Reports() {
  const { finance, sales } = useStore()
  const { toast } = useToast()
  const [period, setPeriod] = useState('weekly')

  const series = periodSeries(period, finance)
  const periodLabel = REPORT_PERIODS.find((p) => p.value === period).label
  const orders = series.orders + (sales.length - SEED_SALES.length)
  const average = orders ? series.totalRevenue / orders : 0

  const exportReport = () => {
    const rows = series.labels.map((label, i) => [label, series.revenue[i], series.expense[i], series.revenue[i] - series.expense[i]])
    downloadText(`dokan-${periodLabel.toLowerCase()}-sales-${toInputDate()}.csv`, toCsv(['Period', 'Revenue', 'Expenses', 'Profit'], rows))
    toast(`${periodLabel} report exported to CSV.`)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Report period" options={REPORT_PERIODS} value={period} onChange={setPeriod} />
        <Button icon={Download} onClick={exportReport}>
          Export Report
        </Button>
      </div>

      <section aria-label={`${periodLabel} sales summary`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label={`${periodLabel} Revenue`} value={taka(series.totalRevenue)} icon={CircleDollarSign} glow="cyan" delta={percentChange(series.totalRevenue, series.previousRevenue)} caption={`vs ${series.previous}`} />
        <MetricCard label="Orders" value={number(orders)} icon={ShoppingBag} glow="indigo" />
        <MetricCard label="Average Sale" value={taka(average)} icon={Wallet} glow="emerald" />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="p-5 xl:col-span-2">
          <CardHeader title={`${periodLabel} Revenue`} subtitle={`Total ${taka(series.totalRevenue)}`} action={<BarChart3 className="h-[18px] w-[18px] text-frost-muted" aria-hidden="true" />} />
          <div className="relative mt-4 h-72">
            <SalesReportChart labels={series.labels} values={series.revenue} periodLabel={periodLabel} />
          </div>
        </GlassCard>
        <GlassCard className="min-w-0 overflow-hidden">
          <CardHeader className="p-5 pb-3" title="Breakdown" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col" className="num">
                    Revenue
                  </th>
                  <th scope="col" className="num">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.labels.map((label, i) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num">{taka(series.revenue[i])}</td>
                    <td className="num font-semibold text-[#6EE7B7]">{taka(series.revenue[i] - series.expense[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </>
  )
}

/* ---------- Page ---------- */

export default function Sales() {
  const { sales } = useStore()
  const [params, setParams] = useSearchParams()
  const [viewing, setViewing] = useState(null)
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'pos'

  // Dashboard and global search can link straight to one invoice.
  useEffect(() => {
    const id = params.get('view')
    if (id) setViewing(sales.find((s) => s.id === id) || null)
    // Only the link should open the invoice, not later changes to the sales list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const closeInvoice = () => {
    setViewing(null)
    if (params.get('view')) {
      params.delete('view')
      setParams(params, { replace: true })
    }
  }

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Quick billing, digital invoices and clear reports."
        actions={
          <SegmentedControl
            label="Sales section"
            options={TABS}
            value={tab}
            onChange={(value) => setParams(value === 'pos' ? {} : { tab: value }, { replace: true })}
          />
        }
      />
      {tab === 'pos' && <Pos onCompleted={setViewing} />}
      {tab === 'invoices' && <Invoices onView={setViewing} />}
      {tab === 'reports' && <Reports />}
      {viewing && <InvoiceModal sale={viewing} onClose={closeInvoice} />}
    </>
  )
}
