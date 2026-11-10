import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, BookUser, Boxes, ChevronsLeft, LayoutDashboard, LogOut, ReceiptText, Settings, ShoppingCart, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { initials } from '../../lib/format.js'
import { LogoMark, Wordmark } from '../ui/Logo.jsx'

const GROUPS = [
  { label: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Business',
    items: [
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/sales', label: 'Sales', icon: ReceiptText },
      { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { to: '/credit', label: 'Credit Records', icon: BookUser },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function NavItem({ item, collapsed, unread, onNavigate }) {
  const Icon = item.icon
  const count = item.badge ? unread : 0
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex h-10 items-center gap-3 rounded-xl border text-[13.5px] font-semibold transition duration-200 ${collapsed ? 'justify-center px-0' : 'px-3'} ${
          isActive
            ? 'border-brand-cyan/40 bg-brand-cyan/[0.12] text-frost shadow-[0_0_22px_-8px_rgba(34,211,238,.9),inset_0_1px_0_rgba(255,255,255,.12)]'
            : 'border-transparent text-frost-soft hover:bg-white/[0.07] hover:text-frost'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-px top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(34,211,238,.9)]" aria-hidden="true" />}
          <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-brand-cyan' : ''}`} aria-hidden="true" />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {count > 0 &&
            (collapsed ? (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(251,146,60,.9)]" aria-hidden="true" />
            ) : (
              <span className="rounded-full border border-brand-orange/40 bg-brand-orange/15 px-1.5 text-[11px] font-bold text-[#FDBA74]">{count}</span>
            ))}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth()
  const { derived } = useStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // The mobile drawer always shows full labels.
  const compact = collapsed && !mobileOpen

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 animate-fade-in bg-cosmos-950/70 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        aria-label="Main navigation"
        className={`glass fixed bottom-3 left-3 top-3 z-50 flex flex-col p-3 transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:sticky lg:bottom-auto lg:left-auto lg:top-3 lg:z-20 lg:h-[calc(100dvh-1.5rem)] lg:shrink-0 lg:translate-x-0 ${
          compact ? 'lg:w-[76px]' : 'lg:w-[252px]'
        } w-[252px] ${mobileOpen ? 'translate-x-0 !bg-slate-900/90' : '-translate-x-[calc(100%+1rem)]'}`}
      >
        <div className={`flex items-center gap-2.5 pb-3 ${compact ? 'justify-center' : 'px-1'}`}>
          <LogoMark className="h-10 w-10" />
          {!compact && (
            <div className="min-w-0 flex-1">
              <Wordmark className="block text-xl leading-none" />
              <span className="mt-1 block truncate text-[9.5px] font-semibold uppercase tracking-[0.12em] text-frost-muted">Smart shop management</span>
            </div>
          )}
          <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="rounded-lg p-1.5 text-frost-muted hover:bg-white/10 hover:text-frost lg:hidden">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="-mx-1 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-1 py-2">
          {GROUPS.map((group) => (
            <div key={group.label}>
              {compact ? <div className="mx-3 mb-2 h-px bg-white/10" aria-hidden="true" /> : <p className="eyebrow mb-1.5 px-3 !text-[10px]">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={compact} unread={derived.unread} onNavigate={onCloseMobile} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
          {!compact && (
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-frost">
                <span className="h-2 w-2 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(52,211,153,.9)]" aria-hidden="true" />
                Your business, in sync
              </p>
              <p className="mt-0.5 pl-4 text-[11px] text-frost-muted">All changes saved securely</p>
            </div>
          )}

          <div className={`flex items-center gap-2.5 ${compact ? 'flex-col' : 'px-1'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan/50 to-indigo-500/50 text-xs font-bold text-frost ring-1 ring-white/25">{initials(user?.name)}</span>
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-frost">{user?.name}</p>
                <p className="truncate text-[11px] text-frost-muted">{user?.role}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={compact ? 'Logout' : undefined}
            aria-label={compact ? 'Logout' : undefined}
            className={`group flex h-10 w-full items-center gap-3 rounded-xl text-[13.5px] font-semibold text-frost-soft transition duration-200 hover:bg-brand-rose/10 hover:text-[#FDA4B4] ${compact ? 'justify-center' : 'px-3'}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            {!compact && 'Logout'}
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden h-8 w-full items-center justify-center rounded-lg text-frost-muted transition hover:bg-white/10 hover:text-frost lg:flex"
          >
            <ChevronsLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  )
}
