import type { ImageMeta, ProcessedMeta, ProcessParams, OutputFormat, EncoderType } from '@/types'
import { readImageMeta } from '@/utils/exif'
import {
  applyEditAndExif,
  cropImage,
  compressImageCanvas,
  compressToTargetSize,
  resolveMimeType,
  isFormatSupported as isCanvasFormatSupported,
} from '@/utils/imageCompress'
import { compressWithSquoosh, getSquooshFormatFromMime, type SquooshFormat } from '@/utils/squoosh'
import { estimateSSIM, getImageDataFromUrl } from '@/utils/ssim'

export interface PipelineInput {
  file: File
  originalUrl: string
  originalMeta: ImageMeta
  params: ProcessParams
  onProgress?: (progress: number) => void
}

export interface PipelineOutput {
  blob: Blob
  url: string
  meta: ProcessedMeta
  encoderUsed: EncoderType
  outputFormat: OutputFormat
  formatFellBack: boolean
  originalFormatFallbackFrom?: OutputFormat
}

const SQUOOSH_SUPPORTED_FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif']

export function resolveOutputFormat(
  requested: OutputFormat,
  originalMime: string,
  encoder: EncoderType,
): { format: OutputFormat; fellBack: boolean; original?: OutputFormat } {
  if (requested === 'original') {
    return { format: 'original', fellBack: false }
  }

  if (encoder === 'squoosh') {
    if (SQUOOSH_SUPPORTED_FORMATS.includes(requested)) {
      return { format: requested, fellBack: false }
    }
    const fallback: OutputFormat = 'jpeg'
    return { format: fallback, fellBack: true, original: requested }
  }

  const mime = resolveMimeType(requested, originalMime)
  if (isCanvasFormatSupported(mime)) {
    return { format: requested, fellBack: false }
  }

  const fallbackChain: OutputFormat[] = ['webp', 'png', 'jpeg']
  const requestedIdx = fallbackChain.indexOf(requested)
  for (let i = requestedIdx + 1; i < fallbackChain.length; i++) {
    const fallback = fallbackChain[i]
    const fallbackMime = resolveMimeType(fallback, originalMime)
    if (isCanvasFormatSupported(fallbackMime)) {
      return { format: fallback, fellBack: true, original: requested }
    }
  }

  return { format: 'jpeg', fellBack: true, original: requested }
}

function collectUrls(urls: Set<string>): () => void {
  return () => {
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u)
      } catch {
        // ignore
      }
    }
    urls.clear()
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

async function stageApplyExifAndEdit(
  input: PipelineInput,
  tempUrls: Set<string>,
): Promise<{ canvas: HTMLCanvasElement | null; url: string; blob: Blob; changed: boolean }> {
  const { file, originalUrl, originalMeta, params, onProgress } = input

  const needsEdit =
    params.edit.rotation !== 0 ||
    params.edit.flipH ||
    params.edit.flipV ||
    params.edit.grayscale ||
    originalMeta.exifOrientation !== 1

  if (!needsEdit) {
    return { canvas: null, url: originalUrl, blob: file, changed: false }
  }

  const result = await applyEditAndExif(file, originalMeta.exifOrientation, params.edit)
  tempUrls.add(result.url)
  onProgress?.(35)
  return { canvas: result.canvas, url: result.url, blob: result.blob, changed: true }
}

async function stageCrop(
  input: PipelineInput,
  afterEdit: { canvas: HTMLCanvasElement | null; url: string; blob: Blob; changed: boolean },
  tempUrls: Set<string>,
): Promise<{ canvas: HTMLCanvasElement | null; url: string; blob: Blob; changed: boolean }> {
  const { params, onProgress } = input

  if (!params.crop.enabled) {
    return afterEdit
  }

  const cropped = await cropImage(afterEdit.url, params.crop.cropArea, {
    rotation: params.crop.rotation,
    flipH: params.edit.flipH && !afterEdit.changed,
    flipV: params.edit.flipV && !afterEdit.changed,
    outputWidth: params.crop.outputWidth ?? undefined,
    outputHeight: params.crop.outputHeight ?? undefined,
  })
  tempUrls.add(cropped.url)
  onProgress?.(55)
  return { canvas: cropped.canvas, url: cropped.url, blob: cropped.blob, changed: true }
}

async function stageEncode(
  input: PipelineInput,
  afterCrop: { canvas: HTMLCanvasElement | null; url: string; blob: Blob; changed: boolean },
  resolvedFormat: OutputFormat,
  tempUrls: Set<string>,
): Promise<{ blob: Blob; url: string; qualityUsed: number; encoderUsed: EncoderType }> {
  const { params, originalMeta, onProgress } = input
  const mimeType = resolveMimeType(resolvedFormat, originalMeta.mimeType)

  const squooshFormat = getSquooshFormatFromMime(mimeType)
  const trySquoosh = params.compression.encoder === 'squoosh' && squooshFormat !== null

  if (trySquoosh) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Squoosh timeout')), 30000),
      )
      const result = await Promise.race([
        compressWithSquoosh(
          afterCrop.canvas ?? afterCrop.blob,
          {
            format: squooshFormat as SquooshFormat,
            quality: params.compression.quality,
            targetSizeKB: params.compression.targetSizeKB ?? null,
          },
          (p) => onProgress?.(55 + p * 0.38),
        ),
        timeout,
      ])
      tempUrls.add(result.url)
      return { blob: result.blob, url: result.url, qualityUsed: result.qualityUsed, encoderUsed: 'squoosh' }
    } catch (err) {
      console.warn('Squoosh encoding failed, falling back to Canvas:', err)
    }
  }

  if (params.compression.targetSizeKB && params.compression.targetSizeKB > 0) {
    const result = await compressToTargetSize(
      afterCrop.canvas ?? afterCrop.blob,
      mimeType,
      params.compression.targetSizeKB,
      (p) => onProgress?.(55 + p * 0.38),
    )
    tempUrls.add(result.url)
    return { blob: result.blob, url: result.url, qualityUsed: result.qualityUsed, encoderUsed: 'canvas' }
  }

  const result = await compressImageCanvas(afterCrop.canvas ?? afterCrop.blob, mimeType, params.compression.quality)
  tempUrls.add(result.url)
  onProgress?.(90)
  return { blob: result.blob, url: result.url, qualityUsed: params.compression.quality, encoderUsed: 'canvas' }
}

async function stageMetrics(
  input: PipelineInput,
  encoded: { blob: Blob; url: string; qualityUsed: number; encoderUsed: EncoderType },
  outputFormat: OutputFormat,
  formatFellBack: boolean,
  originalFormatFallbackFrom?: OutputFormat,
): Promise<ProcessedMeta> {
  const { originalUrl } = input

  let ssim: number | undefined
  try {
    const [origImgData, procImgData] = await Promise.all([
      getImageDataFromUrl(originalUrl),
      getImageDataFromUrl(encoded.url),
    ])
    const minW = Math.min(origImgData.width, procImgData.width)
    const minH = Math.min(origImgData.height, procImgData.height)
    if (minW > 0 && minH > 0) {
      ssim = estimateSSIM(origImgData.data, procImgData.data, minW, minH)
    }
  } catch {
    // SSIM is optional
  }

  const procImg = await loadImage(encoded.url)

  return {
    width: procImg.naturalWidth,
    height: procImg.naturalHeight,
    size: encoded.blob.size,
    mimeType: encoded.blob.type,
    ssim,
    qualityUsed: encoded.qualityUsed,
    encoderUsed: encoded.encoderUsed,
    outputFormat,
    formatFellBack,
    originalFormatFallbackFrom,
  }
}

export async function processImageItem(input: PipelineInput): Promise<PipelineOutput> {
  const { params, originalMeta, onProgress } = input

  const tempUrls = new Set<string>()
  const cleanup = collectUrls(tempUrls)

  try {
    onProgress?.(15)

    const formatInfo = resolveOutputFormat(
      params.compression.outputFormat,
      originalMeta.mimeType,
      params.compression.encoder,
    )
    const effectiveFormat = formatInfo.format === 'original'
      ? mimeToOutputFormat(originalMeta.mimeType) ?? 'jpeg'
      : formatInfo.format

    const afterEdit = await stageApplyExifAndEdit(input, tempUrls)
    const afterCrop = await stageCrop(input, afterEdit, tempUrls)
    const encoded = await stageEncode(input, afterCrop, effectiveFormat, tempUrls)
    onProgress?.(93)

    const meta = await stageMetrics(
      input,
      encoded,
      effectiveFormat,
      formatInfo.fellBack,
      formatInfo.original,
    )
    onProgress?.(98)

    const finalUrl = encoded.url
    tempUrls.delete(finalUrl)

    return {
      blob: encoded.blob,
      url: finalUrl,
      meta,
      encoderUsed: encoded.encoderUsed,
      outputFormat: effectiveFormat,
      formatFellBack: formatInfo.fellBack,
      originalFormatFallbackFrom: formatInfo.original,
    }
  } finally {
    cleanup()
  }
}

function mimeToOutputFormat(mime: string): OutputFormat | null {
  if (mime === 'image/jpeg') return 'jpeg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/avif') return 'avif'
  return null
}
