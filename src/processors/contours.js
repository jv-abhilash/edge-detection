export const contours = {
  key: 'contours',
  label: 'Contours',
  needsThresholds: true,
  category: 'nonml',
  tier: 'spatial',
  info: 'findContours traces closed/open boundaries from the Canny edge map — a step beyond raw edges, since a contour is an actual traceable shape outline you could measure or filter.',
  run(cv, { blurred, src, lowThresh, highThresh }) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, lowThresh, highThresh)

    const contourList = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contourList, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const result = new cv.Mat(src.rows, src.cols, cv.CV_8UC3, new cv.Scalar(0, 0, 0))
    const color = new cv.Scalar(80, 220, 120)
    for (let i = 0; i < contourList.size(); i++) {
      cv.drawContours(result, contourList, i, color, 2, cv.LINE_8, hierarchy, 0)
    }

    edges.delete()
    contourList.delete()
    hierarchy.delete()

    return result
  },
}
