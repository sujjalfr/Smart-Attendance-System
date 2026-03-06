import React from 'react'

export default function KpiCard({ title, value, delta, subtitle }) {
  const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 flex flex-col">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {delta !== undefined && (
          <div className={`${deltaColor} text-sm`}>{delta > 0 ? `+${delta}%` : `${delta}%`}</div>
        )}
      </div>
      {subtitle && <div className="mt-2 text-xs text-gray-400">{subtitle}</div>}
    </div>
  )
}
