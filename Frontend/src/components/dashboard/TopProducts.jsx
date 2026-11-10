import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import ProductAvatar from '../ui/ProductAvatar.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { number, taka } from '../../lib/format.js'

export default function TopProducts() {
  const { products } = useStore()

  const top = useMemo(() => [...products].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5), [products])

  return (
    <GlassCard className="flex min-w-0 flex-col overflow-hidden xl:col-span-2">
      <CardHeader
        className="p-5 pb-3"
        title="Top Selling Products"
        subtitle="The products your customers love"
        action={
          <Link to="/inventory" className="group flex items-center gap-0.5 text-[13px] font-semibold text-frost-muted transition hover:text-brand-cyan">
            View all <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col" className="num">
                Units Sold
              </th>
              <th scope="col" className="num">
                Revenue
              </th>
              <th scope="col" className="num">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((product) => (
              <tr key={product.id}>
                <td>
                  <span className="flex items-center gap-3">
                    <ProductAvatar product={product} size="sm" />
                    <span className="font-semibold text-frost">{product.name}</span>
                  </span>
                </td>
                <td className="num">{number(product.unitsSold)}</td>
                <td className="num font-semibold text-frost">{taka(product.unitsSold * product.sellPrice)}</td>
                <td className="num">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#6EE7B7]">
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    {product.trend.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
