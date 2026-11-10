import { Link } from 'react-router-dom'
import { Doughnut } from 'react-chartjs-2'
import { ArrowRight, Boxes } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { tooltipTheme } from '../../lib/charts.js'
import { number } from '../../lib/format.js'

const OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '76%',
  animation: { duration: 650 },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipTheme,
      callbacks: { label: (ctx) => ` ${ctx.label}: ${number(ctx.parsed)}` },
    },
  },
}

const SLICES = [
  { key: 'inStock', label: 'In stock', color: '#34D399', status: 'Healthy' },
  { key: 'low', label: 'Low stock', color: '#FB923C', status: 'Reorder soon' },
  { key: 'out', label: 'Out of stock', color: '#FB7185', status: 'Reorder now' },
]

export default function InventoryOverview() {
  const { derived } = useStore()
  const { inventory } = derived

  const data = {
    labels: SLICES.map((s) => s.label),
    datasets: [
      {
        data: SLICES.map((s) => inventory[s.key]),
        backgroundColor: SLICES.map((s) => s.color),
        borderWidth: 0,
        spacing: 2,
        borderRadius: 3,
        hoverOffset: 3,
      },
    ],
  }

  return (
    <GlassCard className="flex flex-col p-5">
      <CardHeader title="Inventory Overview" subtitle="Keep your shelves in good shape" action={<Boxes className="h-[18px] w-[18px] text-frost-muted" aria-hidden="true" />} />
      <div className="mt-4 flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-4">
        <div className="relative h-36 w-36 shrink-0">
          <Doughnut data={data} options={OPTIONS} role="img" aria-label={`${inventory.total} products: ${inventory.inStock} in stock, ${inventory.low} low, ${inventory.out} out of stock`} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none text-frost">{number(inventory.total)}</span>
            <span className="mt-1 text-[11px] text-frost-muted">Total products</span>
          </div>
        </div>
        <ul className="min-w-[150px] flex-1 space-y-2.5">
          {SLICES.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2.5 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
              <span className="flex-1 text-frost-muted">{slice.label}</span>
              <span className="font-bold tabular-nums text-frost">{number(inventory[slice.key])}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link to="/inventory" className="group mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-[13.5px] font-semibold text-frost transition duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.12]">
        View Inventory
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </GlassCard>
  )
}
