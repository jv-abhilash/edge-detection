export const edgeOnGray = {
  key: 'edgeGray',
  label: 'Edges on Gray',
  needsThresholds: true,
  category: 'nonml',
  tier: 'spatial',
  info: 'Same Canny pipeline as Edge Detection, but the highlight is painted onto the live grayscale feed instead of a black background — useful for seeing edges in context.',
  run(cv, { gray, blurred, lowThresh, highThresh }) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, lowThresh, highThresh)

    const base = new cv.Mat()
    cv.cvtColor(gray, base, cv.COLOR_GRAY2RGB)

    const highlight = new cv.Scalar(255, 170, 60)
    base.setTo(highlight, edges)

    edges.delete()
    return base
  },
}
