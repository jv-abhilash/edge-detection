export const edgeOnGray = {
  key: 'edgeGray',
  label: 'Edges on Gray',
  needsThresholds: true,
  category: 'nonml',
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
