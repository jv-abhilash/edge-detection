import { useEffect, useState } from 'react'

export function useOpenCv() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.cv && typeof window.cv.getBuildInformation === 'function') {
      setReady(true)
      return
    }

    if (document.getElementById('opencv-script')) {
      if (window.cv) {
        window.cv['onRuntimeInitialized'] = () => setReady(true)
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'opencv-script'
    script.src = '/opencv/opencv.js'
    script.async = true
    script.onload = () => {
      window.cv['onRuntimeInitialized'] = () => setReady(true)
    }
    script.onerror = () => {
      console.error('[useOpenCv] failed to load /opencv/opencv.js')
    }
    document.body.appendChild(script)
  }, [])

  return ready
}
