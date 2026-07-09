let worker = null
let workerReady = false
let workerBusy = false
let cachedBoxes = []
let frameCounter = 0

function getWorker() {
  if (worker) return worker

  worker = new Worker('/faceDetectionLiteWorker.js')
  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'ready') {
      workerReady = true
      console.log('[faceDetectionLite] worker ready')
    } else if (msg.type === 'debug') {
      console.log('[faceDetectionLite] debug:', msg.message)
    } else if (msg.type === 'result') {
      cachedBoxes = msg.boxes
      workerBusy = false
      console.log(`[faceDetectionLite] inference took ${msg.inferenceMs.toFixed(1)}ms, ${msg.boxes.length} box(es)`)
    } else if (msg.type === 'error') {
      console.error('[faceDetectionLite] worker error:', msg.error)
      workerBusy = false
    }
  }
  worker.onerror = (err) => {
    console.error('[faceDetectionLite] worker crashed:', err.message)
    workerBusy = false
  }
  worker.postMessage({ type: 'init' })
  return worker
}

export const faceDetectionLite = {
  key: 'faceLite',
  label: 'Face Detection (Lite)',
  category: 'ml',
  needsThresholds: true,
  info: 'A ~1MB purpose-built mobile face detector, dramatically lighter than the ResNet10 model — trades some accuracy for a much shorter inference time, shrinking the staleness window between when a face moves and when the box catches up.',
  run(cv, { src, gray, lowThresh }) {
    getWorker()

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    frameCounter++
    const inferenceInterval = 5
    const confThreshold = Math.max(0.75, lowThresh / 255)

    if (workerReady && !workerBusy && frameCounter % inferenceInterval === 0) {
      workerBusy = true
      const copy = new Uint8ClampedArray(src.data)
      worker.postMessage(
        { type: 'detect', width: src.cols, height: src.rows, buffer: copy.buffer, confThreshold },
        [copy.buffer]
      )
    }

    for (const box of cachedBoxes) {
      const x1 = box.x1 * rgb.cols
      const y1 = box.y1 * rgb.rows
      const x2 = box.x2 * rgb.cols
      const y2 = box.y2 * rgb.rows
      cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(80, 220, 120, 255), 2)
    }

    return rgb
  },
  reset() {
    frameCounter = 0
    cachedBoxes = []
  },
}
