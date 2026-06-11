import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  showInput?: boolean
}

export default function Slider({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  label,
  unit,
  showInput = false,
}: SliderProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    onChange(v)
    setInputValue(String(v))
  }

  const handleInputBlur = () => {
    const v = Math.min(max, Math.max(min, Number(inputValue)))
    onChange(v)
    setInputValue(String(v))
    setEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setInputValue(String(value))
      setEditing(false)
    }
  }

  return (
    <div className={cn('glass-card p-4')}>
      <div className="flex items-center justify-between mb-3">
        {label && (
          <span className="text-sm font-medium text-ink-100">{label}</span>
        )}
        {showInput && editing ? (
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className="w-20 text-right bg-ink-700/60 border border-accent-500/40 rounded-lg px-2 py-1 text-sm font-mono text-white outline-none focus:border-accent-500 transition-colors"
          />
        ) : (
          <button
            type="button"
            onClick={() => showInput && setEditing(true)}
            className={cn(
              'text-sm font-mono text-accent-400 tabular-nums',
              showInput && 'cursor-pointer hover:text-accent-500 transition-colors'
            )}
          >
            {value}
            {unit && <span className="ml-0.5 text-ink-300">{unit}</span>}
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleRangeChange}
        className="w-full"
      />
    </div>
  )
}
