import { useEffect, useRef, useState } from 'react'
import cv from '@techstark/opencv-js'
import { useOpenCv } from '../hooks/useOpenCv.js'

export default function CameraView({ onBack }) {
  const videoRef = useRef(null)
  const captureCanvasRef = useRef(null) // hidden: raw frame lands here, feeds cv.imread
  const outputCanvasRef = useRef(null)  // visible: processed result rendered here
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())

  const cvReady = useOpenCv()
  const [status, setStatus] = useState('requesting') // requesting | ready | error
  const [errorMsg, setErrorMsg] = useState('')
  const [fps, setFps] = useState(0)

  useEffect(() => {
    if (!cvReady) return // wait for opencv.js WASM runtime before touching the camera loop
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        setStatus('ready')
        drawLoop()
      } catch (err) {
        setStatus('error')
        setErrorMsg(err.message || 'Camera access failed')
      }
    }

    function drawLoop() {
      const video = videoRef.current
      const captureCanvas = captureCanvasRef.current
      const outputCanvas = outputCanvasRef.current
      if (!video || !captureCanvas || !outputCanvas) return
      const ctx = captureCanvas.getContext('2d', { willReadFrequently: true })

      const tick = () => {
        if (video.videoWidth && video.videoHeight) {
          if (captureCanvas.width !== video.videoWidth || captureCanvas.height !== video.videoHeight) {
            captureCanvas.width = video.videoWidth
            captureCanvas.height = video.videoHeight
            outputCanvas.width = video.videoWidth
            outputCanvas.height = video.videoHeight
          }

          // 1. Raw frame -> hidden canvas (this is the JS-side pixel buffer)
          ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height)

          // 2. Hand that canvas to OpenCV.js: crosses from JS memory into WASM memory as a Mat
          const src = cv.imread(captureCanvas)
          const gray = new cv.Mat()

          // 3. Grayscale conversion (RGBA because canvas pixel data includes an alpha channel)
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

          // 4. Render the processed Mat back out to the visible canvas
          cv.imshow(outputCanvas, gray)

          // 5. Manual WASM memory cleanup — no GC on this side, must delete every Mat
          src.delete()
          gray.delete()

          frameCountRef.current += 1
          const now = performance.now()
          const elapsed = now - lastFpsTimeRef.current
          if (elapsed >= 500) {
            setFps(Math.round((frameCountRef.current * 1000) / elapsed))
            frameCountRef.current = 0
            lastFpsTimeRef.current = now
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    startCamera()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [cvReady])

  return (
    <div className="camera-view">
      <video ref={videoRef} className="camera-video-hidden" playsInline muted />
      <canvas ref={captureCanvasRef} className="camera-video-hidden" />
      <canvas ref={outputCanvasRef} className="camera-canvas" />

      <div className="camera-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="mode-pill">Edge Detection · Step 2 (grayscale)</span>
        <span className="fps-pill">
          {!cvReady ? 'loading cv…' : status === 'ready' ? `${fps} fps` : status}
        </span>
      </div>

      {status === 'error' && (
        <div className="camera-error">
          <p>Camera access failed.</p>
          <p className="camera-error-detail">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}
