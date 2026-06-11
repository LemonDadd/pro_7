import { useRef, useState } from 'react'
import { UploadCloud, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { MAX_IMAGES } from '@/types'

export default function DropZone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { addImages, images } = useAppStore()

  const hasImages = images.length > 0

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const { files } = e.dataTransfer
    if (files && files.length > 0) {
      addImages(files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target
    if (files && files.length > 0) {
      addImages(files)
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  if (hasImages) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
            'text-sm font-medium text-ink-100',
            'bg-ink-600/60 border border-ink-500/40',
            'hover:border-accent-500/50 hover:bg-ink-600',
            'transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50'
          )}
        >
          <Plus size={16} />
          添加图片
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-2xl border-2 border-dashed p-8 cursor-pointer',
        'transition-all duration-300',
        'bg-ink-600/40 backdrop-blur-sm',
        isDragging
          ? 'border-transparent bg-gradient-accent/10 animate-pulse-glow'
          : 'border-ink-500/50 hover:border-accent-500/50 hover:bg-ink-600/60'
      )}
    >
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-accent/5" />
      )}

      <div
        className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-4',
          'transition-all duration-300',
          isDragging
            ? 'bg-gradient-accent/20 text-accent-400'
            : 'bg-ink-500/40 text-ink-200'
        )}
      >
        <UploadCloud size={40} className={cn(isDragging && 'animate-bounce')} />
      </div>

      <p
        className={cn(
          'text-base font-medium mb-2 text-center',
          isDragging ? 'text-accent-400' : 'text-ink-100'
        )}
      >
        拖拽图片到这里，或点击选择
      </p>

      <p className="text-sm text-ink-300 text-center">
        最多 {MAX_IMAGES} 张 · 单张 ≤ 25MB · JPG/PNG/WebP/AVIF
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
