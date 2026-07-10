let faceDetector = null

async function init() {
  postMessage({ type: 'log', message: 'worker: starting init...' })
  const { FilesetResolver, FaceDetector } = await import('./mediapipe/vision_bundle.mjs')
  postMessage({ type: 'log', message: 'worker: package imported' })

  const vision = await FilesetResolver.forVisionTasks('/mediapipe')
  postMessage({ type: 'log', message: 'worker: fileset resolved, creating detector...' })

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/blaze_face_short_range.tflite',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
  })
  postMessage({ type: 'log', message: 'worker: detector ready' })
  postMessage({ type: 'ready' })
}

function detect(width, height, buffer) {
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const t0 = performance.now()
  const result = faceDetector.detect(imgData)
  const inferenceMs = performance.now() - t0
  const boxes = result.detections.map((d) => d.boundingBox)
  postMessage({ type: 'result', boxes, inferenceMs })
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    })
  } else if (msg.type === 'detect') {
    if (!faceDetector) return
    try {
      detect(msg.width, msg.height, msg.buffer)
    } catch (err) {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    }
  }
}
