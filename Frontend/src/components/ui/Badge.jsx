const TONES = {
  emerald: 'border-brand-emerald/30 bg-brand-emerald/10 text-[#6EE7B7]',
  orange: 'border-brand-orange/35 bg-brand-orange/10 text-[#FDBA74]',
  rose: 'border-brand-rose/35 bg-brand-rose/10 text-[#FDA4B4]',
  cyan: 'border-brand-cyan/30 bg-brand-cyan/10 text-[#67E8F9]',
  slate: 'border-white/15 bg-white/[0.06] text-frost-soft',
}

const DOTS = {
  emerald: 'bg-brand-emerald',
  orange: 'bg-brand-orange',
  rose: 'bg-brand-rose',
  cyan: 'bg-brand-cyan',
  slate: 'bg-frost-muted',
}

export default function Badge({ tone = 'slate', dot = true, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

const STOCK = {
  in: { tone: 'emerald', label: 'In stock' },
  low: { tone: 'orange', label: 'Low stock' },
  out: { tone: 'rose', label: 'Out of stock' },
}

export function StockBadge({ status }) {
  const { tone, label } = STOCK[status]
  return <Badge tone={tone}>{label}</Badge>
}
