import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Boxes, Download, PackageSearch, PackageX, Pencil, Plus, ShoppingCart, Trash2, TriangleAlert, Upload, Wallet } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import MetricCard from '../components/ui/MetricCard.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ProductAvatar from '../components/ui/ProductAvatar.jsx'
import { StockBadge } from '../components/ui/Badge.jsx'
import { Field, SearchInput, Select } from '../components/ui/Form.jsx'
import { stockStatus, useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { CATEGORIES } from '../data/mockData.js'
import { downloadText, parseCsv, toCsv } from '../lib/csv.js'
import { number, taka, toInputDate } from '../lib/format.js'

const STATUS_LABEL = { in: 'In stock', low: 'Low stock', out: 'Out of stock' }

function ProductModal({ product, onClose }) {
  const { suppliers, dispatch } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState(
    product
      ? { name: product.name, category: product.category, supplier: product.supplier, stock: String(product.stock), buyPrice: String(product.buyPrice), sellPrice: String(product.sellPrice) }
      : { name: '', category: CATEGORIES[0], supplier: suppliers[0]?.name ?? '', stock: '', buyPrice: '', sellPrice: '' },
  )
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const isCount = (value) => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0
  const isAmount = (value) => value !== '' && Number(value) >= 0

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Enter a product name.'
    if (!isCount(form.stock)) next.stock = 'Enter a whole number, 0 or more.'
    if (!isAmount(form.buyPrice)) next.buyPrice = 'Enter a price.'
    if (!isAmount(form.sellPrice)) next.sellPrice = 'Enter a price.'
    setErrors(next)
    if (Object.keys(next).length) return

    const values = {
      name: form.name.trim(),
      category: form.category,
      supplier: form.supplier,
      stock: Number(form.stock),
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
    }
    if (product) {
      dispatch({ type: 'product/update', id: product.id, changes: values })
      toast(`${values.name} updated.`)
    } else {
      dispatch({ type: 'product/add', product: values })
      toast(`${values.name} added to inventory.`)
    }
    onClose()
  }

  const belowCost = form.buyPrice !== '' && form.sellPrice !== '' && Number(form.sellPrice) < Number(form.buyPrice)

  return (
    <Modal
      title={product ? 'Edit Product' : 'Add Product'}
      subtitle={product ? product.id : 'It appears in inventory and the sales screen right away.'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form" variant="primary">
            {product ? 'Save Changes' : 'Add Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Product name" value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Red Lentils 1kg" />
        <Select label="Category" value={form.category} onChange={set('category')}>
          {CATEGORIES.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select label="Supplier" value={form.supplier} onChange={set('supplier')}>
          {suppliers.map((supplier) => (
            <option key={supplier.id}>{supplier.name}</option>
          ))}
        </Select>
        <Field label="Stock quantity" type="number" min="0" inputMode="numeric" value={form.stock} onChange={set('stock')} error={errors.stock} placeholder="0" />
        <div className="hidden sm:block" />
        <Field label="Buying price (৳)" type="number" min="0" inputMode="decimal" value={form.buyPrice} onChange={set('buyPrice')} error={errors.buyPrice} placeholder="0" />
        <Field
          label="Selling price (৳)"
          type="number"
          min="0"
          inputMode="decimal"
          value={form.sellPrice}
          onChange={set('sellPrice')}
          error={errors.sellPrice}
          hint={belowCost ? 'This is below the buying price, so each sale makes a loss.' : undefined}
          placeholder="0"
        />
      </form>
    </Modal>
  )
}

export default function Inventory() {
  const { products, suppliers, derived, dispatch } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef(null)

  const [search, setSearch] = useState(params.get('q') || '')
  const [category, setCategory] = useState('all')
  const [supplier, setSupplier] = useState('all')
  const [stock, setStock] = useState(params.get('stock') || 'all')
  const [editing, setEditing] = useState(null) // null, 'new', or a product
  const [deleting, setDeleting] = useState(null)

  // Global search and notifications can link here while this page is already open.
  useEffect(() => {
    setSearch(params.get('q') || '')
    setStock(params.get('stock') || 'all')
  }, [params])

  const categories = useMemo(() => [...new Set([...CATEGORIES, ...products.map((p) => p.category)])], [products])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const status = stockStatus(p.stock, derived.threshold)
      if (q && !`${p.name} ${p.id}`.toLowerCase().includes(q)) return false
      if (category !== 'all' && p.category !== category) return false
      if (supplier !== 'all' && p.supplier !== supplier) return false
      if (stock === 'attention') return status !== 'in'
      if (stock !== 'all' && status !== stock) return false
      return true
    })
  }, [products, search, category, supplier, stock, derived.threshold])

  const exportCsv = () => {
    const rows = visible.map((p) => [p.id, p.name, p.category, p.stock, p.buyPrice, p.sellPrice, p.supplier, STATUS_LABEL[stockStatus(p.stock, derived.threshold)]])
    downloadText(`dokan-inventory-${toInputDate()}.csv`, toCsv(['SKU', 'Product Name', 'Category', 'Stock Qty', 'Buying Price', 'Selling Price', 'Supplier', 'Status'], rows))
    toast(`Exported ${rows.length} products to CSV.`)
  }

  const importCsv = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const rows = parseCsv(await file.text())
    const valid = rows
      .map((row) => ({
        name: row['product name'] || row.name || '',
        category: row.category || CATEGORIES[0],
        supplier: row.supplier || suppliers[0]?.name || '',
        stock: Number(row['stock qty'] ?? row.stock),
        buyPrice: Number(row['buying price']),
        sellPrice: Number(row['selling price']),
      }))
      .filter((p) => p.name && Number.isInteger(p.stock) && p.stock >= 0 && p.buyPrice >= 0 && p.sellPrice >= 0)

    if (!valid.length) {
      toast('No valid rows found. Use the same columns as the Export file.', 'error')
      return
    }
    dispatch({ type: 'product/import', rows: valid })
    const skipped = rows.length - valid.length
    toast(`Imported ${valid.length} products${skipped ? `, skipped ${skipped} invalid rows` : ''}.`)
  }

  const confirmDelete = () => {
    dispatch({ type: 'product/delete', id: deleting.id })
    toast(`${deleting.name} deleted.`)
    setDeleting(null)
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="A little organization. A lot more peace of mind."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" aria-label="Import products from a CSV file" />
            <Button icon={Upload} onClick={() => fileRef.current?.click()}>
              Import
            </Button>
            <Button icon={Download} onClick={exportCsv}>
              Export
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
              Add Product
            </Button>
          </>
        }
      />

      <section aria-label="Inventory summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Products" value={number(derived.inventory.total)} icon={Boxes} glow="cyan" delta={8.2} spark={[3, 4, 4, 5, 5, 6, 6, 7, 7, 8]} />
        <MetricCard label="Stock Value" value={taka(derived.inventory.value)} icon={Wallet} glow="emerald" delta={-5.4} spark={[9, 8, 8.500, 7, 7.500, 6.500, 7, 6, 6.200, 5.800]} />
        <MetricCard label="Low Stock" value={number(derived.inventory.low)} icon={TriangleAlert} glow="orange" upIsGood={false} delta={2.1} spark={[1, 2, 1, 3, 2, 3, 2, 4, 3, 3]} />
        <MetricCard label="Out of Stock" value={number(derived.inventory.out)} icon={PackageX} glow="rose" upIsGood={false} delta={0} spark={[2, 1, 2, 1, 1, 2, 1, 1, 1, 1]} />
      </section>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
          <SearchInput className="min-w-[220px] flex-[2_1_260px]" label="Search products" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select className="min-w-[150px] flex-1" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select className="min-w-[150px] flex-1" aria-label="Filter by supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="all">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select className="min-w-[150px] flex-1" aria-label="Filter by stock status" value={stock} onChange={(e) => setStock(e.target.value)}>
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="attention">Needs reorder</option>
          </Select>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products match" message="Try a different search or clear the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Product Name</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">
                    Stock Qty
                  </th>
                  <th scope="col" className="num">
                    Buying Price
                  </th>
                  <th scope="col" className="num">
                    Selling Price
                  </th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Stock Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const status = stockStatus(product.stock, derived.threshold)
                  return (
                    <tr key={product.id}>
                      <td>
                        <span className="flex items-center gap-3">
                          <ProductAvatar product={product} />
                          <span>
                            <span className="block font-semibold text-frost">{product.name}</span>
                            <span className="block text-xs text-frost-muted">{product.id}</span>
                          </span>
                        </span>
                      </td>
                      <td>{product.category}</td>
                      <td className="num font-semibold text-frost">{number(product.stock)}</td>
                      <td className="num">{taka(product.buyPrice)}</td>
                      <td className="num">{taka(product.sellPrice)}</td>
                      <td>{product.supplier}</td>
                      <td>
                        <StockBadge status={status} />
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          {status !== 'in' && (
                            <Button size="icon" aria-label={`Reorder ${product.name}`} title="Reorder" onClick={() => navigate('/purchases', { state: { reorder: product.id } })} className="text-brand-orange">
                              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button size="icon" aria-label={`Edit ${product.name}`} title="Edit" onClick={() => setEditing(product)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button size="icon" aria-label={`Delete ${product.name}`} title="Delete" onClick={() => setDeleting(product)} className="text-brand-rose hover:!border-brand-rose/50 hover:!bg-brand-rose/10">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 px-5 py-3 text-xs text-frost-muted">
          <span>
            Showing {number(visible.length)} of {number(derived.inventory.total)} products
          </span>
          <span>Updated just now</span>
        </div>
      </GlassCard>

      {editing && <ProductModal product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <ConfirmDialog title="Delete this product?" message={`${deleting.name} will be removed from inventory. Past sales and purchases keep their records.`} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />}
    </>
  )
}
