import type { CompressionParams, EditParams, OutputFormat, CropParams } from '@/types'

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
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 1, 1)
    const dataUrl = canvas.toDataURL(mimeType, 0.5)
    return dataUrl.indexOf(`data:${mimeType}`) === 0
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function getOrientedDimensions(
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width }
  }
  return { width, height }
}

export function drawImageWithOrientation(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  orientation: number,
): void {
  const { width, height } = getOrientedDimensions(img.naturalWidth, img.naturalHeight, orientation)
  ctx.save()

  switch (orientation) {
    case 2:
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      break
    case 3:
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      break
    case 4:
      ctx.translate(0, height)
      ctx.scale(1, -1)
      break
    case 5:
      ctx.rotate(0.5 * Math.PI)
      ctx.scale(1, -1)
      break
    case 6:
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(0, -height)
      break
    case 7:
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(width, -height)
      ctx.scale(-1, 1)
      break
    case 8:
      ctx.rotate(-0.5 * Math.PI)
      ctx.translate(-width, 0)
      break
  }

  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
  ctx.restore()
}

export async function applyEditAndExif(
  source: string | File | Blob,
  exifOrientation: number,
  edit: EditParams,
): Promise<{ canvas: HTMLCanvasElement; url: string; blob: Blob }> {
  let img: HTMLImageElement
  if (typeof source === 'string') {
    img = await loadImage(source)
  } else {
    img = await loadImageFromFile(source)
  }

  const { width: baseW, height: baseH } = getOrientedDimensions(
    img.naturalWidth,
    img.naturalHeight,
    exifOrientation,
  )

  const effectiveRotation = ((edit.rotation % 360) + 360) % 360
  const rotationSwap = effectiveRotation === 90 || effectiveRotation === 270
  const finalW = rotationSwap ? baseH : baseW
  const finalH = rotationSwap ? baseW : baseH

  const canvas = document.createElement('canvas')
  canvas.width = finalW
  canvas.height = finalH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  ctx.save()
  ctx.translate(finalW / 2, finalH / 2)
  if (edit.flipH) ctx.scale(-1, 1)
  if (edit.flipV) ctx.scale(1, -1)
  ctx.rotate((effectiveRotation * Math.PI) / 180)

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = baseW
  tempCanvas.height = baseH
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('Failed to get temp canvas context')
  drawImageWithOrientation(tempCtx, img, exifOrientation)

  ctx.drawImage(tempCanvas, -baseW / 2, -baseH / 2)
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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Failed to create blob from canvas'))
      },
      'image/png',
      1,
    )
  })

  const url = URL.createObjectURL(blob)
  return { canvas, url, blob }
}

export async function cropImage(
  sourceUrl: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  options: {
    rotation?: number
    flipH?: boolean
    flipV?: boolean
    outputWidth?: number
    outputHeight?: number
  } = {},
): Promise<{ blob: Blob; url: string; canvas: HTMLCanvasElement }> {
  const img = await loadImage(sourceUrl)
  const { rotation = 0, flipH = false, flipV = false, outputWidth, outputHeight } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  const rotRad = (rotation * Math.PI) / 180

  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * img.naturalWidth) + Math.abs(Math.sin(rotRad) * img.naturalHeight)
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * img.naturalWidth) + Math.abs(Math.cos(rotRad) * img.naturalHeight)

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2)
  ctx.drawImage(img, 0, 0)

  const finalWidth = outputWidth ?? Math.round(pixelCrop.width)
  const finalHeight = outputHeight ?? Math.round(pixelCrop.height)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) throw new Error('No 2d context')

  croppedCanvas.width = finalWidth
  croppedCanvas.height = finalHeight

  croppedCtx.imageSmoothingEnabled = true
  croppedCtx.imageSmoothingQuality = 'high'

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Canvas is empty'))
      },
      'image/png',
      1,
    )
  })

  const url = URL.createObjectURL(blob)
  return { blob, url, canvas: croppedCanvas }
}

export async function compressImageCanvas(
  source: string | File | Blob | HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<{ blob: Blob; url: string }> {
  let canvas: HTMLCanvasElement

  if (source instanceof HTMLCanvasElement) {
    canvas = source
  } else if (typeof source === 'string') {
    const img = await loadImage(source)
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2d context')
    ctx.drawImage(img, 0, 0)
  } else {
    const img = await loadImageFromFile(source)
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2d context')
    ctx.drawImage(img, 0, 0)
  }

  let finalMime = mimeType
  if (!isFormatSupported(finalMime)) {
    finalMime = 'image/jpeg'
  }

  if (finalMime === 'image/jpeg' || finalMime === 'image/jpg') {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const w = canvas.width
      const h = canvas.height
      const imgData = ctx.getImageData(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.putImageData(imgData, 0, 0)
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Failed to compress image'))
      },
      finalMime,
      quality / 100,
    )
  })

  const url = URL.createObjectURL(blob)
  return { blob, url }
}

export async function compressToTargetSize(
  source: string | File | Blob | HTMLCanvasElement,
  mimeType: string,
  targetSizeKB: number,
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; url: string; qualityUsed: number }> {
  const targetBytes = targetSizeKB * 1024
  let low = 1
  let high = 100
  let bestBlob: Blob | null = null
  let bestQuality = 80
  const maxIterations = 8

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2)
    onProgress?.((i / maxIterations) * 100)

    try {
      const { blob } = await compressImageCanvas(source, mimeType, mid)
      if (blob.size <= targetBytes) {
        bestBlob = blob
        bestQuality = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
      if (Math.abs(low - high) <= 3) break
    } catch {
      high = mid - 1
    }
  }

  if (bestBlob) {
    const url = URL.createObjectURL(bestBlob)
    onProgress?.(100)
    return { blob: bestBlob, url, qualityUsed: bestQuality }
  }

  const { blob, url } = await compressImageCanvas(source, mimeType, low)
  onProgress?.(100)
  return { blob, url, qualityUsed: low }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
