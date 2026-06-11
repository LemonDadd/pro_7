import imageCompression from 'browser-image-compression'
import type { CompressionParams, EditParams, OutputFormat } from '@/types'
import { drawImageWithOrientation } from './exif'

export function resolveMimeType(
  outputFormat: OutputFormat,
  originalMime: string,
): string {
  switch (outputFormat) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'original':
    default:
      return originalMime || 'image/jpeg'
  }
}

export function isFormatSupported(mimeType: string): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL(mimeType, 0.5).indexOf(`data:${mimeType}`) === 0
  } catch {
    return false
  }
}

export function getBestSupportedFormat(requested: OutputFormat, original: string): OutputFormat {
  if (requested === 'original') return 'original'
  const mime = resolveMimeType(requested, original)
  if (isFormatSupported(mime)) return requested
  if (requested === 'avif' && isFormatSupported('image/webp')) return 'webp'
  if (requested === 'webp' && isFormatSupported('image/png')) return 'png'
  return 'jpeg'
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function applyEditTransforms(
  sourceUrl: string,
  exifOrientation: number,
  edit: EditParams,
): Promise<string> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  let { naturalWidth: w, naturalHeight: h } = img

  // Account for EXIF orientation swap
  const needsSwap = exifOrientation >= 5 && exifOrientation <= 8
  if (needsSwap) {
    ;[w, h] = [h, w]
  }

  // Account for additional rotation from edit
  const effectiveRotation = (edit.rotation % 360 + 360) % 360
  const rotationSwap = effectiveRotation === 90 || effectiveRotation === 270
  let finalW = rotationSwap ? h : w
  let finalH = rotationSwap ? w : h

  // Account for flip - doesn't change dimensions
  canvas.width = finalW
  canvas.height = finalH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  // Center, rotate, flip
  ctx.save()
  ctx.translate(finalW / 2, finalH / 2)
  if (edit.flipH) ctx.scale(-1, 1)
  if (edit.flipV) ctx.scale(1, -1)
  ctx.rotate((effectiveRotation * Math.PI) / 180)

  // Handle EXIF orientation on the source image before applying edit transforms
  const tempCanvas = document.createElement('canvas')
  const tempW = needsSwap ? img.naturalHeight : img.naturalWidth
  const tempH = needsSwap ? img.naturalWidth : img.naturalHeight
  tempCanvas.width = tempW
  tempCanvas.height = tempH
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('Failed to get temp canvas context')
  drawImageWithOrientation(tempCtx, img, exifOrientation)

  ctx.drawImage(tempCanvas, -tempW / 2, -tempH / 2)
  ctx.restore()

  if (edit.grayscale) {
    const imageData = ctx.getImageData(0, 0, finalW, finalH)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }
    ctx.putImageData(imageData, 0, 0)
  }

  return canvas.toDataURL('image/png')
}

export async function compressImage(
  file: File | Blob,
  params: CompressionParams,
  originalMime: string,
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; qualityUsed: number }> {
  const effectiveFormat = getBestSupportedFormat(params.outputFormat, originalMime)
  const mimeType = resolveMimeType(effectiveFormat, originalMime)

  const options: Parameters<typeof imageCompression>[1] = {
    maxSizeMB: 100,
    maxWidthOrHeight: 10000,
    useWebWorker: true,
    initialQuality: params.quality / 100,
    fileType: mimeType as any,
    onProgress,
    preserveExif: !params.stripExif,
  }

  if (params.targetSizeKB && params.targetSizeKB > 0) {
    const targetMB = params.targetSizeKB / 1024
    // Use binary search approach with library iterating down
    try {
      const result = await compressToTargetSize(file, {
        ...options,
        targetSizeMB: targetMB,
      } as any)
      return result
    } catch {
      const blob = await imageCompression(file as File, options)
      return { blob, qualityUsed: params.quality }
    }
  }

  const blob = await imageCompression(file as File, options)
  return { blob, qualityUsed: params.quality }
}

async function compressToTargetSize(
  file: File | Blob,
  baseOptions: any,
): Promise<{ blob: Blob; qualityUsed: number }> {
  const targetMB = baseOptions.targetSizeMB
  let low = 1
  let high = 100
  let bestBlob: Blob | null = null
  let bestQuality = 80
  const maxIterations = 6

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2)
    const opts = {
      ...baseOptions,
      initialQuality: mid / 100,
    }
    try {
      const blob = await imageCompression(file as File, opts)
      const sizeMB = blob.size / (1024 * 1024)
      if (sizeMB <= targetMB) {
        bestBlob = blob
        bestQuality = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
      if (Math.abs(low - high) <= 5) break
    } catch {
      high = mid - 1
    }
  }

  if (bestBlob) {
    return { blob: bestBlob, qualityUsed: bestQuality }
  }

  const fallback = await imageCompression(file as File, {
    ...baseOptions,
    initialQuality: low / 100,
  })
  return { blob: fallback, qualityUsed: low }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string, mimeType?: string): Blob {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeType || (mimeMatch ? mimeMatch[1] : 'image/png')
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}
