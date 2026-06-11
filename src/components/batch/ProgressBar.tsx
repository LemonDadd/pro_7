import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  status?: 'pending' | 'processing' | 'done' | 'error'
  showLabel?: boolean
  className?: string
}

export default function ProgressBar({
  progress,
  status = 'pending',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const safeProgress = Math.min(100, Math.max(0, progress))

  const barColor =
    status === 'done'
      ? 'bg-success-500'
      : status === 'error'
      ? 'bg-red-500'
      : 'bg-gradient-accent'

  const isProcessing = status === 'processing'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-2 rounded-full bg-ink-600/60 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out relative',
            barColor
          )}
          style={{ width: `${safeProgress}%` }}
        >
          {isProcessing && (
            <div className="absolute inset-0 animate-pulse bg-white/20 rounded-full" />
          )}
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-ink-200 shrink-0 min-w-[36px] text-right">
          {Math.round(safeProgress)}%
        </span>
      )}
    </div>
  )
}
