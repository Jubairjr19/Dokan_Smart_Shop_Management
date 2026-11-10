export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-frost-muted">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <p className="font-semibold text-frost">{title}</p>
      {message && <p className="max-w-sm text-[13px] text-frost-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
