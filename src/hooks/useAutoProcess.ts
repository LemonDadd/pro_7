import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useDebounce } from './useDebounce'

export function useAutoProcess() {
  const selectedId = useAppStore((s) => s.selectedId)
  const images = useAppStore((s) => s.images)
  const processImage = useAppStore((s) => s.processImage)

  const selectedImage = selectedId ? images.find((i) => i.id === selectedId) : null

  const debouncedParams = useDebounce(selectedImage?.params, 300)
  const [lastParamsHash, setLastParamsHash] = useState('')

  useEffect(() => {
    if (!selectedImage || !debouncedParams) return
    if (selectedImage.status === 'processing') return

    const hash = JSON.stringify(debouncedParams)
    if (hash !== lastParamsHash) {
      setLastParamsHash(hash)
      if (lastParamsHash !== '') {
        processImage(selectedImage.id)
      }
    }
  }, [debouncedParams, selectedImage, lastParamsHash, processImage])
}
