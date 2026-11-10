import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BookUser, Boxes, ChevronDown, LogOut, Menu, ReceiptText, Search, Settings, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { initials } from '../../lib/format.js'

const TITLES = {
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/purchases': 'Purchases & Suppliers',
  '/credit': 'Credit Records',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
}

function GlobalSearch() {
  const { products, customers, purchases, sales } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    const onClickAway = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickAway)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickAway)
    }
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const match = (...fields) => fields.some((field) => field.toLowerCase().includes(q))
    return [
      ...products.filter((p) => match(p.name, p.id)).map((p) => ({ key: p.id, icon: Boxes, title: p.name, meta: `Product · ${p.id}`, to: `/inventory?q=${encodeURIComponent(p.name)}` })),
      ...customers.filter((c) => match(c.name, c.phone)).map((c) => ({ key: c.id, icon: BookUser, title: c.name, meta: `Customer · ${c.phone}`, to: `/credit?q=${encodeURIComponent(c.name)}` })),
      ...sales.filter((s) => match(s.id, s.customer)).map((s) => ({ key: s.id, icon: ReceiptText, title: s.id, meta: `Invoice · ${s.customer}`, to: `/sales?tab=invoices&view=${s.id}` })),
      ...purchases.filter((po) => match(po.id, po.supplier)).map((po) => ({ key: po.id, icon: ShoppingCart, title: po.id, meta: `Purchase · ${po.supplier}`, to: `/purchases?view=${po.id}` })),
    ].slice(0, 7)
  }, [query, products, customers, sales, purchases])

  const go = (to) => {
    navigate(to)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-frost-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) go(results[0].to)
          if (e.key === 'Escape') {
            setOpen(false)
            e.currentTarget.blur()
          }
        }}
        placeholder="Search products, customers, invoices..."
        aria-label="Search products, customers, invoices"
        className="field !h-10 pl-10 sm:pr-16"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 bg-white/[0.07] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-frost-muted sm:block">
        {isMac ? '⌘ K' : 'Ctrl K'}
      </kbd>
      {open && query.trim() && (
        <div className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-50 animate-fade-in overflow-hidden !bg-slate-900/90 p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-frost-muted">No matches for "{query.trim()}"</p>
          ) : (
            results.map((result) => (
              <button key={result.key} type="button" onClick={() => go(result.to)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.08]">
                <result.icon className="h-4 w-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-frost">{result.title}</span>
                  <span className="block truncate text-xs text-frost-muted">{result.meta}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !wrapRef.current?.contains(event.target))) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu" className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition hover:bg-white/10">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan/50 to-indigo-500/50 text-xs font-bold text-frost ring-1 ring-white/25">{initials(user?.name)}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-frost-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 top-[calc(100%+8px)] z-50 w-56 animate-fade-in !bg-slate-900/90 p-1.5">
          <div className="border-b border-white/10 px-3 py-2.5">
            <p className="truncate text-[13.5px] font-bold text-frost">{user?.name}</p>
            <p className="truncate text-xs text-frost-muted">{user?.email}</p>
          </div>
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-frost-soft transition hover:bg-white/[0.08] hover:text-frost">
            <Settings className="h-4 w-4" aria-hidden="true" /> Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-frost-soft transition hover:bg-brand-rose/10 hover:text-[#FDA4B4]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onOpenMenu }) {
  const { user } = useAuth()
  const { derived } = useStore()
  const { pathname } = useLocation()
  const isDashboard = pathname === '/dashboard'

  return (
    <header className="glass sticky top-3 z-30 flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="rounded-lg p-2 text-frost-soft transition hover:bg-white/10 lg:hidden">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="hidden min-w-0 flex-1 sm:block">
        {isDashboard ? (
          <>
            <p className="truncate text-[17px] font-bold leading-tight text-frost">Good morning, {user?.name}</p>
            <p className="truncate text-xs text-frost-muted">Here's what's happening with your business today.</p>
          </>
        ) : (
          <p className="truncate text-sm font-semibold text-frost-soft">{TITLES[pathname] || 'Dokan'}</p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <GlobalSearch />
      </div>

      <div className="flex flex-none items-center justify-end gap-1.5 sm:flex-1">
        <Link to="/notifications" aria-label={`Notifications, ${derived.unread} unread`} className="group relative rounded-xl p-2.5 text-frost-soft transition hover:bg-white/10 hover:text-frost">
          <Bell className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
          {derived.unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-cosmos-900 shadow-[0_0_10px_rgba(251,146,60,.8)]">{derived.unread}</span>
          )}
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />
        <ProfileMenu />
      </div>
    </header>
  )
}
