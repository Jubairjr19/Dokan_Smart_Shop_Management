export default function GlassCard({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`glass ${className}`} {...props}>
      {children}
    </Tag>
  )
}

/** Standard card heading: title, optional subtitle, optional action on the right. */
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-frost">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-frost-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
