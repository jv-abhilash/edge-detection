import { useEffect, useRef, useState } from 'react'
import cv from '@techstark/opencv-js'
import { useOpenCv } from '../hooks/useOpenCv.js'

export default function CameraView({ onBack }) {
  const videoRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())

  const lowThreshRef = useRef(50)
  const highThreshRef = useRef(150)
  const [lowThresh, setLowThresh] = useState(50)
  const [highThresh, setHighThresh] = useState(150)

  const [facingMode, setFacingMode] = useState('environment')

  const orientationRef = useRef(0)
  const [orientationAngle, setOrientationAngle] = useState(0)
  const [rawTilt, setRawTilt] = useState({ beta: null, gamma: null })

  const cvReady = useOpenCv()
  const [status, setStatus] = useState('requesting')
  const [errorMsg, setErrorMsg] = useState('')
  const [fps, setFps] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    function updateOrientation() {
      let angle = screen.orientation?.angle
      if (angle === undefined) {
        angle = window.orientation !== undefined ? (window.orientation + 360) % 360 : 0
      }
      orientationRef.current = angle
      setOrientationAngle(angle)
    }
    updateOrientation()
    window.addEventListener('orientationchange', updateOrientation)
    screen.orientation?.addEventListener?.('change', updateOrientation)
    return () => {
      window.removeEventListener('orientationchange', updateOrientation)
      screen.orientation?.removeEventListener?.('change', updateOrientation)
    }
  }, [])

  useEffect(() => {
    if (!cvReady) return
    let cancelled = false

    async function startCamera() {
      setStatus('requesting')
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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
          }

          ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height)

          const src = cv.imread(captureCanvas)
          const gray = new cv.Mat()
          const blurred = new cv.Mat()
          const edges = new cv.Mat()

          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

          const ksize = new cv.Size(5, 5)
          cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT)

          cv.Canny(blurred, edges, lowThreshRef.current, highThreshRef.current)

          const angle = orientationRef.current
          let display = edges
          let rotatedSeparately = false

          if (angle === 90) {
            display = new cv.Mat()
            cv.rotate(edges, display, cv.ROTATE_90_COUNTERCLOCKWISE)
            rotatedSeparately = true
          } else if (angle === 270) {
            display = new cv.Mat()
            cv.rotate(edges, display, cv.ROTATE_90_CLOCKWISE)
            rotatedSeparately = true
          } else if (angle === 180) {
            display = new cv.Mat()
            cv.rotate(edges, display, cv.ROTATE_180)
            rotatedSeparately = true
          }

          if (outputCanvas.width !== display.cols || outputCanvas.height !== display.rows) {
            outputCanvas.width = display.cols
            outputCanvas.height = display.rows
          }
          cv.imshow(outputCanvas, display)

          src.delete()
          gray.delete()
          blurred.delete()
          edges.delete()
          if (rotatedSeparately) display.delete()

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
  }, [cvReady, facingMode])

  function handleLowChange(e) {
    const v = Number(e.target.value)
    setLowThresh(v)
    lowThreshRef.current = v
  }

  function handleHighChange(e) {
    const v = Number(e.target.value)
    setHighThresh(v)
    highThreshRef.current = v
  }

  function handleFlipCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  function handleCapture() {
    const outputCanvas = outputCanvasRef.current
    if (!outputCanvas) return

    const dataUrl = outputCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.download = `edge-detection-${timestamp}.png`
    link.href = dataUrl
    link.click()

    setFlash(true)
    setTimeout(() => setFlash(false), 150)
  }

  const counterRotateStyle = { '--counter-rotate': `${-orientationAngle}deg` }

  return (
    <div className="camera-view">
      <video ref={videoRef} className="camera-video-hidden" playsInline muted />
      <canvas ref={captureCanvasRef} className="camera-video-hidden" />
      <canvas
        ref={outputCanvasRef}
        className={`camera-canvas${facingMode === 'user' ? ' mirrored' : ''}`}
      />

      {flash && <div className="capture-flash" />}

      <div className="camera-topbar">
        <button className="back-btn icon-rotate" style={counterRotateStyle} onClick={onBack}>
          ← Back
        </button>
        <span className="mode-pill">Edge Detection · Canny</span>
        <span className="fps-pill icon-rotate" style={counterRotateStyle}>
          {!cvReady ? 'loading cv…' : status === 'ready' ? `${fps} fps` : status}
        </span>
      </div>

      {status === 'ready' && (
        <span className="orientation-badge icon-rotate" style={counterRotateStyle}>
          {orientationAngle}° · β{rawTilt.beta ?? '–'} γ{rawTilt.gamma ?? '–'}
        </span>
      )}

      {status === 'ready' && (
        <>
          <div className="threshold-panel">
            <div className="threshold-row">
              <span className="threshold-label">low</span>
              <input type="range" min="0" max="255" value={lowThresh} onChange={handleLowChange} />
              <span className="threshold-value">{lowThresh}</span>
            </div>
            <div className="threshold-row">
              <span className="threshold-label">high</span>
              <input type="range" min="0" max="255" value={highThresh} onChange={handleHighChange} />
              <span className="threshold-value">{highThresh}</span>
            </div>
          </div>

          <div className="shutter-bar">
            <button className="flip-btn icon-rotate" style={counterRotateStyle} onClick={handleFlipCamera} title="Switch camera">
              ⟳
            </button>
            <button className="shutter-btn" onClick={handleCapture} title="Capture">
              <span className="shutter-btn-inner icon-rotate" style={counterRotateStyle} />
            </button>
            <span className="shutter-spacer" />
          </div>
        </>
      )}

      {status === 'error' && (
        <div className="camera-error">
          <p>Camera access failed.</p>
          <p className="camera-error-detail">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}
