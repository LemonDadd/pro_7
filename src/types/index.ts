export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif'
export type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | 'id-photo'
export type ImageStatus = 'pending' | 'processing' | 'done' | 'error'
export type EncoderType = 'canvas' | 'squoosh'

export interface ImageMeta {
  width: number
  height: number
  size: number
  mimeType: string
  exifOrientation: number
  hasExif: boolean
  hasGps: boolean
}

export interface ProcessedMeta {
  width: number
  height: number
  size: number
  mimeType: string
  ssim?: number
  qualityUsed: number
  encoderUsed: EncoderType
  outputFormat: OutputFormat
  formatFellBack: boolean
  originalFormatFallbackFrom?: OutputFormat
}

export interface CompressionParams {
  quality: number
  targetSizeKB: number | null
  outputFormat: OutputFormat
  stripExif: boolean
  encoder: EncoderType
}

export interface CropParams {
  enabled: boolean
  aspect: AspectRatio
  cropArea: { x: number; y: number; width: number; height: number }
  rotation: number
  zoom: number
  outputWidth: number | null
  outputHeight: number | null
}

export interface EditParams {
  rotation: number
  flipH: boolean
  flipV: boolean
  grayscale: boolean
}

export interface ProcessParams {
  compression: CompressionParams
  crop: CropParams
  edit: EditParams
}

export interface ImageItem {
  id: string
  file: File
  name: string
  originalUrl: string
  processedUrl: string | null
  processedBlob: Blob | null
  originalMeta: ImageMeta
  processedMeta: ProcessedMeta | null
  status: ImageStatus
  error?: string
  params: ProcessParams
  progress: number
}

export interface AppState {
  images: ImageItem[]
  selectedId: string | null
  globalParams: ProcessParams
  applyToAll: boolean
  compareZoom: 1 | 2
  comparePosition: number
}

export const DEFAULT_PARAMS: ProcessParams = {
  compression: {
    quality: 80,
    targetSizeKB: null,
    outputFormat: 'original',
    stripExif: true,
    encoder: 'canvas',
  },
  crop: {
    enabled: false,
    aspect: 'free',
    cropArea: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    zoom: 1,
    outputWidth: null,
    outputHeight: null,
  },
  edit: {
    rotation: 0,
    flipH: false,
    flipV: false,
    grayscale: false,
  },
}

export const ASPECT_RATIO_VALUES: Record<AspectRatio, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  'id-photo': 295 / 413,
}

export const ID_PHOTO_SIZE = { width: 295, height: 413 }

export const MAX_IMAGES = 20
export const MAX_FILE_SIZE = 25 * 1024 * 1024
export const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export interface PartialProcessParams {
  compression?: Partial<CompressionParams>
  crop?: Partial<CropParams>
  edit?: Partial<EditParams>
}
