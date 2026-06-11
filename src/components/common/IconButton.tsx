import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  onClick?: () => void
  size?: number
  variant?: 'default' | 'primary' | 'danger'
  title?: string
  disabled?: boolean
  className?: string
}

export default function IconButton({
  icon: Icon,
  onClick,
  size = 18,
  variant = 'default',
  title,
  disabled = false,
  className,
}: IconButtonProps) {
  const variants = {
    default:
      'text-ink-300 hover:text-ink-100 hover:bg-ink-600/60',
    primary:
      'text-white bg-gradient-accent shadow-glow hover:scale-105 active:scale-95',
    danger:
      'text-ink-300 hover:text-red-400 hover:bg-red-500/10',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center min-w-[36px] min-h-[36px]',
        'rounded-xl transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent',
        variants[variant],
        className
      )}
    >
      <Icon size={size} />
    </button>
  )
}
