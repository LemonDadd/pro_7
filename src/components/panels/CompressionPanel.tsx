import { Package, ShieldCheck } from 'lucide-react'
import Slider from '@/components/common/Slider'
import Toggle from '@/components/common/Toggle'
import { useAppStore } from '@/store/useAppStore'
import type { OutputFormat, PartialProcessParams } from '@/types'
import { cn } from '@/lib/utils'

const formatOptions: { value: OutputFormat; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
]

export default function CompressionPanel() {
  const { selectedId, applyToAll, images, globalParams, updateParams, updateGlobalParams } = useAppStore()

  const params = selectedId
    ? images.find((img) => img.id === selectedId)?.params.compression ?? globalParams.compression
    : globalParams.compression

  const applyChange = (partial: PartialProcessParams) => {
    if (applyToAll) {
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
