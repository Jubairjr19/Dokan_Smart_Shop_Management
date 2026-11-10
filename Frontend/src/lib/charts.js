import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { SEED_FINANCE, SERIES } from '../data/mockData.js'
import { taka, takaCompact } from './format.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend)

ChartJS.defaults.font.family = '"Dokan Taka", "Manrope Variable", Manrope, system-ui, "Segoe UI", sans-serif'
ChartJS.defaults.font.size = 12
ChartJS.defaults.color = '#94A3BD'

// Marks use these steps, which pass the contrast and colour-blind checks against the
// navy surface. The brighter brand tones are for UI accents only.
export const SERIES_COLORS = { revenue: '#0BA5C4', expense: '#E5640E' }
export const SURFACE = '#0E1630'

export const tooltipTheme = {
  backgroundColor: 'rgba(10, 17, 40, .96)',
  borderColor: 'rgba(255, 255, 255, .16)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 12,
  titleColor: '#F1F5FB',
  titleFont: { weight: '700', size: 12.5 },
  bodyColor: '#C6D0E2',
  bodyFont: { size: 12.5 },
  boxPadding: 6,
  usePointStyle: true,
  callbacks: {
    label: (ctx) => ` ${ctx.dataset.label}: ${taka(ctx.parsed.y ?? ctx.parsed)}`,
  },
}

export const valueAxis = {
  beginAtZero: true,
  border: { display: false },
  grid: { color: 'rgba(255, 255, 255, .07)', lineWidth: 1 },
  ticks: { maxTicksLimit: 5, padding: 8, callback: (value) => takaCompact(value) },
}

export const categoryAxis = {
  border: { color: 'rgba(255, 255, 255, .12)' },
  grid: { display: false },
  ticks: { padding: 6 },
}

/** Soft glow behind each plotted line. */
export const lineGlowPlugin = {
  id: 'lineGlow',
  beforeDatasetDraw(chart, args) {
    const { ctx } = chart
    ctx.save()
    ctx.shadowColor = chart.data.datasets[args.index].borderColor
    ctx.shadowBlur = 14
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore()
  },
}

/** Vertical guide at the hovered position. */
export const crosshairPlugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.()
    if (!active?.length) return
    const { ctx, chartArea } = chart
    const { x } = active[0].element
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, .22)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.restore()
  },
}

/** Fades an rgb colour down the plot height. */
export function areaGradient(rgb) {
  return ({ chart }) => {
    const { ctx, chartArea } = chart
    if (!chartArea) return `rgba(${rgb}, .1)`
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, `rgba(${rgb}, .2)`)
    gradient.addColorStop(1, `rgba(${rgb}, 0)`)
    return gradient
  }
}

/**
 * A period's series, including anything recorded in this session. New sales and
 * purchases land on the latest point, so charts always match the transactions.
 */
export function periodSeries(key, finance) {
  const series = SERIES[key]
  const revenue = [...series.revenue]
  const expense = [...series.expense]
  revenue[revenue.length - 1] += finance.revenue - SEED_FINANCE.revenue
  expense[expense.length - 1] += finance.expense - SEED_FINANCE.expense
  const sum = (list) => list.reduce((total, n) => total + n, 0)
  return {
    ...series,
    revenue,
    expense,
    // The monthly series is weekly totals, so its period total is the sum as well.
    totalRevenue: sum(revenue),
    totalExpense: sum(expense),
  }
}
