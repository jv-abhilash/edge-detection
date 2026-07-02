let frameCounter = 0
let cachedResult = null

export const cartoon = {
  key: 'cartoon',
  label: 'Cartoon',
  category: 'nonml',
  tier: 'spatial',
  info: 'Bilateral filter smooths color while preserving edges, combined with an adaptive-threshold outline mask. Downscaled and frame-skipped here for real-time speed.',
  needsThresholds: false,
  run(cv, { src, gray }) {
    frameCounter++

    const skipInterval = 2
    if (cachedResult && frameCounter % skipInterval !== 0) {
      return cachedResult.clone()
    }

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const scale = 0.4
    const smallSize = new cv.Size(
      Math.max(1, Math.round(rgb.cols * scale)),
      Math.max(1, Math.round(rgb.rows * scale))
    )
    const small = new cv.Mat()
    cv.resize(rgb, small, smallSize, 0, 0, cv.INTER_LINEAR)

    const smallSmooth = new cv.Mat()
    cv.bilateralFilter(small, smallSmooth, 7, 150, 150, cv.BORDER_DEFAULT)

    const smooth = new cv.Mat()
    cv.resize(smallSmooth, smooth, new cv.Size(rgb.cols, rgb.rows), 0, 0, cv.INTER_LINEAR)

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
    small.delete()
    smallSmooth.delete()
    smooth.delete()
    grayBlur.delete()
    edgeMask.delete()
    edgeMaskColor.delete()

    if (cachedResult) cachedResult.delete()
    cachedResult = result.clone()

    return result
  },
}
