import { edgeDetection } from './edgeDetection.js'
import { edgeOnGray } from './edgeOnGray.js'
import { cartoon } from './cartoon.js'
import { contours } from './contours.js'
import { pencilSketch } from './pencilSketch.js'
import { sepia } from './sepia.js'
import { invert } from './invert.js'
import { thresholdEffect } from './threshold.js'
import { emboss } from './emboss.js'

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
}

export const processorList = Object.values(processors)

export const categories = [
  { key: 'nonml', label: 'Non-ML CV', desc: 'classical algorithms' },
  { key: 'ml', label: 'ML', desc: 'on-device models' },
  { key: 'heavy', label: 'Heavy / Backend', desc: 'client-server' },
]

export function processorsInCategory(categoryKey) {
  return processorList.filter((p) => p.category === categoryKey)
}
