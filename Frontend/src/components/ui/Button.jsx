import { Loader2 } from 'lucide-react'

const BASE =
  'group inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50'

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-[#3BE0F7] to-[#12B9D8] text-cosmos-900 shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_24px_-10px_rgba(34,211,238,.8)] hover:shadow-glow-cyan hover:brightness-105',
  accent:
    'bg-gradient-to-b from-[#FFA95C] to-[#F97316] text-cosmos-900 shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_24px_-10px_rgba(249,115,22,.8)] hover:shadow-glow-orange hover:brightness-105',
  secondary:
    'border border-white/15 bg-white/[0.07] text-frost shadow-[inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur hover:border-white/30 hover:bg-white/[0.13]',
  ghost: 'text-frost-soft hover:bg-white/10 hover:text-frost',
  danger: 'border border-brand-rose/40 bg-brand-rose/10 text-[#FDA4B4] hover:border-brand-rose/70 hover:bg-brand-rose/20',
}

const SIZES = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  icon: 'h-9 w-9',
}

export default function Button({ variant = 'secondary', size = 'md', icon: Icon, trailing: Trailing, loading = false, disabled = false, className = '', children, type = 'button', ...props }) {
  return (
    <button type={type} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} disabled={loading || disabled} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
      {Trailing && <Trailing className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </button>
  )
}
