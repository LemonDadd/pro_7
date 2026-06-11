import exifr from 'exifr'
import type { ImageMeta } from '@/types'

export async function readImageMeta(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = async () => {
      try {
        let exifOrientation = 1
        let hasExif = false
        let hasGps = false

        try {
          const exifData = await exifr.parse(file, {
            tiff: true,
            xmp: false,
            icc: false,
            iptc: false,
          })
          if (exifData) {
            hasExif = true
            if (exifData.Orientation) {
              exifOrientation = exifData.Orientation
            }
            if (exifData.GPSLatitude || exifData.latitude) {
              hasGps = true
            }
          }
        } catch {
          // EXIF parsing is optional
        }

        const { width, height } = getOrientedDimensions(
          img.naturalWidth,
          img.naturalHeight,
          exifOrientation,
        )

        URL.revokeObjectURL(url)
        resolve({
          width,
          height,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          exifOrientation,
          hasExif,
          hasGps,
        })
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

function getOrientedDimensions(
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width }
  }
  return { width, height }
}

export function applyOrientationToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  orientation: number,
): void {
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
}

export function drawImageWithOrientation(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  orientation: number,
): void {
  const { width, height } = getOrientedDimensions(img.naturalWidth, img.naturalHeight, orientation)
  applyOrientationToCanvas(ctx, img.naturalWidth, img.naturalHeight, orientation)
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // Ensure the canvas itself has correct dimensions
  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    ctx.canvas.width = width
    ctx.canvas.height = height
    // Re-draw after resize
    applyOrientationToCanvas(ctx, img.naturalWidth, img.naturalHeight, orientation)
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
}
