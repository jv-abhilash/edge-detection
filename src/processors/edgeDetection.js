export const edgeDetection = {
  key: 'edge',
  label: 'Edge Detection',
  needsThresholds: true,
  category: 'nonml',
  run(cv, { blurred, lowThresh, highThresh }) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, lowThresh, highThresh)
    return edges
  },
}
