import { X, Check, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { ImageItem } from '@/types'
import { formatBytes } from '@/utils/imageCompress'

interface ImageInfoCardProps {
  image: ImageItem
  selected: boolean
}

export default function ImageInfoCard({ image, selected }: ImageInfoCardProps) {
  const { selectImage, removeImage } = useAppStore()
  const { id, name, originalUrl, originalMeta, status, progress, error } = image
  const { width, height, size, mimeType, hasGps, hasExif } = originalMeta

  const formatExt = (mime: string) => {
    if (mime === 'image/jpeg') return 'JPG'
    if (mime === 'image/png') return 'PNG'
    if (mime === 'image/webp') return 'WebP'
    if (mime === 'image/avif') return 'AVIF'
    return mime.split('/')[1]?.toUpperCase() || 'IMG'
  }

  const handleClick = () => {
    selectImage(id)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeImage(id)
  }

  const renderStatus = () => {
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-1.5 text-ink-300">
          <div className="w-2 h-2 rounded-full bg-ink-400" />
          <span className="text-xs">待处理</span>
        </div>
      )
    }

    if (status === 'processing') {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-accent-400">处理中</span>
            <span className="text-xs text-accent-400">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-ink-500/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )
    }

    if (status === 'done') {
      return (
        <div className="flex items-center gap-1.5 text-success-400">
          <Check size={14} />
          <span className="text-xs">已完成</span>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className="flex items-center gap-1.5 text-red-400">
          <XCircle size={14} />
          <span className="text-xs" title={error}>处理失败</span>
        </div>
      )
    }

    return null
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative glass-card p-3 cursor-pointer transition-all duration-200',
        'hover:bg-ink-500/60',
        selected && [
          'ring-2 ring-transparent bg-clip-border',
          'before:absolute before:inset-0 before:rounded-xl before:bg-gradient-accent before:opacity-50 before:-z-10',
          'shadow-glow',
        ]
      )}
      style={selected ? { borderImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) 1' } : undefined}
    >
      <button
        type="button"
        onClick={handleRemove}
        className={cn(
          'absolute top-2 right-2 z-10',
          'w-7 h-7 rounded-lg flex items-center justify-center',
          'text-ink-300 hover:text-red-400 hover:bg-red-500/10',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50'
        )}
        title="删除图片"
      >
        <X size={16} />
      </button>

      <div className="flex gap-3">
        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-ink-500/60">
          <img
            src={originalUrl}
            alt={name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-ink-100 truncate" title={name}>
              {name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-xs text-ink-300">
              {width}×{height}
            </span>
            <span className="text-ink-500">·</span>
            <span className="text-xs text-ink-300">
              {formatBytes(size)}
            </span>
            <span className="tag text-[10px] py-0.5 px-2">
              {formatExt(mimeType)}
            </span>
          </div>

          {(hasGps || hasExif) && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {hasGps && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                  ⚠️ 含GPS
                </span>
              )}
              {hasExif && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  ⚠️ 含EXIF
                </span>
              )}
            </div>
          )}

          <div className="pt-1">{renderStatus()}</div>
        </div>
      </div>
    </div>
  )
}
