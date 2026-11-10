import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CheckCheck, ChevronRight, Package, RefreshCw, Truck, Wallet } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { timeAgo } from '../lib/format.js'

const CATEGORIES = {
  stock: { label: 'Low stock', icon: Package, tile: 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange' },
  customer: { label: 'Customer dues', icon: Wallet, tile: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan' },
  supplier: { label: 'Supplier reminders', icon: Truck, tile: 'border-indigo-300/30 bg-indigo-400/10 text-indigo-300' },
  reorder: { label: 'Reorder notices', icon: RefreshCw, tile: 'border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald' },
}

export default function Notifications() {
  const { notifications, derived, dispatch } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filters = useMemo(() => {
    const count = (test) => notifications.filter(test).length
    return [
      { key: 'all', label: 'All', count: notifications.length },
      { key: 'unread', label: 'Unread', count: derived.unread },
      ...Object.entries(CATEGORIES).map(([key, { label }]) => ({ key, label, count: count((n) => n.category === key) })),
    ]
  }, [notifications, derived.unread])

  const visible = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return n.category === filter
  })

  const open = (notification) => {
    dispatch({ type: 'notification/read', id: notification.id })
    if (notification.link) navigate(notification.link)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="A little heads-up goes a long way."
        actions={
          <Button
            icon={CheckCheck}
            disabled={derived.unread === 0}
            onClick={() => {
              dispatch({ type: 'notification/readAll' })
              toast('All notifications marked as read.')
            }}
          >
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition duration-200 active:scale-95 ${
              filter === key ? 'border-brand-cyan/50 bg-brand-cyan/15 text-frost shadow-[0_0_18px_-6px_rgba(34,211,238,.8)]' : 'border-white/15 bg-white/[0.05] text-frost-soft hover:border-white/30 hover:bg-white/10'
            }`}
          >
            {label}
            <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      <GlassCard className="p-3 sm:p-4">
        {visible.length === 0 ? (
          <EmptyState icon={BellOff} title="Nothing here" message={filter === 'unread' ? "You're all caught up." : 'New alerts in this category will appear here.'} />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((notification) => {
              const category = CATEGORIES[notification.category]
              const Icon = category.icon
              return (
                <li
                  key={notification.id}
                  className={`flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl border p-3 transition duration-200 hover:border-white/25 sm:flex-nowrap ${
                    notification.read ? 'border-white/[0.07] bg-white/[0.02]' : 'border-white/15 bg-white/[0.07]'
                  }`}
                >
                  <button type="button" onClick={() => open(notification)} className="group flex min-w-0 flex-[1_1_100%] items-center gap-3.5 text-left sm:flex-1">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${category.tile}`}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${notification.read ? 'font-semibold text-frost-soft' : 'font-bold text-frost'}`}>{notification.title}</span>
                      <span className="block truncate text-[13px] text-frost-muted">{notification.message}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-frost-muted transition-transform group-hover:translate-x-0.5 sm:order-last" aria-hidden="true" />
                  </button>
                  <span className="ml-[3.4rem] flex items-center gap-2.5 sm:ml-0">
                    <span className="whitespace-nowrap text-xs text-frost-muted">{timeAgo(notification.date)}</span>
                    <Badge tone={notification.read ? 'slate' : 'cyan'}>{notification.read ? 'Read' : 'Unread'}</Badge>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'notification/toggle', id: notification.id })}
                      className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-frost-muted transition hover:bg-white/10 hover:text-frost"
                    >
                      Mark {notification.read ? 'unread' : 'read'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>
    </>
  )
}
