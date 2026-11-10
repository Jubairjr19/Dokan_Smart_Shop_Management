import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import Sparkline from '../charts/Sparkline.jsx'

const GLOWS = {
  cyan: { rgb: '34, 211, 238', icon: 'text-brand-cyan', stroke: '#22D3EE' },
  orange: { rgb: '251, 146, 60', icon: 'text-brand-orange', stroke: '#FB923C' },
  emerald: { rgb: '52, 211, 153', icon: 'text-brand-emerald', stroke: '#34D399' },
  rose: { rgb: '251, 113, 133', icon: 'text-brand-rose', stroke: '#FB7185' },
  indigo: { rgb: '129, 140, 248', icon: 'text-indigo-300', stroke: '#A5B4FC' },
}

/**
 * Metric tile with a glowing glass edge and a sheen that follows the pointer.
 * `delta` is a percentage. `upIsGood={false}` flips the colour for costs, so a
 * falling expense reads as good news.
 */
export default function MetricCard({ label, value, icon: Icon, glow = 'cyan', delta, upIsGood = true, caption = 'vs last week', spark }) {
  const theme = GLOWS[glow]

  const trackPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  const up = delta >= 0
  const good = up === upIsGood
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="glass glass-glow overflow-hidden p-5" style={{ '--glow': theme.rgb }} onMouseMove={trackPointer}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow pt-1">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07]">
          <Icon className={`h-[18px] w-[18px] ${theme.icon}`} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-[27px] font-bold leading-tight tracking-tight text-frost">{value}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-h-[34px] min-w-0">
          {delta !== undefined && (
            <p className="flex items-center gap-1 text-xs text-frost-muted">
              <DeltaIcon className={`h-3.5 w-3.5 ${good ? 'text-brand-emerald' : 'text-brand-orange'}`} aria-hidden="true" />
              <span className="font-bold text-frost-soft">{Math.abs(delta).toFixed(1)}%</span>
              <span className="truncate">{caption}</span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-frost-muted">Updated just now</p>
        </div>
        {spark && <Sparkline data={spark} stroke={theme.stroke} />}
      </div>
    </div>
  )
}
