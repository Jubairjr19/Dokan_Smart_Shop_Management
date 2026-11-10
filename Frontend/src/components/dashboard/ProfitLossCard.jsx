import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import Badge from '../ui/Badge.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { LAST_WEEK } from '../../data/mockData.js'
import { percentChange, taka } from '../../lib/format.js'

/** Half-open ring showing profit margin. The figure in the centre carries the value. */
function MarginGauge({ percent }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const sweep = 0.75 // The ring covers three quarters of a circle.
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 92 92" className="h-full w-full rotate-[135deg]" aria-hidden="true">
        <circle cx="46" cy="46" r={radius} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circumference * sweep} ${circumference}`} />
        <circle
          cx="46"
          cy="46"
          r={radius}
          fill="none"
          stroke="#34D399"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * sweep * (clamped / 100)} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700"
          style={{ filter: 'drop-shadow(0 0 5px rgba(52,211,153,.6))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-bold leading-none text-frost">{percent.toFixed(1)}%</span>
        <span className="mt-1 text-[10px] text-frost-muted">profit margin</span>
      </div>
    </div>
  )
}

function Meter({ label, value, share, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-frost-muted">{label}</span>
        <span className="font-semibold tabular-nums text-frost">{taka(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, share))}%`, background: color }} />
      </div>
    </div>
  )
}

export default function ProfitLossCard() {
  const { finance, derived } = useStore()
  const net = derived.netProfit
  const margin = finance.revenue ? (net / finance.revenue) * 100 : 0
  const change = percentChange(net, LAST_WEEK.revenue - LAST_WEEK.expense)
  const profitable = net >= 0

  return (
    <GlassCard className="flex flex-col p-5">
      <CardHeader title="Profit & Loss" subtitle="Your financial health, at a glance" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-frost-muted">{profitable ? 'Net Profit' : 'Net Loss'}</p>
          <p className={`mt-0.5 text-[28px] font-bold leading-tight tracking-tight ${profitable ? 'text-[#6EE7B7]' : 'text-[#FDA4B4]'}`}>{taka(Math.abs(net))}</p>
          <div className="mt-2">
            <Badge tone={change >= 0 ? 'emerald' : 'orange'} dot={false}>
              {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {Math.abs(change).toFixed(1)}% this week
            </Badge>
          </div>
        </div>
        <MarginGauge percent={margin} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <dt className="text-xs text-frost-muted">Customers owe you</dt>
          <dd className="mt-0.5 text-[15px] font-bold text-frost">{taka(derived.receivable)}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <dt className="text-xs text-frost-muted">You owe suppliers</dt>
          <dd className="mt-0.5 text-[15px] font-bold text-frost">{taka(derived.supplierDue)}</dd>
        </div>
      </dl>
      <div className="mt-auto space-y-3.5 pt-5">
        <Meter label="Revenue" value={finance.revenue} share={100} color="#0BA5C4" />
        <Meter label="Expenses" value={finance.expense} share={finance.revenue ? (finance.expense / finance.revenue) * 100 : 0} color="#E5640E" />
        <Meter label="Profit" value={net} share={margin} color="#34D399" />
      </div>
    </GlassCard>
  )
}
