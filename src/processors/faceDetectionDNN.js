let net = null
let loadingPromise = null

let frameCounter = 0
let cachedBoxes = []

function writeVirtualFile(cv, path, uint8Data) {
  try {
    cv.FS_unlink(path)
  } catch (e) {
    // no existing file — fine
  }
  cv.FS_createDataFile('/', path, uint8Data, true, false, false)
}

async function loadNet(cv) {
  const [protoRes, modelRes] = await Promise.all([
    fetch('/models/deploy.prototxt'),
    fetch('/models/res10_300x300_ssd_iter_140000_fp16.caffemodel'),
  ])
  if (!protoRes.ok || !modelRes.ok) {
    throw new Error('model fetch failed: proto=' + protoRes.status + ' model=' + modelRes.status)
  }
  const protoBuffer = await protoRes.arrayBuffer()
  const modelBuffer = await modelRes.arrayBuffer()

  const protoPath = 'deploy.prototxt'
  const modelPath = 'res10_300x300_ssd_iter_140000_fp16.caffemodel'

  writeVirtualFile(cv, protoPath, new Uint8Array(protoBuffer))
  writeVirtualFile(cv, modelPath, new Uint8Array(modelBuffer))

  net = cv.readNetFromCaffe(protoPath, modelPath)
  console.log('[faceDetectionDNN] model loaded successfully')
}

export const faceDetectionDNN = {
  key: 'faceDnn',
  label: 'Face Detection (DNN)',
  category: 'ml',
  needsThresholds: true,
  info: 'A pretrained SSD (Single Shot Detector) neural network — trained once, elsewhere, on a huge labeled face dataset. Inference is throttled to every few frames since DNN forward-passes are far heavier on memory than any classical CV op here.',
  run(cv, { src, gray, lowThresh }) {
    if (!net) {
      if (!loadingPromise) {
        loadingPromise = loadNet(cv).catch((err) => {
          let readable = err
          try {
            if (typeof err === 'number' && cv.exceptionFromPtr) {
              readable = cv.exceptionFromPtr(err).msg
            }
          } catch (decodeErr) {
            readable = `(undecodable pointer ${err}, decode failed: ${decodeErr})`
          }
          console.error('[faceDetectionDNN] model load failed:', readable)
          loadingPromise = null
        })
      }
      const base = new cv.Mat()
      cv.cvtColor(gray, base, cv.COLOR_GRAY2RGB)
      return base
    }

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    frameCounter++
    const inferenceInterval = 8
    const confThreshold = lowThresh / 255

    if (frameCounter % inferenceInterval === 0) {
      const blob = cv.blobFromImage(
        rgb, 1.0, new cv.Size(300, 300),
        new cv.Scalar(104, 177, 123, 0), true, false
      )
      net.setInput(blob)
      const output = net.forward()

      const data = output.data32F
      const numDetections = data.length / 7
      const newBoxes = []

      for (let i = 0; i < numDetections; i++) {
        const base7 = i * 7
        const confidence = data[base7 + 2]
        if (confidence < confThreshold) continue
        newBoxes.push({
          x1: data[base7 + 3],
          y1: data[base7 + 4],
          x2: data[base7 + 5],
          y2: data[base7 + 6],
        })
      }
      cachedBoxes = newBoxes

      blob.delete()
      output.delete()
    }

    for (const box of cachedBoxes) {
      const x1 = box.x1 * rgb.cols
      const y1 = box.y1 * rgb.rows
      const x2 = box.x2 * rgb.cols
      const y2 = box.y2 * rgb.rows
      cv.rectangle(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(255, 170, 60, 255), 2)
    }

    return rgb
  },
  reset() {
    frameCounter = 0
    cachedBoxes = []
  },
}
