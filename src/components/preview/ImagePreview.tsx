import { ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  imageUrl: string
  alt?: string
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

export default function ImagePreview({
  imageUrl,
  alt = 'Preview',
  zoom = 1,
}: ImagePreviewProps) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          'glass-card min-h-[400px] flex flex-col items-center justify-center',
          'text-ink-300'
        )}
      >
        <ImagePlus size={56} className="mb-3 opacity-60" />
        <p className="text-sm">请导入图片</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'glass-card min-h-[400px] flex items-center justify-center',
        zoom === 2 && 'overflow-auto'
      )}
      style={checkerboardStyle}
    >
      {zoom === 2 ? (
        <div className="flex items-center justify-center min-w-full min-h-full">
          <img
            src={imageUrl}
            alt={alt}
            className="block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-[600px] object-contain"
        />
      )}
    </div>
  )
}
