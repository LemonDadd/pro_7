import Header from '@/components/layout/Header'
import WorkspaceLayout from '@/components/layout/WorkspaceLayout'
import DropZone from '@/components/upload/DropZone'
import ImageInfoCard from '@/components/upload/ImageInfoCard'
import CompressionPanel from '@/components/panels/CompressionPanel'
import CropPanel from '@/components/panels/CropPanel'
import EditPanel from '@/components/panels/EditPanel'
import CompareSlider from '@/components/preview/CompareSlider'
import BatchQueue from '@/components/batch/BatchQueue'
import { useAppStore } from '@/store/useAppStore'
import { useAutoProcess } from '@/hooks/useAutoProcess'
import { formatBytes } from '@/utils/imageCompress'
import { ShieldCheck, Zap, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

function ImageStats() {
  const selectedImage = useAppStore((s) =>
    s.selectedId ? s.images.find((i) => i.id === s.selectedId) ?? null : null,
  )

  if (!selectedImage) return null

  const { originalMeta, processedMeta } = selectedImage
  const savedPercent = processedMeta
    ? originalMeta.size > 0
      ? ((originalMeta.size - processedMeta.size) / originalMeta.size) * 100
      : 0
    : 0

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-300">原始大小</p>
          <p className="text-lg font-mono font-semibold text-ink-100">
            {formatBytes(originalMeta.size)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-300">处理后大小</p>
          <p
            className={cn(
              'text-lg font-mono font-semibold',
              processedMeta ? 'text-success-400' : 'text-ink-400',
            )}
          >
            {processedMeta ? formatBytes(processedMeta.size) : '—'}
          </p>
        </div>
      </div>

      {processedMeta && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Gauge size={14} className="text-accent-400" />
            <span className="text-xs text-ink-300">节省</span>
            <span className="text-sm font-mono font-semibold text-success-400">
              {savedPercent.toFixed(0)}%
            </span>
          </div>
          {processedMeta.ssim !== undefined && (
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-accent-400" />
              <span className="text-xs text-ink-300">SSIM</span>
              <span className="text-sm font-mono font-semibold text-accent-400">
                {processedMeta.ssim.toFixed(3)}
              </span>
            </div>
          )}
          {selectedImage.params.compression.stripExif && (
            <div className="flex items-center gap-1.5 ml-auto">
              <ShieldCheck size={14} className="text-success-400" />
              <span className="text-xs text-success-400">EXIF 已剥离</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink-500/20">
        <div>
          <p className="text-xs text-ink-300">原始尺寸</p>
          <p className="text-sm font-mono text-ink-100">
            {originalMeta.width} × {originalMeta.height}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-300">输出尺寸</p>
          <p className="text-sm font-mono text-ink-100">
            {processedMeta ? `${processedMeta.width} × ${processedMeta.height}` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

function LeftPanel() {
  const images = useAppStore((s) => s.images)
  const selectedId = useAppStore((s) => s.selectedId)

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <DropZone />

      {images.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink-200 px-1">已导入图片</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {images.map((img) => (
              <ImageInfoCard
                key={img.id}
                image={img}
                selected={img.id === selectedId}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-ink-500/20" />

      <CompressionPanel />
      <CropPanel />
      <EditPanel />
    </div>
  )
}

function CenterPanel() {
  const selectedImage = useAppStore((s) =>
    s.selectedId ? s.images.find((i) => i.id === s.selectedId) ?? null : null,
  )
  const compareZoom = useAppStore((s) => s.compareZoom)
  const comparePosition = useAppStore((s) => s.comparePosition)
  const setComparePosition = useAppStore((s) => s.setComparePosition)
  const setCompareZoom = useAppStore((s) => s.setCompareZoom)

  useAutoProcess()

  if (!selectedImage) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-accent/10 flex items-center justify-center mb-6">
          <ShieldCheck size={48} className="text-accent-400" />
        </div>
        <h2 className="text-2xl font-bold text-ink-100 mb-3">PixForge 图片工坊</h2>
        <p className="text-ink-300 max-w-md mb-6">
          在浏览器内完成所有图片处理操作。
          <br />
          100% 本地运行，图片不会上传到任何服务器。
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="tag">JPEG</span>
          <span className="tag">PNG</span>
          <span className="tag">WebP</span>
          <span className="tag">AVIF</span>
          <span className="tag">格式互转</span>
          <span className="tag">批量压缩</span>
          <span className="tag">裁剪缩放</span>
          <span className="tag">EXIF 剥离</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 animate-fade-in">
      <ImageStats />
      <div className="flex-1 min-h-0">
        <CompareSlider
          originalUrl={selectedImage.originalUrl}
          processedUrl={selectedImage.processedUrl}
          initialPosition={comparePosition}
          onPositionChange={setComparePosition}
          zoom={compareZoom}
        />
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-300">对比缩放：</span>
          {([1, 2] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setCompareZoom(z)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                compareZoom === z
                  ? 'bg-gradient-accent text-white shadow-glow'
                  : 'bg-ink-600/60 text-ink-200 hover:bg-ink-600 border border-ink-500/30',
              )}
            >
              {z * 100}%
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RightPanel() {
  return (
    <div className="h-full animate-fade-in" style={{ animationDelay: '60ms' }}>
      <BatchQueue />
    </div>
  )
}

export default function Workbench() {
  return (
    <div className="min-h-screen bg-gradient-ink">
      <Header />
      <WorkspaceLayout
        leftPanel={<LeftPanel />}
        centerPanel={<CenterPanel />}
        rightPanel={<RightPanel />}
      />
    </div>
  )
}
