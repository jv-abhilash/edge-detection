let worker = null
let workerReady = false
let workerBusy = false
let cachedBoxes = []
let cachedFaces = []
let meshMode = false
let frameCounter = 0

const MESH_COLORS = [
  [80, 220, 120],
  [255, 170, 60],
  [90, 170, 255],
  [220, 100, 200],
]

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
        cachedFaces = msg.faces
      } else {
        cachedBoxes = msg.boxes
      }
      workerBusy = false
      const count = msg.mode === 'mesh' ? msg.faces.length : msg.boxes.length
      console.log(`[faceDetectionMediaPipe] (${msg.mode}) inference took ${msg.inferenceMs.toFixed(1)}ms, ${count} face(s)`)
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
  info: 'Google MediaPipe Tasks Vision, running entirely in a dedicated Worker. Toggle between bounding boxes (FaceDetector) and full 478-point face landmark maps (FaceLandmarker) \u2014 both support multiple faces at once.',
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

    let faceCount = 0

    if (meshMode) {
      faceCount = cachedFaces.length
      cachedFaces.forEach((face, faceIdx) => {
        const [r, g, b] = MESH_COLORS[faceIdx % MESH_COLORS.length]
        const dotColor = new cv.Scalar(r, g, b, 255)
        for (const p of face) {
          const x = p.x * rgb.cols
          const y = p.y * rgb.rows
          cv.circle(rgb, new cv.Point(x, y), 1, dotColor, -1)
        }
      })
    } else {
      faceCount = cachedBoxes.length
      const boxColor = new cv.Scalar(255, 170, 60, 255)
      for (const box of cachedBoxes) {
        const x1 = box.originX
        const y1 = box.originY
        const x2 = box.originX + box.width
        const y2 = box.originY + box.height
        cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), boxColor, 2)
      }
    }

    const label = `${faceCount} face${faceCount === 1 ? '' : 's'}`
    const labelWidth = label.length * 11 + 16
    cv.rectangle(rgb, new cv.Point(8, 8), new cv.Point(8 + labelWidth, 36), new cv.Scalar(20, 17, 15, 200), -1)
    cv.putText(rgb, label, new cv.Point(16, 28), cv.FONT_HERSHEY_SIMPLEX, 0.6, new cv.Scalar(255, 170, 60, 255), 2)

    return rgb
  },
  toggleMesh() {
    meshMode = !meshMode
    cachedBoxes = []
    cachedFaces = []
    return meshMode
  },
  hasMeshToggle: true,
  reset() {
    cachedBoxes = []
    cachedFaces = []
    frameCounter = 0
  },
}
