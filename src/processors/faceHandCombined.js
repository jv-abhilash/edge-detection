let worker = null
let workerReady = false
let workerBusy = false
let cachedFaces = []
let cachedHands = []
let lastInfoText = ''
let frameCounter = 0

const HAND_COLORS = [
  [80, 220, 120],
  [90, 170, 255],
]

function getWorker() {
  if (worker) return worker

  worker = new Worker('/faceHandCombinedWorker.js')
  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'log') {
      console.log('[faceHandCombined]', msg.message)
    } else if (msg.type === 'ready') {
      workerReady = true
      console.log('[faceHandCombined] worker ready')
    } else if (msg.type === 'result') {
      cachedFaces = msg.faces
      cachedHands = msg.hands
      workerBusy = false

      const handSummary = msg.hands
        .map((h) => `${h.handedness}: ${h.gesture}`)
        .join('  |  ')
      lastInfoText = `${msg.faces.length} face${msg.faces.length === 1 ? '' : 's'}` +
        (handSummary ? `   \u00b7   ${handSummary}` : '')

      console.log(`[faceHandCombined] face=${msg.faceMs.toFixed(1)}ms hand=${msg.handMs.toFixed(1)}ms total=${msg.totalMs.toFixed(1)}ms \u2014 ${lastInfoText}`)
    } else if (msg.type === 'error') {
      console.error('[faceHandCombined] worker error:', msg.error)
      workerBusy = false
    }
  }
  worker.onerror = (err) => {
    console.error('[faceHandCombined] worker crashed:', err.message)
    workerBusy = false
  }
  worker.postMessage({ type: 'init' })
  return worker
}

export const faceHandCombined = {
  key: 'faceHand',
  label: 'Face + Hand',
  category: 'ml',
  needsThresholds: false,
  hasInfoPanel: true,
  info: 'Runs FaceDetector and GestureRecognizer together on every frame \u2014 multiple faces and up to two hands at once, in a single combined worker. Details shown in the panel below the camera, not drawn on the video itself.',
  run(cv, { src }) {
    getWorker()

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    frameCounter++
    const inferenceInterval = 4

    if (workerReady && !workerBusy && frameCounter % inferenceInterval === 0) {
      workerBusy = true
      const copy = new Uint8ClampedArray(src.data)
      worker.postMessage(
        { type: 'detect', width: src.cols, height: src.rows, buffer: copy.buffer },
        [copy.buffer]
      )
    }

    const boxColor = new cv.Scalar(255, 170, 60, 255)
    for (const box of cachedFaces) {
      const x1 = box.originX
      const y1 = box.originY
      const x2 = box.originX + box.width
      const y2 = box.originY + box.height
      cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), boxColor, 2)
    }

    cachedHands.forEach((hand, idx) => {
      const [r, g, b] = HAND_COLORS[idx % HAND_COLORS.length]
      const dotColor = new cv.Scalar(r, g, b, 255)
      for (const p of hand.points) {
        const x = p.x * rgb.cols
        const y = p.y * rgb.rows
        cv.circle(rgb, new cv.Point(x, y), 3, dotColor, -1)
      }
    })

    return rgb
  },
  getInfoText() {
    return lastInfoText
  },
  reset() {
    cachedFaces = []
    cachedHands = []
    lastInfoText = ''
    frameCounter = 0
  },
}
