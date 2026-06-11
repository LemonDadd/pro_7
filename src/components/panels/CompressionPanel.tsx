import { Package, ShieldCheck, Cpu, Zap, Info, AlertTriangle } from 'lucide-react'
import Slider from '@/components/common/Slider'
import Toggle from '@/components/common/Toggle'
import { useAppStore } from '@/store/useAppStore'
import type { OutputFormat, PartialProcessParams, EncoderType } from '@/types'
import { resolveOutputFormat } from '@/core/pipeline'
import { cn } from '@/lib/utils'

const formatOptions: { value: OutputFormat; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
]

const encoderOptions: { value: EncoderType; label: string; icon: React.ReactNode }[] = [
  { value: 'squoosh', label: 'Squoosh', icon: <Cpu size={14} /> },
  { value: 'canvas', label: 'Canvas', icon: <Zap size={14} /> },
]

const FORMAT_LABELS: Record<OutputFormat, string> = {
  original: '原始格式',
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
}

function mimeToOutput(mime: string): OutputFormat | null {
  if (mime === 'image/jpeg') return 'jpeg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/avif') return 'avif'
  return null
}

export default function CompressionPanel() {
  const { selectedId, applyToAll, images, globalParams, updateParams, updateGlobalParams } = useAppStore()

  const selectedImage = selectedId ? images.find((img) => img.id === selectedId) : null
  const params = selectedImage?.params.compression ?? globalParams.compression

  const originalMime = selectedImage?.originalMeta.mimeType ?? 'image/jpeg'

  const formatInfo = resolveOutputFormat(params.outputFormat, originalMime, params.encoder)
  const actualFormat = formatInfo.format === 'original'
    ? (selectedImage ? mimeToOutput(selectedImage.originalMeta.mimeType) ?? 'jpeg' : 'jpeg')
    : formatInfo.format

  const applyChange = (partial: PartialProcessParams) => {
    if (applyToAll || !selectedId) {
      updateGlobalParams(partial)
    } else if (selectedId) {
      updateParams(selectedId, partial)
    }
  }

  const handleTargetSizeToggle = (checked: boolean) => {
    applyChange({ compression: { targetSizeKB: checked ? 200 : null } })
  }

  return (
    <section className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-accent shadow-glow">
          <Package size={20} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-ink-100">压缩与格式</h2>
      </div>

      <Slider
        label="压缩质量"
        value={params.quality}
        onChange={(v) => applyChange({ compression: { quality: v } })}
        min={1}
        max={100}
        unit="%"
        showInput
      />

      <Toggle
        checked={params.targetSizeKB !== null}
        onChange={handleTargetSizeToggle}
        label="压缩到目标体积"
        description="启用后可指定目标文件大小"
      />
      {params.targetSizeKB !== null && (
        <div className="flex items-center gap-2 px-4">
          <input
            type="number"
            placeholder="200"
            value={params.targetSizeKB ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value)
              applyChange({ compression: { targetSizeKB: v } })
            }}
            className="flex-1 bg-ink-700/60 border border-accent-500/40 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-ink-300 outline-none focus:border-accent-500 transition-colors"
          />
          <span className="text-sm text-ink-200 font-medium w-10">KB</span>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink-100">输出格式</span>
        <div className="flex flex-wrap gap-2">
          {formatOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyChange({ compression: { outputFormat: opt.value } })}
              className={cn(
                'tag',
                params.outputFormat === opt.value && 'tag-active'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 px-1 pt-1">
          {formatInfo.fellBack ? (
            <>
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/90">
                当前编码器不支持 {formatInfo.original && FORMAT_LABELS[formatInfo.original]}，
                <span className="font-medium">已降级为 {FORMAT_LABELS[actualFormat]}</span>
              </p>
            </>
          ) : (
            <>
              <Info size={14} className="text-ink-400 mt-0.5 shrink-0" />
              <p className="text-xs text-ink-400">
                实际输出：<span className="text-ink-200 font-medium">{FORMAT_LABELS[actualFormat]}</span>
                {params.encoder === 'squoosh' && '（Squoosh WASM 编码器）'}
                {params.encoder === 'canvas' && '（浏览器原生 Canvas）'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink-100">编码器</span>
        <div className="grid grid-cols-2 gap-2">
          {encoderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyChange({ compression: { encoder: opt.value } })}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border',
                params.encoder === opt.value
                  ? 'bg-gradient-accent text-white border-transparent shadow-glow'
                  : 'bg-ink-600/60 text-ink-200 border-ink-500/30 hover:bg-ink-600 hover:border-accent-500/50',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-400 px-1">
          {params.encoder === 'squoosh'
            ? 'Squoosh WASM: 高质量压缩（MozJPEG/OxiPNG），首次加载稍慢'
            : 'Canvas: 浏览器原生编码，速度快兼容性好（推荐）'}
        </p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={18} className="text-accent-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink-100">剥离 EXIF/GPS 数据</div>
              <div className="text-xs text-ink-300 mt-0.5">保护隐私，移除位置和元数据</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyChange({ compression: { stripExif: !params.stripExif } })}
            className={cn(
              'relative shrink-0 w-12 h-7 rounded-full transition-all duration-300',
              params.stripExif
                ? 'bg-gradient-accent shadow-glow'
                : 'bg-ink-600 border border-ink-500/50'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md',
                'transition-transform duration-300 ease-out',
                params.stripExif ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </div>
    </section>
  )
}
