import { create } from 'zustand'
import type { AppState, ImageItem, ProcessParams, PartialProcessParams } from '@/types'
import { DEFAULT_PARAMS as defaultParams } from '@/types'
import { readImageMeta } from '@/utils/exif'
import {
  applyEditAndExif,
  cropImage,
  compressImageCanvas,
  compressToTargetSize,
  resolveMimeType,
  getBestSupportedFormat,
} from '@/utils/imageCompress'
import { compressWithSquoosh, getSquooshFormatFromMime } from '@/utils/squoosh'
import { estimateSSIM, getImageDataFromUrl } from '@/utils/ssim'

let idCounter = 0
const generateId = () => `img_${Date.now()}_${++idCounter}`

function cloneParams(p: ProcessParams): ProcessParams {
  return JSON.parse(JSON.stringify(p))
}

interface StoreActions {
  addImages: (files: FileList | File[]) => Promise<void>
  removeImage: (id: string) => void
  selectImage: (id: string | null) => void
  updateParams: (id: string, params: PartialProcessParams) => void
  updateGlobalParams: (params: PartialProcessParams) => void
  setApplyToAll: (apply: boolean) => void
  processImage: (id: string) => Promise<void>
  processAll: () => Promise<void>
  retryImage: (id: string) => Promise<void>
  setCompareZoom: (zoom: 1 | 2) => void
  setComparePosition: (pos: number) => void
  downloadImage: (id: string) => void
  downloadAllZip: () => Promise<void>
  clearAll: () => void
  updateCropArea: (id: string, crop: { x: number; y: number }, zoom: number) => void
}

type FullState = AppState & StoreActions

export const useAppStore = create<FullState>((set, get) => ({
  images: [],
  selectedId: null,
  globalParams: cloneParams(defaultParams),
  applyToAll: false,
  compareZoom: 1,
  comparePosition: 50,

  addImages: async (fileList) => {
    const files = Array.from(fileList)
    const { images } = get()
    const remainingSlots = 20 - images.length
    const validFiles = files.slice(0, remainingSlots)

    for (const file of validFiles) {
      if (file.size > 25 * 1024 * 1024) continue
      if (!file.type.startsWith('image/')) continue

      try {
        const meta = await readImageMeta(file)
        const id = generateId()
        const originalUrl = URL.createObjectURL(file)
        const { globalParams } = get()

        const params = cloneParams(globalParams)
        params.crop.cropArea = {
          x: meta.width * 0.1,
          y: meta.height * 0.1,
          width: meta.width * 0.8,
          height: meta.height * 0.8,
        }

        const item: ImageItem = {
          id,
          file,
          name: file.name,
          originalUrl,
          processedUrl: null,
          processedBlob: null,
          originalMeta: meta,
          processedMeta: null,
          status: 'pending',
          params,
          progress: 0,
        }

        set((state) => ({
          images: [...state.images, item],
          selectedId: state.selectedId ?? id,
        }))
      } catch {
        // Skip invalid images silently
      }
    }
  },

  removeImage: (id) => {
    const { images } = get()
    const item = images.find((i) => i.id === id)
    if (item) {
      URL.revokeObjectURL(item.originalUrl)
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl)
    }
    set((state) => ({
      images: state.images.filter((i) => i.id !== id),
      selectedId:
        state.selectedId === id
          ? state.images.find((i) => i.id !== id)?.id ?? null
          : state.selectedId,
    }))
  },

  selectImage: (id) => set({ selectedId: id }),

  updateParams: (id, partialParams) => {
    set((state) => {
      const targetImage = state.images.find((img) => img.id === id)
      const baseParams = targetImage
        ? cloneParams(targetImage.params)
        : cloneParams(state.globalParams)

      if (partialParams.compression) {
        baseParams.compression = { ...baseParams.compression, ...partialParams.compression }
      }
      if (partialParams.crop) {
        baseParams.crop = { ...baseParams.crop, ...partialParams.crop }
      }
      if (partialParams.edit) {
        baseParams.edit = { ...baseParams.edit, ...partialParams.edit }
      }

      if (state.applyToAll) {
        return {
          globalParams: baseParams,
          images: state.images.map((img) => {
            const merged = cloneParams(baseParams)
            return {
              ...img,
              params: merged,
              status: 'pending',
              processedUrl: null,
              processedMeta: null,
              processedBlob: null,
              progress: 0,
            }
          }),
        }
      }

      return {
        images: state.images.map((img) =>
          img.id === id
            ? {
                ...img,
                params: baseParams,
                status: 'pending',
                processedUrl: null,
                processedMeta: null,
                processedBlob: null,
                progress: 0,
              }
            : img,
        ),
      }
    })
  },

  updateGlobalParams: (partialParams) => {
    set((state) => {
      const newParams = cloneParams(state.globalParams)
      if (partialParams.compression) {
        newParams.compression = { ...newParams.compression, ...partialParams.compression }
      }
      if (partialParams.crop) {
        newParams.crop = { ...newParams.crop, ...partialParams.crop }
      }
      if (partialParams.edit) {
        newParams.edit = { ...newParams.edit, ...partialParams.edit }
      }
      return { globalParams: newParams }
    })
  },

  setApplyToAll: (apply) => set({ applyToAll: apply }),

  updateCropArea: (id, crop, zoom) => {
    set((state) => ({
      images: state.images.map((img) => {
        if (img.id !== id) return img
        const newParams = cloneParams(img.params)
        newParams.crop.zoom = zoom
        const { width: imgW, height: imgH } = img.originalMeta

        const aspectRatio = newParams.crop.aspect === 'free' ? null : getAspectValue(newParams.crop.aspect)
        let cropW: number
        let cropH: number
        if (aspectRatio) {
          if (aspectRatio > imgW / imgH) {
            cropW = imgW / zoom
            cropH = cropW / aspectRatio
          } else {
            cropH = imgH / zoom
            cropW = cropH * aspectRatio
          }
        } else {
          cropW = (imgW * 0.8) / zoom
          cropH = (imgH * 0.8) / zoom
        }

        const centerX = imgW / 2 - crop.x * (imgW / (zoom * 100))
        const centerY = imgH / 2 - crop.y * (imgH / (zoom * 100))

        newParams.crop.cropArea = {
          x: Math.max(0, Math.min(imgW - cropW, centerX - cropW / 2)),
          y: Math.max(0, Math.min(imgH - cropH, centerY - cropH / 2)),
          width: cropW,
          height: cropH,
        }
        return { ...img, params: newParams, status: 'pending', processedUrl: null }
      }),
    }))
  },

  processImage: async (id) => {
    const state = get()
    const item = state.images.find((i) => i.id === id)
    if (!item) return

    set((s) => ({
      images: s.images.map((i) =>
        i.id === id ? { ...i, status: 'processing', progress: 10, error: undefined } : i,
      ),
    }))

    try {
      const { params, originalUrl, originalMeta, file } = item

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 20 } : i)),
      }))

      let workingCanvas: HTMLCanvasElement | null = null
      let workingUrl = originalUrl
      let workingBlob: Blob = file

      const needsEdit =
        params.edit.rotation !== 0 ||
        params.edit.flipH ||
        params.edit.flipV ||
        params.edit.grayscale ||
        originalMeta.exifOrientation !== 1

      if (needsEdit) {
        const result = await applyEditAndExif(file, originalMeta.exifOrientation, params.edit)
        workingCanvas = result.canvas
        workingUrl = result.url
        workingBlob = result.blob
      }

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 40 } : i)),
      }))

      if (params.crop.enabled) {
        const cropped = await cropImage(workingUrl, params.crop.cropArea, {
          rotation: params.crop.rotation,
          flipH: params.edit.flipH && !needsEdit,
          flipV: params.edit.flipV && !needsEdit,
          outputWidth: params.crop.outputWidth ?? undefined,
          outputHeight: params.crop.outputHeight ?? undefined,
        })
        workingBlob = cropped.blob
        workingUrl = cropped.url
        workingCanvas = cropped.canvas
      }

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 60 } : i)),
      }))

      const effectiveFormat = getBestSupportedFormat(
        params.compression.outputFormat,
        originalMeta.mimeType,
      )
      const mimeType = resolveMimeType(effectiveFormat, originalMeta.mimeType)

      let finalBlob: Blob
      let finalUrl: string
      let qualityUsed: number

      const useSquoosh = params.compression.encoder === 'squoosh'
      const squooshFormat = getSquooshFormatFromMime(mimeType)
      let squooshFailed = false

      if (useSquoosh && squooshFormat) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Squoosh timeout')), 30000),
          )
          const result = await Promise.race([
            compressWithSquoosh(
              workingCanvas ?? workingBlob,
              {
                format: squooshFormat,
                quality: params.compression.quality,
                targetSizeKB: params.compression.targetSizeKB ?? null,
              },
              (p) => {
                set((s) => ({
                  images: s.images.map((i) =>
                    i.id === id ? { ...i, progress: Math.min(92, 60 + p * 0.32) } : i,
                  ),
                }))
              },
            ),
            timeoutPromise,
          ])
          finalBlob = result.blob
          finalUrl = result.url
          qualityUsed = result.qualityUsed
        } catch (err) {
          console.warn('Squoosh encoding failed, falling back to Canvas:', err)
          squooshFailed = true
        }
      }

      if (!useSquoosh || squooshFailed || !squooshFormat) {
        if (params.compression.targetSizeKB && params.compression.targetSizeKB > 0) {
          const result = await compressToTargetSize(
            workingCanvas ?? workingBlob,
            mimeType,
            params.compression.targetSizeKB,
            (p) => {
              set((s) => ({
                images: s.images.map((i) =>
                  i.id === id ? { ...i, progress: Math.min(90, 60 + p * 0.3) } : i,
                ),
              }))
            },
          )
          finalBlob = result.blob
          finalUrl = result.url
          qualityUsed = result.qualityUsed
        } else {
          const result = await compressImageCanvas(
            workingCanvas ?? workingBlob,
            mimeType,
            params.compression.quality,
          )
          finalBlob = result.blob
          finalUrl = result.url
          qualityUsed = params.compression.quality
          set((s) => ({
            images: s.images.map((i) => (i.id === id ? { ...i, progress: 85 } : i)),
          }))
        }
      }

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 92 } : i)),
      }))

      let ssim: number | undefined
      try {
        const [origImgData, procImgData] = await Promise.all([
          getImageDataFromUrl(originalUrl),
          getImageDataFromUrl(finalUrl),
        ])
        const minW = Math.min(origImgData.width, procImgData.width)
        const minH = Math.min(origImgData.height, procImgData.height)
        ssim = estimateSSIM(origImgData.data, procImgData.data, minW, minH)
      } catch {
        // SSIM is optional
      }

      const procImg = new Image()
      await new Promise<void>((resolve) => {
        procImg.onload = () => resolve()
        procImg.onerror = () => resolve()
        procImg.src = finalUrl
      })

      const processedMeta = {
        width: procImg.naturalWidth,
        height: procImg.naturalHeight,
        size: finalBlob.size,
        mimeType: finalBlob.type,
        ssim,
        qualityUsed,
      }

      if (workingUrl !== originalUrl && !params.crop.enabled) {
        URL.revokeObjectURL(workingUrl)
      }

      set((s) => ({
        images: s.images.map((i) =>
          i.id === id
            ? {
                ...i,
                processedUrl: finalUrl,
                processedBlob: finalBlob,
                processedMeta,
                status: 'done',
                progress: 100,
              }
            : i,
        ),
      }))
    } catch (err) {
      console.error('Processing error:', err)
      set((s) => ({
        images: s.images.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'error',
                error: err instanceof Error ? err.message : 'Processing failed',
                progress: 0,
              }
            : i,
        ),
      }))
    }
  },

  processAll: async () => {
    const { images } = get()
    for (const img of images) {
      if (img.status !== 'done') {
        await get().processImage(img.id)
      }
    }
  },

  retryImage: async (id) => {
    await get().processImage(id)
  },

  setCompareZoom: (zoom) => set({ compareZoom: zoom }),
  setComparePosition: (pos) => set({ comparePosition: pos }),

  downloadImage: (id) => {
    const { images } = get()
    const item = images.find((i) => i.id === id)
    if (!item || !item.processedBlob || !item.processedUrl) return

    const a = document.createElement('a')
    a.href = item.processedUrl
    const baseName = item.name.replace(/\.[^.]+$/, '')
    const mime = item.processedMeta?.mimeType || 'image/jpeg'
    const ext =
      mime === 'image/jpeg'
        ? 'jpg'
        : mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
        ? 'webp'
        : mime === 'image/avif'
        ? 'avif'
        : 'img'
    a.download = `${baseName}_processed.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  },

  downloadAllZip: async () => {
    const { images } = get()
    const doneImages = images.filter((i) => i.status === 'done' && i.processedBlob)
    if (doneImages.length === 0) return

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    for (const img of doneImages) {
      if (!img.processedBlob) continue
      const baseName = img.name.replace(/\.[^.]+$/, '')
      const mime = img.processedMeta?.mimeType || 'image/jpeg'
      const ext =
        mime === 'image/jpeg'
          ? 'jpg'
          : mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
          ? 'webp'
          : mime === 'image/avif'
          ? 'avif'
          : 'img'
      zip.file(`${baseName}_processed.${ext}`, img.processedBlob)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'processed_images.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  clearAll: () => {
    const { images } = get()
    for (const img of images) {
      URL.revokeObjectURL(img.originalUrl)
      if (img.processedUrl) URL.revokeObjectURL(img.processedUrl)
    }
    set({ images: [], selectedId: null })
  },
}))

function getAspectValue(aspect: string): number | null {
  switch (aspect) {
    case '1:1':
      return 1
    case '4:3':
      return 4 / 3
    case '16:9':
      return 16 / 9
    case 'id-photo':
      return 295 / 413
    default:
      return null
  }
}
