const NBSP = ' '

/** 248500 -> "৳ 248,500" */
export function taka(value) {
  const n = Number(value) || 0
  const sign = n < 0 ? '-' : ''
  return `${sign}৳${NBSP}${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

/** 40000 -> "৳ 40k", for chart axes */
export function takaCompact(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1000) return `৳${NBSP}${Math.round(n / 100) / 10}k`
  return `৳${NBSP}${n}`
}

export function number(value) {
  return (Number(value) || 0).toLocaleString('en-US')
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** For <input type="date"> */
export function toInputDate(value = new Date()) {
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function timeAgo(value) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString()
}

/** Whole days until a date. Negative means it has passed. */
export function daysUntil(value) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(value)
  end.setHours(0, 0, 0, 0)
  return Math.round((end - start) / 86400000)
}

export function percentChange(current, previous) {
  if (!previous) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
