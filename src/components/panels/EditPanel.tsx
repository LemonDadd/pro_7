import { Sliders, RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react'
import Toggle from '@/components/common/Toggle'
import IconButton from '@/components/common/IconButton'
import { useAppStore } from '@/store/useAppStore'
import type { PartialProcessParams } from '@/types'
import { cn } from '@/lib/utils'

export default function EditPanel() {
  const { selectedId, applyToAll, images, globalParams, updateParams, updateGlobalParams } = useAppStore()

  const params = selectedId
    ? images.find((img) => img.id === selectedId)?.params.edit ?? globalParams.edit
    : globalParams.edit

  const applyChange = (partial: PartialProcessParams) => {
    if (applyToAll) {
      updateGlobalParams(partial)
    } else if (selectedId) {
      updateParams(selectedId, partial)
    }
  }

  const rotateLeft = () => {
    applyChange({ edit: { rotation: (params.rotation - 90 + 360) % 360 } })
  }

  const rotateRight = () => {
    applyChange({ edit: { rotation: (params.rotation + 90) % 360 } })
  }

  return (
    <section className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-accent shadow-glow">
          <Sliders size={20} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-ink-100">编辑调整</h2>
      </div>

      <div className="glass-card p-4 space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-100">旋转</span>
          <div className="flex items-center gap-2">
            <IconButton
              icon={RotateCcw}
              onClick={rotateLeft}
              size={20}
              title="逆时针旋转 90°"
            />
            <IconButton
              icon={RotateCw}
              onClick={rotateRight}
              size={20}
              title="顺时针旋转 90°"
            />
            <span className="ml-2 text-sm font-mono text-accent-400">{params.rotation}°</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-100">翻转</span>
          <div className="flex items-center gap-2">
            <IconButton
              icon={FlipHorizontal}
              onClick={() => applyChange({ edit: { flipH: !params.flipH } })}
              size={20}
              title="水平翻转"
              className={cn(params.flipH && 'bg-gradient-accent text-white shadow-glow')}
            />
            <IconButton
              icon={FlipVertical}
              onClick={() => applyChange({ edit: { flipV: !params.flipV } })}
              size={20}
              title="垂直翻转"
              className={cn(params.flipV && 'bg-gradient-accent text-white shadow-glow')}
            />
          </div>
        </div>
      </div>

      <Toggle
        checked={params.grayscale}
        onChange={(v) => applyChange({ edit: { grayscale: v } })}
        label="灰度 / 黑白效果"
        description="将图片转换为灰度模式"
      />

      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-sm text-ink-200">
          当前参数将应用到选中图片
        </span>
        {applyToAll && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-success-500/20 text-success-400 border border-success-500/30">
            应用到全部
          </span>
        )}
      </div>
    </section>
  )
}
