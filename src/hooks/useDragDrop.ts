import { useEffect, useState } from 'react'

export function useDragDrop(
  onDrop: (files: FileList) => void,
  targetRef?: React.RefObject<HTMLElement>,
) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  useEffect(() => {
    const target = targetRef?.current ?? window

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      setDragCounter((c) => c + 1)
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      setDragCounter((c) => {
        const next = c - 1
        if (next <= 0) {
          setIsDragging(false)
          return 0
        }
        return next
      })
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      setDragCounter(0)
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onDrop(e.dataTransfer.files)
      }
    }

    const el = target as EventTarget
    el.addEventListener('dragenter', handleDragEnter as EventListener)
    el.addEventListener('dragleave', handleDragLeave as EventListener)
    el.addEventListener('dragover', handleDragOver as EventListener)
    el.addEventListener('drop', handleDrop as EventListener)

    return () => {
      el.removeEventListener('dragenter', handleDragEnter as EventListener)
      el.removeEventListener('dragleave', handleDragLeave as EventListener)
      el.removeEventListener('dragover', handleDragOver as EventListener)
      el.removeEventListener('drop', handleDrop as EventListener)
    }
  }, [onDrop, targetRef])

  return { isDragging }
}
