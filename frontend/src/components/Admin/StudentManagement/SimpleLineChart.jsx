import React from 'react'

// Very small, dependency-free SVG line chart for quick demos.
export default function SimpleLineChart({ data = [], width = 300, height = 80, stroke = '#2563EB' }) {
  if (!data || data.length === 0) return <div className="text-xs text-gray-400">No data</div>

  const max = Math.max(...data)
  const min = Math.min(...data)
  const len = data.length
  const padding = 6
  const xStep = (width - padding * 2) / Math.max(1, len - 1)

  const points = data.map((v, i) => {
    const x = padding + i * xStep
    const normalized = max === min ? 0.5 : (v - min) / (max - min)
    const y = height - padding - normalized * (height - padding * 2)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const [xStr, yStr] = points[i].split(',')
        return <circle key={i} cx={xStr} cy={yStr} r="2" fill={stroke} />
      })}
    </svg>
  )
}
