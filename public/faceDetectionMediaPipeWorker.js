let faceDetector = null
let faceLandmarker = null

async function init() {
  postMessage({ type: 'log', message: 'worker: starting init...' })
  const { FilesetResolver, FaceDetector, FaceLandmarker } = await import('./mediapipe/vision_bundle.mjs')
  const vision = await FilesetResolver.forVisionTasks('/mediapipe')
  postMessage({ type: 'log', message: 'worker: fileset resolved, loading detector + landmarker...' })

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/blaze_face_short_range.tflite',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
  })

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/face_landmarker.task',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    numFaces: 1,
  })

  postMessage({ type: 'log', message: 'worker: both models ready' })
  postMessage({ type: 'ready' })
}

function detectBox(width, height, buffer) {
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const t0 = performance.now()
  const result = faceDetector.detect(imgData)
  const inferenceMs = performance.now() - t0
  const boxes = result.detections.map((d) => d.boundingBox)
  postMessage({ type: 'result', mode: 'box', boxes, inferenceMs })
}

function detectMesh(width, height, buffer) {
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const t0 = performance.now()
  const result = faceLandmarker.detect(imgData)
  const inferenceMs = performance.now() - t0
  const landmarks = (result.faceLandmarks && result.faceLandmarks[0])
    ? result.faceLandmarks[0].map((p) => ({ x: p.x, y: p.y }))
    : []
  postMessage({ type: 'result', mode: 'mesh', landmarks, inferenceMs })
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    })
  } else if (msg.type === 'detect') {
    try {
      if (msg.mode === 'mesh') {
        detectMesh(msg.width, msg.height, msg.buffer)
      } else {
        detectBox(msg.width, msg.height, msg.buffer)
      }
    } catch (err) {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    }
  }
}
