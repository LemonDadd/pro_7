export function estimateSSIM(
  originalData: Uint8ClampedArray,
  processedData: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  const size = width * height
  let sumOrig = 0
  let sumProc = 0
  let sumOrigSq = 0
  let sumProcSq = 0
  let sumCross = 0

  for (let i = 0; i < size; i++) {
    const idx = i * 4
    const oR = originalData[idx]
    const oG = originalData[idx + 1]
    const oB = originalData[idx + 2]
    const oGray = 0.299 * oR + 0.587 * oG + 0.114 * oB

    const pR = processedData[idx]
    const pG = processedData[idx + 1]
    const pB = processedData[idx + 2]
    const pGray = 0.299 * pR + 0.587 * pG + 0.114 * pB

    sumOrig += oGray
    sumProc += pGray
    sumOrigSq += oGray * oGray
    sumProcSq += pGray * pGray
    sumCross += oGray * pGray
  }

  const n = size
  const meanOrig = sumOrig / n
  const meanProc = sumProc / n

  const varOrig = (sumOrigSq / n) - meanOrig * meanOrig
  const varProc = (sumProcSq / n) - meanProc * meanProc
  const covar = (sumCross / n) - meanOrig * meanProc

  const C1 = (0.01 * 255) ** 2
  const C2 = (0.03 * 255) ** 2

  const ssim =
    ((2 * meanOrig * meanProc + C1) * (2 * covar + C2)) /
    ((meanOrig * meanOrig + meanProc * meanProc + C1) * (varOrig + varProc + C2))

  return Math.max(0, Math.min(1, ssim))
}

export function getImageDataFromUrl(url: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 200
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve({ data: imgData.data, width: canvas.width, height: canvas.height })
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
