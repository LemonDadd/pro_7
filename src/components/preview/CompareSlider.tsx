import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompareSliderProps {
  originalUrl: string
  processedUrl: string | null
  onPositionChange?: (p: number) => void
  initialPosition?: number
  zoom?: 1 | 2
}

const checkerboardStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(148,163,184,0.1) 25%, transparent 25%),' +
    'linear-gradient(-45deg, rgba(148,163,184,0.1) 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.1) 75%),' +
    'linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.1) 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
}

export default function CompareSlider({
  originalUrl,
  processedUrl,
  onPositionChange,
  initialPosition = 50,
  zoom: externalZoom,
}: CompareSliderProps) {
  const [position, setPosition] = useState(initialPosition)
  const [internalZoom, setInternalZoom] = useState<1 | 2>(1)
  const zoom = externalZoom ?? internalZoom
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const updatePosition = useCallback(
    (clientX: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const pct = ((clientX - rect.left) / rect.width) * 100
      const clamped = Math.max(0, Math.min(100, pct))
      setPosition(clamped)
      onPositionChange?.(clamped)
    },
    [onPositionChange]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      updatePosition(e.clientX)
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return
      const touch = e.touches[0]
      if (touch) updatePosition(touch.clientX)
    }
    const handleTouchEnd = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [updatePosition])

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    if ('touches' in e) {
      updatePosition(e.touches[0].clientX)
    } else {
      updatePosition(e.clientX)
    }
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    updatePosition(e.clientX)
  }

  const handleToggleZoom = (z: 1 | 2) => {
    if (externalZoom === undefined) setInternalZoom(z)
  }

  const imgWrapperClass = cn(
    'relative w-full h-full flex items-center justify-center',
    zoom === 2 && 'overflow-auto'
  )

  const imgClass = zoom === 2 ? 'block' : 'max-w-full max-h-[600px] object-contain'

  if (!processedUrl) {
    return (
      <div
        className="glass-card min-h-[400px] flex flex-col items-center justify-center text-ink-300"
        style={checkerboardStyle}
      >
        <img
          src={originalUrl}
          alt="Original"
          className={cn(imgClass, 'opacity-50')}
        />
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>处理中或暂无对比</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card min-h-[400px] flex flex-col">
      <div className="flex justify-end items-center gap-2 p-3 border-b border-ink-500/30">
        <button
          onClick={() => handleToggleZoom(1)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            zoom === 1
              ? 'bg-gradient-accent text-white shadow-glow'
              : 'bg-ink-600/60 text-ink-200 hover:bg-ink-600 border border-ink-500/30'
          )}
        >
          100%
        </button>
        <button
          onClick={() => handleToggleZoom(2)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            zoom === 2
              ? 'bg-gradient-accent text-white shadow-glow'
              : 'bg-ink-600/60 text-ink-200 hover:bg-ink-600 border border-ink-500/30'
          )}
        >
          200%
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 min-h-[360px] cursor-col-resize select-none"
        style={checkerboardStyle}
        onClick={handleContainerClick}
      >
        <div className={imgWrapperClass}>
          <img src={originalUrl} alt="Original" className={imgClass} draggable={false} />
        </div>

        <div
          className={cn('absolute inset-0 pointer-events-none')}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className={imgWrapperClass}>
            <img
              src={processedUrl}
              alt="Processed"
              className={imgClass}
              draggable={false}
            />
          </div>
        </div>

        <div className="absolute top-3 left-3 tag pointer-events-none">原图</div>
        <div className="absolute top-3 right-3 tag pointer-events-none">处理后</div>

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white cursor-col-resize shadow-glow hover:scale-115 transition-transform duration-150 pointer-events-auto flex items-center justify-center"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
          >
            <div className="w-4 h-[2px] bg-accent-500 rounded-full" />
            <div className="absolute w-[2px] h-4 bg-accent-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
