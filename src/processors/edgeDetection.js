export const edgeDetection = {
  key: 'edge',
  label: 'Edge Detection',
  needsThresholds: true,
  category: 'nonml',
  tier: 'spatial',
  info: 'Canny edge detection: Sobel gradients, thinned to single-pixel lines, then double-thresholded and connected by hysteresis. Named after John F. Canny, who designed the algorithm in 1986.',
  run(cv, { blurred, lowThresh, highThresh }) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, lowThresh, highThresh)
    return edges
  },
}
