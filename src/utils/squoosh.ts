import mozjpegEnc from '@jsquash/jpeg/codec/enc/mozjpeg_enc.js'
import mozjpegDec from '@jsquash/jpeg/codec/dec/mozjpeg_dec.js'
import initPngWasm, { encode as pngEncode } from '@jsquash/png/codec/pkg/squoosh_png.js'
import webpEnc from '@jsquash/webp/codec/enc/webp_enc.js'
import webpDec from '@jsquash/webp/codec/dec/webp_dec.js'
import avifEnc from '@jsquash/avif/codec/enc/avif_enc.js'
import { defaultOptions as jpegDefaultOptions } from '@jsquash/jpeg/meta'
import { defaultOptions as webpDefaultOptions } from '@jsquash/webp/meta'
import { defaultOptions as avifDefaultOptions } from '@jsquash/avif/meta'
import type { EncodeOptions as JpegEncodeOptions } from '@jsquash/jpeg/codec/enc/mozjpeg_enc'
import type { EncodeOptions as WebPEncodeOptions } from '@jsquash/webp/codec/enc/webp_enc'
import type { EncodeOptions as AvifEncodeOptions } from '@jsquash/avif/codec/enc/avif_enc'

export type SquooshFormat = 'jpeg' | 'png' | 'webp' | 'avif'

interface SquooshOptions {
  quality?: number
  targetSizeKB?: number | null
  format: SquooshFormat
}

type ModuleType = any
const modules: Partial<Record<string, Promise<ModuleType>>> = {}
const pngReady: { promise?: Promise<void> } = {}

function initEmscriptenModule(factory: ModuleType): Promise<ModuleType> {
  return new Promise((resolve) => {
    const instance = factory({
      noInitialRun: true,
      onRuntimeInitialized() {
        resolve(instance)
      },
    })
  })
}

async function getEmscriptenModule(key: string, factory: ModuleType): Promise<ModuleType> {
  if (!modules[key]) {
    modules[key] = initEmscriptenModule(factory)
  }
  return modules[key]
}

async function initPng(): Promise<void> {
  if (!pngReady.promise) {
    pngReady.promise = (async () => {
      await initPngWasm()
    })()
  }
  return pngReady.promise
}

async function ensureInit(format: SquooshFormat): Promise<void> {
  switch (format) {
    case 'jpeg':
      await Promise.all([
        getEmscriptenModule('jpeg-enc', mozjpegEnc),
        getEmscriptenModule('jpeg-dec', mozjpegDec),
      ])
      break
    case 'png':
      await initPng()
      break
    case 'webp':
      await Promise.all([
        getEmscriptenModule('webp-enc', webpEnc),
        getEmscriptenModule('webp-dec', webpDec),
      ])
      break
    case 'avif':
      await getEmscriptenModule('avif-enc', avifEnc)
      break
  }
}

export async function isSquooshSupported(format: SquooshFormat): Promise<boolean> {
  try {
    await ensureInit(format)
    return true
  } catch {
    return false
  }
}

async function blobToImageData(blob: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    if (blob.type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

async function encodeJpeg(imageData: ImageData, quality: number): Promise<ArrayBuffer> {
  const mod = await getEmscriptenModule('jpeg-enc', mozjpegEnc)
  const options: Partial<JpegEncodeOptions> = {
    ...jpegDefaultOptions,
    quality,
    progressive: true,
  }
  const result = mod.encode(imageData.data, imageData.width, imageData.height, options)
  return result.buffer
}

async function encodePng(imageData: ImageData): Promise<ArrayBuffer> {
  await initPng()
  const rgbaData = new Uint8Array(imageData.data.buffer)
  const result = pngEncode(rgbaData, imageData.width, imageData.height, 8)
  return result.buffer
}

async function encodeWebp(imageData: ImageData, quality: number): Promise<ArrayBuffer> {
  const mod = await getEmscriptenModule('webp-enc', webpEnc)
  const options: Partial<WebPEncodeOptions> = {
    ...webpDefaultOptions,
    quality,
    method: 4,
  }
  const result = mod.encode(imageData.data, imageData.width, imageData.height, options)
  if (!result) throw new Error('WebP encoding failed')
  return result.buffer
}

async function encodeAvif(imageData: ImageData, quality: number): Promise<ArrayBuffer> {
  const mod = await getEmscriptenModule('avif-enc', avifEnc)
  const options: Partial<AvifEncodeOptions> & { lossless?: boolean } = {
    ...avifDefaultOptions,
    quality,
    speed: 6,
    subsample: 1,
    lossless: false,
  }
  const data = new Uint8Array(imageData.data.buffer)
  const result = mod.encode(data, imageData.width, imageData.height, options)
  if (!result) throw new Error('AVIF encoding failed')
  return result.buffer
}

async function encodeWithSquoosh(
  imageData: ImageData,
  format: SquooshFormat,
  quality: number,
): Promise<ArrayBuffer> {
  await ensureInit(format)

  switch (format) {
    case 'jpeg':
      return encodeJpeg(imageData, quality)
    case 'png':
      return encodePng(imageData)
    case 'webp':
      return encodeWebp(imageData, quality)
    case 'avif':
      return encodeAvif(imageData, quality)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

export async function compressWithSquoosh(
  source: Blob | File | HTMLCanvasElement | ImageData,
  options: SquooshOptions,
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; url: string; qualityUsed: number }> {
  const { format, quality = 80, targetSizeKB = null } = options
  await ensureInit(format)
  onProgress?.(10)

  let imageData: ImageData
  if (source instanceof ImageData) {
    imageData = source
  } else if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    imageData = ctx.getImageData(0, 0, source.width, source.height)
  } else {
    imageData = await blobToImageData(source)
  }

  onProgress?.(30)

  const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`

  if (targetSizeKB && targetSizeKB > 0 && format !== 'png') {
    const result = await binarySearchCompress(imageData, format, targetSizeKB, onProgress)
    const blob = new Blob([result.buffer], { type: mime })
    const url = URL.createObjectURL(blob)
    return { blob, url, qualityUsed: result.quality }
  }

  const buffer = await encodeWithSquoosh(imageData, format, quality)
  onProgress?.(100)

  const blob = new Blob([buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  return { blob, url, qualityUsed: quality }
}

interface BinarySearchResult {
  buffer: ArrayBuffer
  quality: number
}

async function binarySearchCompress(
  imageData: ImageData,
  format: SquooshFormat,
  targetSizeKB: number,
  onProgress?: (progress: number) => void,
): Promise<BinarySearchResult> {
  const targetBytes = targetSizeKB * 1024
  let low = 1
  let high = 100
  let bestBuffer: ArrayBuffer | null = null
  let bestQuality = 80
  const maxIterations = 8

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2)
    const progress = 30 + (i / maxIterations) * 65
    onProgress?.(progress)

    try {
      const buffer = await encodeWithSquoosh(imageData, format, mid)
      if (buffer.byteLength <= targetBytes) {
        bestBuffer = buffer
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

  if (bestBuffer) {
    onProgress?.(95)
    return { buffer: bestBuffer, quality: bestQuality }
  }

  const fallback = await encodeWithSquoosh(imageData, format, low)
  onProgress?.(95)
  return { buffer: fallback, quality: low }
}

export function getSquooshFormatFromMime(mimeType: string): SquooshFormat | null {
  if (mimeType === 'image/jpeg') return 'jpeg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/avif') return 'avif'
  return null
}
