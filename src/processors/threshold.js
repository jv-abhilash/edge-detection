export const thresholdEffect = {
  key: 'threshold',
  label: 'Threshold',
  category: 'nonml',
  needsThresholds: true,
  run(cv, { gray, lowThresh }) {
    const result = new cv.Mat()
    cv.threshold(gray, result, lowThresh, 255, cv.THRESH_BINARY)
    return result
  },
}
