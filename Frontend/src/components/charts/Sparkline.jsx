/** Small inline trend line. Decorative: the figure beside it carries the value. */
export default function Sparkline({ data, stroke = '#22D3EE', width = 76, height = 30 }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 3
  const points = data.map((value, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (value - min) / range) * (height - pad * 2),
  ])
  const [endX, endY] = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className="shrink-0" aria-hidden="true">
      <polyline points={points.map((p) => p.join(',')).join(' ')} stroke={stroke} strokeWidth="1.750" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r="2.500" fill={stroke} />
    </svg>
  )
}
