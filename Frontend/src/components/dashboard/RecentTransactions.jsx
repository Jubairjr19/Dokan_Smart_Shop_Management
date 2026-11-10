import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import GlassCard, { CardHeader } from '../ui/GlassCard.jsx'
import Badge from '../ui/Badge.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { formatDate, taka } from '../../lib/format.js'

export function SaleStatusBadge({ sale }) {
  if (sale.due <= 0) return <Badge tone="emerald">Paid</Badge>
  return <Badge tone="orange">{sale.paid > 0 ? 'Partial' : 'On credit'}</Badge>
}

export default function RecentTransactions() {
  const { sales } = useStore()

  return (
    <GlassCard className="flex min-w-0 flex-col overflow-hidden xl:col-span-2">
      <CardHeader
        className="p-5 pb-3"
        title="Recent Transactions"
        action={
          <Link to="/sales?tab=invoices" className="group flex items-center gap-0.5 text-[13px] font-semibold text-frost-muted transition hover:text-brand-cyan">
            View all <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Transaction</th>
              <th scope="col">Customer</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Payment</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 5).map((sale) => (
              <tr key={sale.id}>
                <td>
                  <Link to={`/sales?tab=invoices&view=${sale.id}`} className="font-semibold text-frost transition hover:text-brand-cyan">
                    {sale.id}
                  </Link>
                </td>
                <td>{sale.customer}</td>
                <td className="num font-semibold text-frost">{taka(sale.total)}</td>
                <td>{sale.method}</td>
                <td>
                  <SaleStatusBadge sale={sale} />
                </td>
                <td>{formatDate(sale.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
