let cvReady = false
let net = null

function writeVirtualFile(cv, path, uint8Data) {
  try {
    cv.FS_unlink(path)
  } catch (e) {
    // no existing file — fine
  }
  cv.FS_createDataFile('/', path, uint8Data, true, false, false)
}

async function init() {
  importScripts('/opencv/opencv.js')

  await new Promise((resolve) => {
    if (self.cv && typeof self.cv.getBuildInformation === 'function') {
      resolve()
      return
    }
    self.cv['onRuntimeInitialized'] = resolve
  })

  const [protoRes, modelRes] = await Promise.all([
    fetch('/models/deploy.prototxt'),
    fetch('/models/res10_300x300_ssd_iter_140000_fp16.caffemodel'),
  ])
  if (!protoRes.ok || !modelRes.ok) {
    throw new Error('model fetch failed: proto=' + protoRes.status + ' model=' + modelRes.status)
  }
  const protoBuffer = await protoRes.arrayBuffer()
  const modelBuffer = await modelRes.arrayBuffer()

  writeVirtualFile(self.cv, 'deploy.prototxt', new Uint8Array(protoBuffer))
  writeVirtualFile(self.cv, 'model.caffemodel', new Uint8Array(modelBuffer))

  net = self.cv.readNetFromCaffe('deploy.prototxt', 'model.caffemodel')
  cvReady = true
  postMessage({ type: 'ready' })
}

function detect(width, height, buffer, confThreshold) {
  const cv = self.cv
  const t0 = performance.now()

  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const src = cv.matFromImageData(imgData)
  const rgb = new cv.Mat()
  cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

  const blob = cv.blobFromImage(
    rgb, 1.0, new cv.Size(300, 300),
    new cv.Scalar(104, 177, 123, 0), true, false
  )
  net.setInput(blob)
  const output = net.forward()

  const data = output.data32F
  const numDetections = data.length / 7
  const boxes = []
  for (let i = 0; i < numDetections; i++) {
    const base7 = i * 7
    const confidence = data[base7 + 2]
    if (confidence < confThreshold) continue
    boxes.push({
      x1: data[base7 + 3],
      y1: data[base7 + 4],
      x2: data[base7 + 5],
      y2: data[base7 + 6],
    })
  }

  src.delete()
  rgb.delete()
  blob.delete()
  output.delete()

  const inferenceMs = performance.now() - t0
  postMessage({ type: 'result', boxes, inferenceMs })
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    })
  } else if (msg.type === 'detect') {
    if (!cvReady) return
    try {
      detect(msg.width, msg.height, msg.buffer, msg.confThreshold)
    } catch (err) {
      postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
    }
  }
}
