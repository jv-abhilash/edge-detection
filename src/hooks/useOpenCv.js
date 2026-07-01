import { useEffect, useState } from 'react'
import cv from '@techstark/opencv-js'

// opencv.js is a huge WASM module — it downloads/compiles/instantiates
// asynchronously. cv.onRuntimeInitialized fires once it's actually
// safe to call any cv.* function. Calling too early silently fails
// or throws, so every screen that touches OpenCV waits on this hook.
export function useOpenCv() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (cv && typeof cv.getBuildInformation === 'function') {
      // already initialized (e.g. fast refresh during dev)
      setReady(true)
      return
    }
    cv.onRuntimeInitialized = () => setReady(true)
  }, [])

  return ready
}
