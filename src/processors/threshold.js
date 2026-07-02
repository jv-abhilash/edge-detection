export const thresholdEffect = {
  key: 'threshold',
  label: 'Threshold',
  category: 'nonml',
  tier: 'pixel',
  info: 'One global cutoff value: brighter than it becomes pure white, darker becomes pure black. No gradient or neighbor math, unlike Canny.',
  needsThresholds: true,
  run(cv, { gray, lowThresh }) {
    const result = new cv.Mat()
    cv.threshold(gray, result, lowThresh, 255, cv.THRESH_BINARY)
    return result
  },
}
