export const cartoon = {
  key: 'cartoon',
  label: 'Cartoon',
  needsThresholds: false,
  run(cv, { src, gray }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const smooth = new cv.Mat()
    cv.bilateralFilter(rgb, smooth, 9, 200, 200, cv.BORDER_DEFAULT)

    const grayBlur = new cv.Mat()
    cv.medianBlur(gray, grayBlur, 7)
    const edgeMask = new cv.Mat()
    cv.adaptiveThreshold(
      grayBlur, edgeMask, 255,
      cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY,
      9, 8
    )
    const edgeMaskColor = new cv.Mat()
    cv.cvtColor(edgeMask, edgeMaskColor, cv.COLOR_GRAY2RGB)

    const result = new cv.Mat()
    cv.bitwise_and(smooth, edgeMaskColor, result)

    rgb.delete()
    smooth.delete()
    grayBlur.delete()
    edgeMask.delete()
    edgeMaskColor.delete()

    return result
  },
}
