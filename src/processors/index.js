import { edgeDetection } from './edgeDetection.js'
import { cartoon } from './cartoon.js'
import { contours } from './contours.js'

export const processors = {
  edge: edgeDetection,
  cartoon: cartoon,
  contours: contours,
}

export const processorList = Object.values(processors)
