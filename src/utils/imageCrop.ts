import type { CropParams } from '@/types'

export interface Point {
  x: number
  y: number
}

export interface Area {
  x: number
  y: number
  width: number
  height: number
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (error) => reject(error))
    img.src = url
  })
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  outputWidth?: number,
  outputHeight?: number,
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const rotRad = (rotation * Math.PI) / 180

  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height)
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height)

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('No 2d context')
  }

  const finalWidth = outputWidth ?? Math.floor(pixelCrop.width)
  const finalHeight = outputHeight ?? Math.floor(pixelCrop.height)

  croppedCanvas.width = finalWidth
  croppedCanvas.height = finalHeight

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

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas is empty'))
      },
      'image/png',
      1,
    )
  })
}

export function getPixelCrop(
  crop: { x: number; y: number },
  zoom: number,
  imgWidth: number,
  imgHeight: number,
  aspect: number,
): Area {
  const scaleX = imgWidth / (zoom * 100)
  const scaleY = imgHeight / (zoom * 100)
  const centerX = imgWidth / 2 - crop.x * scaleX
  const centerY = imgHeight / 2 - crop.y * scaleY

  let cropWidth: number
  let cropHeight: number

  if (aspect > imgWidth / imgHeight) {
    cropWidth = imgWidth / zoom
    cropHeight = cropWidth / aspect
  } else {
    cropHeight = imgHeight / zoom
    cropWidth = cropHeight * aspect
  }

  return {
    x: Math.max(0, Math.min(imgWidth - cropWidth, centerX - cropWidth / 2)),
    y: Math.max(0, Math.min(imgHeight - cropHeight, centerY - cropHeight / 2)),
    width: cropWidth,
    height: cropHeight,
  }
}

export function applyCropFromParams(
  sourceUrl: string,
  cropParams: CropParams,
  editFlipH: boolean,
  editFlipV: boolean,
): Promise<Blob> {
  const pixelCrop = cropParams.cropArea
  return getCroppedImg(
    sourceUrl,
    pixelCrop,
    cropParams.rotation,
    { horizontal: editFlipH, vertical: editFlipV },
    cropParams.outputWidth ?? undefined,
    cropParams.outputHeight ?? undefined,
  )
}
