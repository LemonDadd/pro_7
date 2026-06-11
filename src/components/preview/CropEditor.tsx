import { useState, useCallback, useEffect, useMemo } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { ZoomIn, ZoomOut, RotateCw, Move, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { AspectRatio } from '@/types'
import { ASPECT_RATIO_VALUES, ID_PHOTO_SIZE } from '@/types'
import IconButton from '@/components/common/IconButton'

const checkerboardStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(148,163,184,0.1) 25%, transparent 25%),' +
    'linear-gradient(-45deg, rgba(148,163,184,0.1) 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.1) 75%),' +
    'linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.1) 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
}

interface CropEditorProps {
  imageUrl: string
  imageId: string
  onComplete?: (pixelCrop: Area) => void
  onCancel?: () => void
  aspect?: AspectRatio
}

export default function CropEditor({
  imageUrl,
  imageId,
  onComplete,
  onCancel,
  aspect,
}: CropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const image = useAppStore((s) => s.images.find((i) => i.id === imageId) ?? null)
  const updateParams = useAppStore((s) => s.updateParams)
  const updateCropArea = useAppStore((s) => s.updateCropArea)

  const currentAspect = aspect ?? image?.params.crop.aspect ?? 'free'
  const aspectValue = useMemo(
    () => (currentAspect === 'free' ? undefined : ASPECT_RATIO_VALUES[currentAspect] ?? undefined),
    [currentAspect],
  )

  useEffect(() => {
    if (image?.params.crop) {
      setZoom(image.params.crop.zoom || 1)
      setRotation(image.params.crop.rotation || 0)
    }
  }, [image?.params.crop.zoom, image?.params.crop.rotation, currentAspect])

  useEffect(() => {
    if (currentAspect === 'id-photo' && image?.originalMeta.width) {
      const imgW = image.originalMeta.width
      const imgH = image.originalMeta.height
      const ratio = ID_PHOTO_SIZE.width / ID_PHOTO_SIZE.height
      let cropW: number
      if (ratio > imgW / imgH) {
        cropW = imgW
      } else {
        cropW = (imgH * ratio)
      }
      const autoZoom = imgW / cropW
      setZoom(autoZoom)
    }
  }, [currentAspect, image?.originalMeta])

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 1))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const handleConfirm = () => {
    if (croppedAreaPixels && image) {
      updateParams(imageId, {
        crop: {
          cropArea: {
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height,
          },
          rotation,
          zoom,
        },
      })

      if (currentAspect === 'id-photo') {
        updateParams(imageId, {
          crop: {
            outputWidth: ID_PHOTO_SIZE.width,
            outputHeight: ID_PHOTO_SIZE.height,
          },
        })
      }

      onComplete?.(croppedAreaPixels)
    }
  }

  const handleCancel = () => {
    onCancel?.()
  }

  return (
    <div
      className="glass-card flex flex-col h-full min-h-[400px]"
      style={checkerboardStyle}
    >
      <div className="flex items-center justify-between p-3 border-b border-ink-500/30">
        <div className="flex items-center gap-2">
          <Move size={16} className="text-accent-400" />
          <span className="text-sm font-medium text-ink-100">裁剪编辑</span>
          <span className="text-xs text-ink-400">
            {currentAspect === 'free'
              ? '自由比例'
              : currentAspect === 'id-photo'
              ? `证件照 ${ID_PHOTO_SIZE.width}×${ID_PHOTO_SIZE.height}`
              : currentAspect}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton icon={ZoomOut} onClick={handleZoomOut} size={16} title="缩小" />
          <span className="text-xs font-mono text-ink-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton icon={ZoomIn} onClick={handleZoomIn} size={16} title="放大" />
          <div className="w-px h-5 bg-ink-500/30 mx-1" />
          <IconButton icon={RotateCw} onClick={handleRotate} size={16} title="旋转 90°" />
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectValue}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          cropShape="rect"
          showGrid={true}
          classes={{
            containerClassName: 'absolute inset-0',
          }}
        />
      </div>

      <div className="flex items-center justify-between p-3 border-t border-ink-500/30">
        <div className="text-xs text-ink-300 font-mono">
          {croppedAreaPixels
            ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)} px`
            : '拖拽调整裁剪区域'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5',
              'bg-ink-600/60 text-ink-200 hover:bg-ink-600 border border-ink-500/30',
              'transition-all duration-200',
            )}
          >
            <X size={14} />
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5',
              'bg-gradient-accent text-white shadow-glow hover:scale-[1.02]',
              'transition-all duration-200',
            )}
          >
            <Check size={14} />
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  )
}
