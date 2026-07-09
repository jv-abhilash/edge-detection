let cvReady = false
let net = null
let priors = null

const IMAGE_WIDTH = 320
const IMAGE_HEIGHT = 240
const CENTER_VARIANCE = 0.1
const SIZE_VARIANCE = 0.2

function generatePriors() {
  const shrinkage = [8, 16, 32, 64]
  const featureMapW = [40, 20, 10, 5]
  const featureMapH = [30, 15, 8, 4]
  const minBoxes = [[10, 16, 24], [32, 48], [64, 96], [128, 192, 256]]

  const result = []
  for (let index = 0; index < 4; index++) {
    const scaleW = IMAGE_WIDTH / shrinkage[index]
    const scaleH = IMAGE_HEIGHT / shrinkage[index]
    for (let j = 0; j < featureMapH[index]; j++) {
      for (let i = 0; i < featureMapW[index]; i++) {
        const xCenter = (i + 0.5) / scaleW
        const yCenter = (j + 0.5) / scaleH
        for (const minBox of minBoxes[index]) {
          const w = minBox / IMAGE_WIDTH
          const h = minBox / IMAGE_HEIGHT
          result.push([xCenter, yCenter, w, h])
        }
      }
    }
  }
  return result
}

function decodeBoxes(rawBoxes, priorList) {
  const boxes = new Array(priorList.length)
  for (let i = 0; i < priorList.length; i++) {
    const [pcx, pcy, pw, ph] = priorList[i]
    const dx = rawBoxes[i * 4 + 0]
    const dy = rawBoxes[i * 4 + 1]
    const dw = rawBoxes[i * 4 + 2]
    const dh = rawBoxes[i * 4 + 3]

    const cx = dx * CENTER_VARIANCE * pw + pcx
    const cy = dy * CENTER_VARIANCE * ph + pcy
    const w = Math.exp(dw * SIZE_VARIANCE) * pw
    const h = Math.exp(dh * SIZE_VARIANCE) * ph

    boxes[i] = { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 }
  }
  return boxes
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  const x2 = Math.min(a.x2, b.x2)
  const y2 = Math.min(a.y2, b.y2)
  const w = Math.max(0, x2 - x1)
  const h = Math.max(0, y2 - y1)
  const inter = w * h
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  return inter / (areaA + areaB - inter)
}

function nonMaxSuppression(boxes, iouThreshold) {
  boxes.sort((a, b) => b.score - a.score)
  const suppressed = new Array(boxes.length).fill(false)
  const keep = []
  for (let i = 0; i < boxes.length; i++) {
    if (suppressed[i]) continue
    keep.push(boxes[i])
    for (let j = i + 1; j < boxes.length; j++) {
      if (suppressed[j]) continue
      if (iou(boxes[i], boxes[j]) > iouThreshold) suppressed[j] = true
    }
  }
  return keep
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

  const modelRes = await fetch('/models/version-RFB-320.onnx')
  if (!modelRes.ok) {
    throw new Error('model fetch failed: ' + modelRes.status)
  }
  const modelBuffer = await modelRes.arrayBuffer()

  const modelPath = 'version-RFB-320.onnx'
  try {
    self.cv.FS_unlink(modelPath)
  } catch (e) {
    // no existing file — fine
  }
  self.cv.FS_createDataFile('/', modelPath, new Uint8Array(modelBuffer), true, false, false)

  net = self.cv.readNetFromONNX(modelPath)
  priors = generatePriors()

  const outNames = net.getUnconnectedOutLayersNames()
  const nameList = []
  for (let i = 0; i < outNames.size(); i++) nameList.push(outNames.get(i))
  postMessage({ type: 'debug', message: `output layer names: ${nameList.join(', ')}, priors=${priors.length}` })

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
    rgb, 1.0 / 128.0, new cv.Size(IMAGE_WIDTH, IMAGE_HEIGHT),
    new cv.Scalar(127, 127, 127, 0), true, false
  )
  net.setInput(blob)

  const rawBoxesMat = net.forward('boxes')
  const rawScoresMat = net.forward('scores')

  let resultBoxes = []
  if (rawBoxesMat.total() === priors.length * 4 && rawScoresMat.total() === priors.length * 2) {
    const rawBoxes = rawBoxesMat.data32F
    const rawScores = rawScoresMat.data32F
    const decoded = decodeBoxes(rawBoxes, priors)

    const candidates = []
    let topScoreIdx0 = 0
    let topScoreIdx1 = 0
    for (let i = 0; i < priors.length; i++) {
      const scoreIdx0 = rawScores[i * 2 + 0]
      const scoreIdx1 = rawScores[i * 2 + 1]
      if (scoreIdx0 > topScoreIdx0) topScoreIdx0 = scoreIdx0
      if (scoreIdx1 > topScoreIdx1) topScoreIdx1 = scoreIdx1

      const faceScore = rawScores[i * 2 + 1]
      if (faceScore >= confThreshold) {
        candidates.push({ ...decoded[i], score: faceScore })
      }
    }
    resultBoxes = nonMaxSuppression(candidates, 0.3)
    postMessage({ type: 'debug', message: `idx0(bg?) top=${topScoreIdx0.toFixed(3)}  idx1(face?) top=${topScoreIdx1.toFixed(3)}  threshold=${confThreshold.toFixed(3)} candidates=${candidates.length} afterNMS=${resultBoxes.length}` })
  } else {
    postMessage({ type: 'debug', message: `output size mismatch — boxes total=${rawBoxesMat.total()} (expected ${priors.length*4}), scores total=${rawScoresMat.total()} (expected ${priors.length*2})` })
  }

  src.delete()
  rgb.delete()
  blob.delete()
  rawBoxesMat.delete()
  rawScoresMat.delete()

  const inferenceMs = performance.now() - t0
  postMessage({ type: 'result', boxes: resultBoxes, inferenceMs })
}

function describeError(err) {
  try {
    if (typeof err === 'number' && self.cv && self.cv.exceptionFromPtr) {
      return self.cv.exceptionFromPtr(err).msg
    }
  } catch (decodeErr) {
    return `(undecodable pointer ${err}, decode failed: ${decodeErr})`
  }
  return err && err.message ? err.message : String(err)
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    init().catch((err) => {
      postMessage({ type: 'error', error: describeError(err) })
    })
  } else if (msg.type === 'detect') {
    if (!cvReady) return
    try {
      detect(msg.width, msg.height, msg.buffer, msg.confThreshold)
    } catch (err) {
      postMessage({ type: 'error', error: describeError(err) })
    }
  }
}
