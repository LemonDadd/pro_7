import { useCallback, useEffect, useRef, useState } from 'react'

type WorkerMessageHandler = (data: any) => void

interface WorkerOptions {
  onMessage?: WorkerMessageHandler
  onError?: (error: ErrorEvent) => void
}

export function useWorker<T = any>(
  workerFactory: () => Worker,
  options: WorkerOptions = {},
) {
  const workerRef = useRef<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      const worker = workerFactory()
      workerRef.current = worker
      setIsReady(true)

      if (options.onMessage) {
        worker.addEventListener('message', (e) => options.onMessage?.(e.data))
      }
      if (options.onError) {
        worker.addEventListener('error', options.onError)
      }

      return () => {
        worker.terminate()
        workerRef.current = null
        setIsReady(false)
      }
    } catch {
      setIsReady(false)
    }
  }, [workerFactory, options.onMessage, options.onError])

  const postMessage = useCallback((data: T) => {
    if (workerRef.current) {
      workerRef.current.postMessage(data)
    }
  }, [])

  return { isReady, postMessage }
}
