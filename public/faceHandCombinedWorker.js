let faceDetector = null
let gestureRecognizer = null

async function init() {
  postMessage({ type: 'log', message: 'worker: starting init...' })
  const { FilesetResolver, FaceDetector, GestureRecognizer } = await import('./mediapipe/vision_bundle.mjs')
  const vision = await FilesetResolver.forVisionTasks('/mediapipe')
  postMessage({ type: 'log', message: 'worker: fileset resolved, loading both models...' })

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/blaze_face_short_range.tflite',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
  })

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/gesture_recognizer.task',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    numHands: 2,
  })

  postMessage({ type: 'log', message: 'worker: both models ready' })
  postMessage({ type: 'ready' })
}

function detect(width, height, buffer) {
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)

  const t0 = performance.now()
  const faceResult = faceDetector.detect(imgData)
  const faceMs = performance.now() - t0

  const t1 = performance.now()
  const handResult = gestureRecognizer.recognize(imgData)
  const handMs = performance.now() - t1

  const faces = faceResult.detections.map((d) => d.boundingBox)

  const hands = (handResult.landmarks || []).map((points, i) => {
    const gestureCat = handResult.gestures?.[i]?.[0]
    const handednessCat = handResult.handedness?.[i]?.[0]
    return {
      points: points.map((p) => ({ x: p.x, y: p.y })),
      gesture: gestureCat ? gestureCat.categoryName : 'None',
      gestureScore: gestureCat ? gestureCat.score : 0,
      handedness: handednessCat ? handednessCat.categoryName : '?',
    }
  })

  postMessage({
    type: 'result',
    faces,
    hands,
    faceMs,
    handMs,
    totalMs: faceMs + handMs,
  })
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    })
  } else if (msg.type === 'detect') {
    try {
      detect(msg.width, msg.height, msg.buffer)
    } catch (err) {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    }
  }
}
