import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (c: boolean) => void
  label?: string
  description?: string
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
}: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center justify-between gap-4 p-4 glass-card',
        'transition-all duration-200 hover:border-ink-500/40',
        'text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50'
      )}
    >
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-sm font-medium text-ink-100">{label}</div>
        )}
        {description && (
          <div className="text-xs text-ink-300 mt-0.5">{description}</div>
        )}
      </div>
      <div
        className={cn(
          'relative shrink-0 w-12 h-7 rounded-full transition-all duration-300',
          checked
            ? 'bg-gradient-accent shadow-glow'
            : 'bg-ink-600 border border-ink-500/50'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md',
            'transition-transform duration-300 ease-out',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  )
}
