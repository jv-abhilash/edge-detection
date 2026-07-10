let worker = null
let workerReady = false
let workerBusy = false
let cachedHands = []
let frameCounter = 0

const HAND_COLORS = [
  [80, 220, 120],
  [90, 170, 255],
]

function getWorker() {
  if (worker) return worker

  worker = new Worker('/handGestureWorker.js')
  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'log') {
      console.log('[handGesture]', msg.message)
    } else if (msg.type === 'ready') {
      workerReady = true
      console.log('[handGesture] worker ready')
    } else if (msg.type === 'result') {
      cachedHands = msg.hands
      workerBusy = false
      const summary = msg.hands.map((h) => `${h.handedness}:${h.gesture}(${h.gestureScore.toFixed(2)})`).join(', ')
      console.log(`[handGesture] inference took ${msg.inferenceMs.toFixed(1)}ms, ${msg.hands.length} hand(s) ${summary}`)
    } else if (msg.type === 'error') {
      console.error('[handGesture] worker error:', msg.error)
      workerBusy = false
    }
  }
  worker.onerror = (err) => {
    console.error('[handGesture] worker crashed:', err.message)
    workerBusy = false
  }
  worker.postMessage({ type: 'init' })
  return worker
}

export const handGestureRecognizer = {
  key: 'handGesture',
  label: 'Hand Gesture',
  category: 'ml',
  needsThresholds: false,
  info: 'MediaPipe GestureRecognizer \u2014 21-point hand landmarks, left/right handedness, and a classified gesture label from a fixed built-in set, all from one trained model. Supports up to 2 hands at once.',
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

    cachedHands.forEach((hand, idx) => {
      const [r, g, b] = HAND_COLORS[idx % HAND_COLORS.length]
      const dotColor = new cv.Scalar(r, g, b, 255)

      let minX = Infinity, minY = Infinity
      for (const p of hand.points) {
        const x = p.x * rgb.cols
        const y = p.y * rgb.rows
        cv.circle(rgb, new cv.Point(x, y), 3, dotColor, -1)
        if (y < minY) { minY = y; minX = x }
      }

      const label = `${hand.handedness}: ${hand.gesture}`
      const labelWidth = label.length * 10 + 14
      const labelY = Math.max(24, minY - 14)
      cv.rectangle(rgb, new cv.Point(minX - 4, labelY - 22), new cv.Point(minX - 4 + labelWidth, labelY + 4), new cv.Scalar(20, 17, 15, 200), -1)
      cv.putText(rgb, label, new cv.Point(minX, labelY), cv.FONT_HERSHEY_SIMPLEX, 0.55, dotColor, 2)
    })

    return rgb
  },
  reset() {
    cachedHands = []
    frameCounter = 0
  },
}
