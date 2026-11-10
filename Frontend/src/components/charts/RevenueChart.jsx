import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { LineChart, Table2, TrendingDown, TrendingUp } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import { SegmentedControl } from '../ui/Form.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { areaGradient, categoryAxis, crosshairPlugin, lineGlowPlugin, periodSeries, SERIES_COLORS, SURFACE, tooltipTheme, valueAxis } from '../../lib/charts.js'
import { percentChange, taka } from '../../lib/format.js'

const TIMEFRAMES = [
  { value: 'today', label: 'Today' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const PLUGINS = [lineGlowPlugin, crosshairPlugin]

const OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 650, easing: 'easeOutQuart' },
  plugins: { legend: { display: false }, tooltip: tooltipTheme },
  scales: { x: categoryAxis, y: valueAxis },
}

function lineDataset(label, data, color, rgb) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: areaGradient(rgb),
    borderWidth: 2,
    borderCapStyle: 'round',
    borderJoinStyle: 'round',
    tension: 0.42,
    fill: true,
    pointRadius: 0,
    pointHitRadius: 24,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: SURFACE,
    pointHoverBorderWidth: 2,
  }
}

function LegendKey({ color, label, value }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-frost-muted">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
      <strong className="font-bold text-frost">{value}</strong>
    </span>
  )
}

export default function RevenueChart() {
  const { finance } = useStore()
  const [timeframe, setTimeframe] = useState('weekly')
  const [showTable, setShowTable] = useState(false)

  const series = useMemo(() => periodSeries(timeframe, finance), [timeframe, finance])

  const data = useMemo(
    () => ({
      labels: series.labels,
      datasets: [lineDataset('Revenue', series.revenue, SERIES_COLORS.revenue, '11, 165, 196'), lineDataset('Expenses', series.expense, SERIES_COLORS.expense, '229, 100, 14')],
    }),
    [series],
  )

  // Monthly compares the four-week total; the other periods compare the same span.
  const change = percentChange(series.totalRevenue, series.previousRevenue)
  const up = change >= 0
  const TrendIcon = up ? TrendingUp : TrendingDown

  return (
    <GlassCard className="flex flex-col p-5 xl:col-span-2">
      <CardHeader
        title="Revenue & Expenses"
        subtitle="A clear picture of your business performance"
        action={
          <div className="flex items-center gap-2">
            <SegmentedControl label="Timeframe" options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-label={showTable ? 'Show chart' : 'Show data table'}
              title={showTable ? 'Show chart' : 'Show data table'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-frost-muted transition hover:border-white/25 hover:text-frost"
            >
              {showTable ? <LineChart className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <LegendKey color={SERIES_COLORS.revenue} label="Revenue" value={taka(series.totalRevenue)} />
        <LegendKey color={SERIES_COLORS.expense} label="Expenses" value={taka(series.totalExpense)} />
      </div>

      {showTable ? (
        <div className="mt-3 h-64 overflow-auto rounded-xl border border-white/10">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col" className="num">
                  Revenue
                </th>
                <th scope="col" className="num">
                  Expenses
                </th>
              </tr>
            </thead>
            <tbody>
              {series.labels.map((label, i) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="num">{taka(series.revenue[i])}</td>
                  <td className="num">{taka(series.expense[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3 h-64">
          <Line data={data} options={OPTIONS} plugins={PLUGINS} aria-label={`Revenue and expenses, ${series.label}. Revenue ${taka(series.totalRevenue)}, expenses ${taka(series.totalExpense)}.`} role="img" />
        </div>
      )}

      <p className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[13px] text-frost-muted">
        <TrendIcon className={`h-4 w-4 shrink-0 ${up ? 'text-brand-emerald' : 'text-brand-orange'}`} aria-hidden="true" />
        <span>
          Revenue is <strong className="font-bold text-frost">{Math.abs(change).toFixed(1)}% {up ? 'higher' : 'lower'}</strong> than {series.previous}.{up ? ' Looking good!' : ''}
        </span>
      </p>
    </GlassCard>
  )
}
