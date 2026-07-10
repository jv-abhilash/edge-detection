let gestureRecognizer = null

async function init() {
  postMessage({ type: 'log', message: 'worker: starting init...' })
  const { FilesetResolver, GestureRecognizer } = await import('./mediapipe/vision_bundle.mjs')
  const vision = await FilesetResolver.forVisionTasks('/mediapipe')
  postMessage({ type: 'log', message: 'worker: fileset resolved, loading gesture recognizer...' })

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/gesture_recognizer.task',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    numHands: 2,
  })

  postMessage({ type: 'log', message: 'worker: gesture recognizer ready' })
  postMessage({ type: 'ready' })
}

function recognize(width, height, buffer) {
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const t0 = performance.now()
  const result = gestureRecognizer.recognize(imgData)
  const inferenceMs = performance.now() - t0

  const hands = (result.landmarks || []).map((points, i) => {
    const gestureCat = result.gestures?.[i]?.[0]
    const handednessCat = result.handedness?.[i]?.[0]
    return {
      points: points.map((p) => ({ x: p.x, y: p.y })),
      gesture: gestureCat ? gestureCat.categoryName : 'None',
      gestureScore: gestureCat ? gestureCat.score : 0,
      handedness: handednessCat ? handednessCat.categoryName : '?',
    }
  })

  postMessage({ type: 'result', hands, inferenceMs })
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    })
  } else if (msg.type === 'detect') {
    try {
      recognize(msg.width, msg.height, msg.buffer)
    } catch (err) {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    }
  }
}
