import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookUser, ChevronRight, PackageX, ShieldCheck, Truck, TriangleAlert } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { customerBalance, customerStatus, stockStatus, useStore } from '../../context/StoreContext.jsx'
import { taka } from '../../lib/format.js'

const TONES = {
  rose: 'border-brand-rose/30 bg-brand-rose/10 text-brand-rose',
  orange: 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange',
  cyan: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
}

/** Built from live data, so an alert disappears as soon as its cause is fixed. */
export default function SmartAlerts() {
  const { products, customers, purchases, derived } = useStore()

  const alerts = useMemo(() => {
    const list = []
    products.forEach((p) => {
      const status = stockStatus(p.stock, derived.threshold)
      if (status === 'out') list.push({ key: p.id, tone: 'rose', icon: PackageX, title: 'Out of stock', text: `${p.name} needs reordering`, to: `/inventory?q=${encodeURIComponent(p.name)}` })
      if (status === 'low') list.push({ key: p.id, tone: 'orange', icon: TriangleAlert, title: 'Low stock alert', text: `${p.name} has only ${p.stock} units left`, to: `/inventory?q=${encodeURIComponent(p.name)}` })
    })
    customers
      .filter((c) => customerStatus(c) === 'overdue')
      .forEach((c) => list.push({ key: c.id, tone: 'rose', icon: BookUser, title: 'Overdue payment', text: `${c.name} owes ${taka(customerBalance(c))}`, to: `/credit?q=${encodeURIComponent(c.name)}` }))
    purchases
      .filter((po) => po.total > po.paid)
      .forEach((po) => list.push({ key: po.id, tone: 'cyan', icon: Truck, title: 'Supplier due', text: `${po.supplier}: ${taka(po.total - po.paid)}`, to: `/purchases?view=${po.id}` }))
    return list
  }, [products, customers, purchases, derived.threshold])

  return (
    <GlassCard className="flex flex-col p-5">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Smart Alerts
            {alerts.length > 0 && <span className="rounded-full border border-brand-orange/40 bg-brand-orange/15 px-1.5 text-[11px] font-bold text-[#FDBA74]">{alerts.length}</span>}
          </span>
        }
        action={
          <Link to="/notifications" aria-label="Open notifications" className="rounded-lg p-1 text-frost-muted transition hover:bg-white/10 hover:text-frost">
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
        }
      />
      {alerts.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="All clear" message="No stock or payment issues right now." />
      ) : (
        <ul className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-0.5">
          {alerts.map((alert) => (
            <li key={alert.key}>
              <Link to={alert.to} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition duration-200 hover:border-white/25 hover:bg-white/[0.09]">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${TONES[alert.tone]}`}>
                  <alert.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-frost">{alert.title}</span>
                  <span className="block truncate text-xs text-frost-muted">{alert.text}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-frost-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
