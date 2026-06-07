import React from 'react'

export default function ProgressBar({ pct = 0, color = 'bg-[#10b981]' }) {
  // Ensure pct is within [0, 100]
  const percentage = Math.min(100, Math.max(0, Math.round(pct)))

  return (
    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
      <div 
        className={`${color} h-full rounded-full transition-all duration-700 ease-out`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}
