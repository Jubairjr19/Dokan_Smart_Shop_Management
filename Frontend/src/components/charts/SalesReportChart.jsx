import { Bar } from 'react-chartjs-2'
import { categoryAxis, SERIES_COLORS, tooltipTheme, valueAxis } from '../../lib/charts.js'
import { taka } from '../../lib/format.js'

const OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 500, easing: 'easeOutQuart' },
  plugins: { legend: { display: false }, tooltip: tooltipTheme },
  scales: { x: categoryAxis, y: valueAxis },
}

export default function SalesReportChart({ labels, values, periodLabel }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: values,
        backgroundColor: SERIES_COLORS.revenue,
        hoverBackgroundColor: '#22D3EE',
        maxBarThickness: 24,
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
      },
    ],
  }
  const total = values.reduce((sum, n) => sum + n, 0)
  return <Bar data={data} options={OPTIONS} role="img" aria-label={`${periodLabel} revenue totalling ${taka(total)}`} />
}
