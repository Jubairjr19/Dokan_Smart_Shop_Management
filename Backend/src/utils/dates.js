const DAY_MS = 86_400_000

export function startOfDay(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

/** Calendar arithmetic, so a day is still a day across clock changes. */
export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Whole calendar days from today to the date. Negative means it has passed. */
export function daysUntil(date) {
  return Math.round((startOfDay(date) - startOfDay()) / DAY_MS)
}
