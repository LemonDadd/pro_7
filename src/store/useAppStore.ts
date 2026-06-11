import { create } from 'zustand'
import type { AppState, ImageItem, ProcessParams, PartialProcessParams } from '@/types'
import { DEFAULT_PARAMS as defaultParams } from '@/types'
import { readImageMeta } from '@/utils/exif'
import { applyEditTransforms, compressImage, blobToDataUrl } from '@/utils/imageCompress'
import { applyCropFromParams } from '@/utils/imageCrop'
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
          params: cloneParams(globalParams),
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
      selectedId: state.selectedId === id ? state.images.find((i) => i.id !== id)?.id ?? null : state.selectedId,
    }))
  },

  selectImage: (id) => set({ selectedId: id }),

  updateParams: (id, partialParams) => {
    set((state) => {
      const targetImage = state.images.find((img) => img.id === id)
      const baseParams = targetImage ? { ...targetImage.params } : { ...state.globalParams }
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
          images: state.images.map((img) => ({
            ...img,
            params: cloneParams(baseParams),
            status: 'pending',
            processedUrl: null,
            processedMeta: null,
            processedBlob: null,
            progress: 0,
          })),
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
      const { params, originalUrl, originalMeta } = item

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 25 } : i)),
      }))

      let workingUrl = originalUrl
      let workingBlob: Blob = item.file

      const needsEdit =
        params.edit.rotation !== 0 ||
        params.edit.flipH ||
        params.edit.flipV ||
        params.edit.grayscale ||
        originalMeta.exifOrientation !== 1

      if (needsEdit) {
        workingUrl = await applyEditTransforms(originalUrl, originalMeta.exifOrientation, params.edit)
      }

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 45 } : i)),
      }))

      if (params.crop.enabled) {
        const croppedBlob = await applyCropFromParams(
          workingUrl,
          params.crop,
          params.edit.flipH,
          params.edit.flipV,
        )
        workingBlob = croppedBlob
        workingUrl = URL.createObjectURL(croppedBlob)
      }

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 65 } : i)),
      }))

      const { blob, qualityUsed } = await compressImage(
        workingBlob,
        params.compression,
        originalMeta.mimeType,
        (p) => {
          set((s) => ({
            images: s.images.map((i) =>
              i.id === id ? { ...i, progress: Math.min(90, 65 + Math.round(p * 0.25)) } : i,
            ),
          }))
        },
      )

      const processedUrl = URL.createObjectURL(blob)

      set((s) => ({
        images: s.images.map((i) => (i.id === id ? { ...i, progress: 92 } : i)),
      }))

      let ssim: number | undefined
      try {
        const [origImgData, procImgData] = await Promise.all([
          getImageDataFromUrl(originalUrl),
          getImageDataFromUrl(processedUrl),
        ])
        const minW = Math.min(origImgData.width, procImgData.width)
        const minH = Math.min(origImgData.height, procImgData.height)
        ssim = estimateSSIM(origImgData.data, procImgData.data, minW, minH)
      } catch {
        // SSIM is optional
      }

      const processedMeta = {
        width: 0,
        height: 0,
        size: blob.size,
        mimeType: blob.type,
        ssim,
        qualityUsed,
      }

      const procImg = new Image()
      await new Promise<void>((resolve) => {
        procImg.onload = () => resolve()
        procImg.onerror = () => resolve()
        procImg.src = processedUrl
      })
      processedMeta.width = procImg.naturalWidth
      processedMeta.height = procImg.naturalHeight

      set((s) => ({
        images: s.images.map((i) =>
          i.id === id
            ? {
                ...i,
                processedUrl,
                processedBlob: blob,
                processedMeta,
                status: 'done',
                progress: 100,
              }
            : i,
        ),
      }))
    } catch (err) {
      set((s) => ({
        images: s.images.map((i) =>
          i.id === id
            ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Processing failed', progress: 0 }
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
    const ext = item.processedMeta?.mimeType === 'image/jpeg'
      ? 'jpg'
      : item.processedMeta?.mimeType === 'image/png'
      ? 'png'
      : item.processedMeta?.mimeType === 'image/webp'
      ? 'webp'
      : item.processedMeta?.mimeType === 'image/avif'
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
      const ext = img.processedMeta?.mimeType === 'image/jpeg'
        ? 'jpg'
        : img.processedMeta?.mimeType === 'image/png'
        ? 'png'
        : img.processedMeta?.mimeType === 'image/webp'
        ? 'webp'
        : img.processedMeta?.mimeType === 'image/avif'
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
