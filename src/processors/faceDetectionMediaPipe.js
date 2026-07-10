let worker = null
let workerReady = false
let workerBusy = false
let cachedBoxes = []
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
      cachedBoxes = msg.boxes
      workerBusy = false
      console.log(`[faceDetectionMediaPipe] inference took ${msg.inferenceMs.toFixed(1)}ms, ${msg.boxes.length} face(s)`)
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
  info: 'Google MediaPipe Tasks Vision (BlazeFace model) running entirely in a dedicated Worker, fully isolated from OpenCV.js on the main thread.',
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
        { type: 'detect', width: src.cols, height: src.rows, buffer: copy.buffer },
        [copy.buffer]
      )
    }

    for (const box of cachedBoxes) {
      const x1 = box.originX
      const y1 = box.originY
      const x2 = box.originX + box.width
      const y2 = box.originY + box.height
      cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(255, 170, 60, 255), 2)
    }

    return rgb
  },
  reset() {
    cachedBoxes = []
    frameCounter = 0
  },
}
