import { useId } from 'react'
import { ChevronDown, Search } from 'lucide-react'

/** Labelled input with an inline validation message. */
export function Field({ label, error, hint, className = '', inputClassName = '', children, ...inputProps }) {
  const id = useId()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`field ${error ? 'field-error' : ''} ${inputClassName}`}
          {...inputProps}
        />
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-[#FDA4B4]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-frost-muted">{hint}</p>
      )}
    </div>
  )
}

export function Select({ label, error, className = '', children, ...selectProps }) {
  const id = useId()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <select id={id} aria-invalid={Boolean(error)} className={`field cursor-pointer appearance-none pr-9 ${error ? 'field-error' : ''}`} {...selectProps}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frost-muted" aria-hidden="true" />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[#FDA4B4]">{error}</p>}
    </div>
  )
}

export function SearchInput({ className = '', label = 'Search', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-frost-muted" aria-hidden="true" />
      <input type="search" aria-label={label} className="field pl-10" {...props} />
    </div>
  )
}

/** Accessible on/off switch. */
export function Toggle({ checked, onChange, label, description, disabled = false }) {
  const id = useId()
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[13.5px] font-semibold text-frost">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-frost-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition duration-300 ${
          checked ? 'border-brand-cyan/60 bg-brand-cyan/70 shadow-[0_0_16px_-2px_rgba(34,211,238,.7)]' : 'border-white/20 bg-white/10 hover:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-[left] duration-300 ease-[cubic-bezier(.3,1.4,.6,1)] ${
            checked ? 'left-[22px]' : 'left-[2px]'
          }`}
        />
      </button>
    </div>
  )
}

/** Row of mutually exclusive options with a sliding active pill. */
export function SegmentedControl({ options, value, onChange, label, className = '' }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div role="group" aria-label={label} className={`relative inline-grid rounded-xl border border-white/10 bg-white/[0.05] p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-lg border border-brand-cyan/40 bg-brand-cyan/15 shadow-[0_0_18px_-6px_rgba(34,211,238,.8)] transition-transform duration-300 ease-[cubic-bezier(.3,1.2,.6,1)]"
        style={{ width: `calc((100% - .5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`relative z-10 h-8 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors duration-200 ${
            option.value === value ? 'text-frost' : 'text-frost-muted hover:text-frost'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
