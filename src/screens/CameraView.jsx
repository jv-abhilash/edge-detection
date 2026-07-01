import { useEffect, useRef, useState } from 'react'

export default function CameraView({ onBack }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())

  const [status, setStatus] = useState('requesting') // requesting | ready | error
  const [errorMsg, setErrorMsg] = useState('')
  const [fps, setFps] = useState(0)

  useEffect(() => {
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
      const canvas = canvasRef.current
      if (!video || !canvas) return
      const ctx = canvas.getContext('2d')

      const tick = () => {
        if (video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          // Step 1: just draw the raw frame. OpenCV.js processing plugs in
          // right here in a later step, between drawImage and display.
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

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
  }, [])

  return (
    <div className="camera-view">
      <video ref={videoRef} className="camera-video-hidden" playsInline muted />
      <canvas ref={canvasRef} className="camera-canvas" />

      <div className="camera-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="mode-pill">Edge Detection · Step 1 (raw feed)</span>
        <span className="fps-pill">{status === 'ready' ? `${fps} fps` : status}</span>
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
