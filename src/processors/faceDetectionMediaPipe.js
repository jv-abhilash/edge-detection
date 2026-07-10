let worker = null
let workerReady = false
let workerBusy = false
let cachedBoxes = []
let cachedLandmarks = []
let meshMode = false
let frameCounter = 0

function getWorker() {
  if (worker) return worker

  worker = new Worker('/faceDetectionMediaPipeWorker.js')
  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'log') {
      console.log('[faceDetectionMediaPipe]', msg.message)
    } else if (msg.type === 'ready') {
      workerReady = true
      console.log('[faceDetectionMediaPipe] worker ready')
    } else if (msg.type === 'result') {
      if (msg.mode === 'mesh') {
        cachedLandmarks = msg.landmarks
      } else {
        cachedBoxes = msg.boxes
      }
      workerBusy = false
      console.log(`[faceDetectionMediaPipe] (${msg.mode}) inference took ${msg.inferenceMs.toFixed(1)}ms`)
    } else if (msg.type === 'error') {
      console.error('[faceDetectionMediaPipe] worker error:', msg.error)
      workerBusy = false
    }
  }
  worker.onerror = (err) => {
    console.error('[faceDetectionMediaPipe] worker crashed:', err.message)
    workerBusy = false
  }
  worker.postMessage({ type: 'init' })
  return worker
}

export const faceDetectionMediaPipe = {
  key: 'faceMediaPipe',
  label: 'Face Detection (MediaPipe)',
  category: 'ml',
  needsThresholds: false,
  info: 'Google MediaPipe Tasks Vision, running entirely in a dedicated Worker. Toggle between a bounding box (FaceDetector) and a full 478-point face landmark map (FaceLandmarker) \u2014 same runtime, two different trained models.',
  run(cv, { src }) {
    getWorker()

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    frameCounter++
    const inferenceInterval = 3

    if (workerReady && !workerBusy && frameCounter % inferenceInterval === 0) {
      workerBusy = true
      const copy = new Uint8ClampedArray(src.data)
      worker.postMessage(
        { type: 'detect', mode: meshMode ? 'mesh' : 'box', width: src.cols, height: src.rows, buffer: copy.buffer },
        [copy.buffer]
      )
    }

    if (meshMode) {
      const dotColor = new cv.Scalar(80, 220, 120, 255)
      for (const p of cachedLandmarks) {
        const x = p.x * rgb.cols
        const y = p.y * rgb.rows
        cv.circle(rgb, new cv.Point(x, y), 1, dotColor, -1)
      }
    } else {
      const boxColor = new cv.Scalar(255, 170, 60, 255)
      for (const box of cachedBoxes) {
        const x1 = box.originX
        const y1 = box.originY
        const x2 = box.originX + box.width
        const y2 = box.originY + box.height
        cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), boxColor, 2)
      }
    }

    return rgb
  },
  toggleMesh() {
    meshMode = !meshMode
    cachedBoxes = []
    cachedLandmarks = []
    return meshMode
  },
  hasMeshToggle: true,
  reset() {
    cachedBoxes = []
    cachedLandmarks = []
    frameCounter = 0
  },
}
