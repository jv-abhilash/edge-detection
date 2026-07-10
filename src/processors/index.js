import { edgeDetection } from './edgeDetection.js'
import { edgeOnGray } from './edgeOnGray.js'
import { cartoon } from './cartoon.js'
import { contours } from './contours.js'
import { pencilSketch } from './pencilSketch.js'
import { sepia } from './sepia.js'
import { invert } from './invert.js'
import { thresholdEffect } from './threshold.js'
import { emboss } from './emboss.js'
import { pixelate } from './pixelate.js'
import { hsvIsolate } from './hsvIsolate.js'
import { cornerDetection } from './cornerDetection.js'
import { motionDetection } from './motionDetection.js'
import { backgroundSubtraction } from './backgroundSubtraction.js'
import { lightTrail } from './lightTrail.js'
import { documentScanner } from './documentScanner.js'
import { qrScanner } from './qrScanner.js'
import { faceDetectionDNN } from './faceDetectionDNN.js'
import { faceDetectionLite } from './faceDetectionLite.js'
import { faceDetectionMediaPipe } from './faceDetectionMediaPipe.js'

export const processors = {
  edge: edgeDetection,
  edgeGray: edgeOnGray,
  cartoon: cartoon,
  contours: contours,
  pencil: pencilSketch,
  sepia: sepia,
  invert: invert,
  threshold: thresholdEffect,
  emboss: emboss,
  pixelate: pixelate,
  hsvIsolate: hsvIsolate,
  corners: cornerDetection,
  motion: motionDetection,
  bgsub: backgroundSubtraction,
  lightTrail: lightTrail,
  docScanner: documentScanner,
  qrScanner: qrScanner,
  faceDnn: faceDetectionDNN,
  faceLite: faceDetectionLite,
  faceMediaPipe: faceDetectionMediaPipe,
}

export const processorList = Object.values(processors)

export const categories = [
  { key: 'nonml', label: 'Non-ML CV', desc: 'classical algorithms' },
  { key: 'ml', label: 'ML', desc: 'on-device models' },
  { key: 'heavy', label: 'Heavy / Backend', desc: 'client-server' },
]

export const tiers = [
  {
    key: 'pixel',
    label: 'Pixel-Level Filters',
    desc: 'single-operation, no neighbors',
    info: 'Each output pixel depends only on that same input pixel (or a fixed global rule) — no looking at neighboring pixels at all. The simplest, cheapest category of image processing.',
  },
  {
    key: 'spatial',
    label: 'Spatial Techniques',
    desc: 'neighborhood & gradient-based',
    info: 'These look at neighboring pixels — convolutions, gradients, or region analysis — to detect structure like edges, shapes, or distinctive points.',
  },
  {
    key: 'temporal',
    label: 'Motion & Temporal',
    desc: 'compares across frames',
    info: 'These need memory of previous frames, not just the current one — frame differencing, learned background models, and accumulated exposure.',
  },
  {
    key: 'applied',
    label: 'Applied Tools',
    desc: 'utility features',
    info: 'Real product features composed from the techniques above — a page-detecting document scanner, and a built-in QR code reader.',
  },
]

export function processorsInCategory(categoryKey) {
  return processorList.filter((p) => p.category === categoryKey)
}

export function processorsInTier(categoryKey, tierKey) {
  return processorList.filter((p) => p.category === categoryKey && p.tier === tierKey)
}
