import { Crop, Link, Unlink, Maximize2 } from 'lucide-react'
import Slider from '@/components/common/Slider'
import Toggle from '@/components/common/Toggle'
import { useAppStore } from '@/store/useAppStore'
import type { AspectRatio, PartialProcessParams } from '@/types'
import { ID_PHOTO_SIZE } from '@/types'
import { cn } from '@/lib/utils'

const aspectOptions: { value: AspectRatio; label: string }[] = [
  { value: 'free', label: '自由' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: 'id-photo', label: `证件照 ${ID_PHOTO_SIZE.width}×${ID_PHOTO_SIZE.height}` },
]

export default function CropPanel() {
  const {
    selectedId,
    applyToAll,
    images,
    globalParams,
    updateParams,
    updateGlobalParams,
  } = useAppStore()

  const params = selectedId
    ? images.find((img) => img.id === selectedId)?.params.crop ?? globalParams.crop
    : globalParams.crop

  const hasImage = selectedId !== null

  const applyChange = (partial: PartialProcessParams) => {
    if (applyToAll) {
      updateGlobalParams(partial)
    } else if (selectedId) {
      updateParams(selectedId, partial)
    }
  }

  const handleOpenCropEditor = () => {
    const event = new CustomEvent('open-crop-editor')
    window.dispatchEvent(event)
  }

  const handleWidthChange = (value: string) => {
    const w = value === '' ? null : Number(value)
    applyChange({ crop: { outputWidth: w } })
  }

  const handleHeightChange = (value: string) => {
    const h = value === '' ? null : Number(value)
    applyChange({ crop: { outputHeight: h } })
  }

  const toggleLock = () => {
    if (params.outputWidth !== null && params.outputHeight !== null) {
      applyChange({ crop: { outputHeight: null } })
    }
  }

  const isLocked = params.outputWidth !== null && params.outputHeight !== null

  return (
    <section className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-accent shadow-glow">
          <Crop size={20} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-ink-100">裁剪与尺寸</h2>
      </div>

      <Toggle
        checked={params.enabled}
        onChange={(v) => applyChange({ crop: { enabled: v } })}
        label="启用裁剪"
        description="开启后可设置裁剪比例和输出尺寸"
      />

      {params.enabled && hasImage && (
        <button
          type="button"
          onClick={handleOpenCropEditor}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
            'bg-gradient-accent/10 border border-accent-500/30 text-accent-400',
            'hover:bg-gradient-accent/20 hover:border-accent-500/50',
            'transition-all duration-200 text-sm font-medium',
          )}
        >
          <Maximize2 size={16} />
          打开可视化裁剪编辑器
        </button>
      )}

      <div className={cn('space-y-4', !params.enabled && 'opacity-50 pointer-events-none')}>
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-100">比例预设</span>
          <div className="flex flex-wrap gap-2">
            {aspectOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => applyChange({ crop: { aspect: opt.value } })}
                className={cn(
                  'tag',
                  params.aspect === opt.value && 'tag-active'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="裁剪旋转"
          value={params.rotation}
          onChange={(v) => applyChange({ crop: { rotation: v } })}
          min={-180}
          max={180}
          unit="°"
          showInput
        />

        <Slider
          label="缩放"
          value={Math.round(params.zoom * 100)}
          onChange={(v) => applyChange({ crop: { zoom: v / 100 } })}
          min={100}
          max={300}
          unit="%"
          showInput
        />

        <div className="glass-card p-4 space-y-3">
          <span className="text-sm font-medium text-ink-100">输出尺寸</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Width"
              value={params.outputWidth ?? ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="flex-1 bg-ink-700/60 border border-accent-500/40 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-ink-300 outline-none focus:border-accent-500 transition-colors text-center"
            />
            <button
              type="button"
              onClick={toggleLock}
              className={cn(
                'p-2 rounded-xl transition-all duration-200',
                isLocked
                  ? 'bg-gradient-accent text-white shadow-glow'
                  : 'bg-ink-600/60 text-ink-300 hover:text-ink-100 hover:bg-ink-600'
              )}
            >
              {isLocked ? <Link size={18} /> : <Unlink size={18} />}
            </button>
            <input
              type="number"
              placeholder="Height"
              value={params.outputHeight ?? ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="flex-1 bg-ink-700/60 border border-accent-500/40 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-ink-300 outline-none focus:border-accent-500 transition-colors text-center"
            />
          </div>
          <div className="text-center text-xs text-ink-300">px</div>
        </div>
      </div>
    </section>
  )
}
