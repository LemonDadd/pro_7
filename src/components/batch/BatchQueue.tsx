import {
  ListOrdered,
  Trash2,
  RotateCcw,
  Download,
  Play,
  Package,
  ImageOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { ImageStatus } from '@/types'
import { formatBytes } from '@/utils/imageCompress'
import ProgressBar from './ProgressBar'


const statusConfig: Record<ImageStatus, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-ink-600/60 text-ink-200 border-ink-500/30',
  },
  processing: {
    label: '处理中',
    className: 'tag-active',
  },
  done: {
    label: '已完成',
    className: 'bg-success-500/20 text-success-400 border-success-500/30',
  },
  error: {
    label: '错误',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
}

function StatusBadge({ status }: { status: ImageStatus }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  )
}

function ImageSizeCompare({ original, processed }: { original: number; processed: number }) {
  const saved = original - processed
  const percent = original > 0 ? (saved / original) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-300 font-mono">{formatBytes(original)}</span>
      <span className="text-ink-400">→</span>
      <span className="text-ink-100 font-mono font-medium">{formatBytes(processed)}</span>
      <span className="text-success-400 font-medium">(-{percent.toFixed(0)}%)</span>
    </div>
  )
}

function QueueItem({ imageId }: { imageId: string }) {
  const image = useAppStore((s) => s.images.find((i) => i.id === imageId)!)
  const selectedId = useAppStore((s) => s.selectedId)
  const selectImage = useAppStore((s) => s.selectImage)
  const retryImage = useAppStore((s) => s.retryImage)
  const downloadImage = useAppStore((s) => s.downloadImage)

  const isSelected = selectedId === imageId

  const handleClick = () => {
    selectImage(image.id)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'glass-card p-3 cursor-pointer transition-all duration-200 group',
        'hover:border-ink-500/50',
        isSelected && 'border-accent-500/60 ring-1 ring-accent-500/30 shadow-glow'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={image.originalUrl}
            alt={image.name}
            className="w-12 h-12 rounded-lg object-cover bg-ink-700"
          />
          {isSelected && image.status === 'done' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                downloadImage(image.id)
              }}
              title="下载"
              className={cn(
                'absolute -top-1 -right-1 w-[26px] h-[26px] rounded-lg',
                'inline-flex items-center justify-center',
                'text-white bg-gradient-accent shadow-glow',
                'hover:scale-105 active:scale-95 transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50'
              )}
            >
              <Download size={14} />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-100 truncate" title={image.name}>
              {image.name}
            </p>
            <StatusBadge status={image.status} />
          </div>

          {image.status === 'done' && image.processedMeta && (
            <div className="mt-1.5">
              <ImageSizeCompare
                original={image.originalMeta.size}
                processed={image.processedMeta.size}
              />
            </div>
          )}

          {image.status === 'error' && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-red-400 truncate flex-1">
                {image.error || '处理失败'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  retryImage(image.id)
                }}
                title="重试"
                className={cn(
                  'shrink-0 w-[26px] h-[26px] rounded-lg',
                  'inline-flex items-center justify-center',
                  'text-ink-300 hover:text-red-400 hover:bg-red-500/10',
                  'transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50'
                )}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {(image.status === 'processing' || image.status === 'pending') && (
            <div className="mt-2">
              <ProgressBar
                progress={image.progress}
                status={image.status}
                showLabel={image.status === 'processing'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-ink-600/40 flex items-center justify-center mb-4">
        <ImageOff size={28} className="text-ink-400" />
      </div>
      <p className="text-ink-300 text-sm">暂无图片，请先导入</p>
    </div>
  )
}

export default function BatchQueue() {
  const images = useAppStore((s) => s.images)
  const clearAll = useAppStore((s) => s.clearAll)
  const processAll = useAppStore((s) => s.processAll)
  const downloadAllZip = useAppStore((s) => s.downloadAllZip)
  const applyToAll = useAppStore((s) => s.applyToAll)
  const setApplyToAll = useAppStore((s) => s.setApplyToAll)

  const pendingCount = images.filter((i) => i.status !== 'done').length
  const doneCount = images.filter((i) => i.status === 'done').length
  const hasDone = doneCount > 0

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-500/20 shrink-0">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-accent-400" />
          <h3 className="font-semibold text-ink-100">批量队列</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearAll}
            disabled={images.length === 0}
            title="清除全部"
            className={cn(
              'inline-flex items-center justify-center min-w-[34px] min-h-[34px]',
              'rounded-xl transition-all duration-200',
              'text-ink-300 hover:text-red-400 hover:bg-red-500/10',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
          >
            <Trash2 size={16} />
          </button>
          <div className="w-px h-6 bg-ink-500/30 mx-1" />
          <button
            type="button"
            onClick={() => setApplyToAll(!applyToAll)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-all duration-300',
              applyToAll
                ? 'bg-gradient-accent shadow-glow'
                : 'bg-ink-600 border border-ink-500/50'
            )}
            title="应用到全部"
          >
            <span
              className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-out',
                applyToAll ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
          <span className="text-xs text-ink-300 ml-1">应用到全部</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {images.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[60vh]">
            {images.map((img) => (
              <QueueItem key={img.id} imageId={img.id} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ink-500/20 p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={processAll}
            disabled={images.length === 0 || pendingCount === 0}
            className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Play size={16} />
            <span>全部处理</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={downloadAllZip}
            disabled={!hasDone}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Package size={16} />
            <span className="hidden sm:inline">打包下载 ZIP</span>
            <span className="sm:hidden">ZIP</span>
          </button>
        </div>
        <div className="text-center">
          <span className="text-xs text-ink-300">
            已完成{' '}
            <span className="text-success-400 font-semibold">{doneCount}</span>
            <span className="text-ink-500 mx-1">/</span>
            <span className="text-ink-100 font-semibold">{images.length}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
