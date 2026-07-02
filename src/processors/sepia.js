export const sepia = {
  key: 'sepia',
  label: 'Sepia',
  category: 'nonml',
  tier: 'pixel',
  info: 'A fixed 3x3 color-transform matrix (each output channel is a weighted mix of input R/G/B) — the same idea as the grayscale weighted-sum, tuned for a warm sepia tone instead of one channel.',
  needsThresholds: false,
  run(cv, { src }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const kernel = cv.matFromArray(4, 4, cv.CV_32FC1, [
      0.393, 0.769, 0.189, 0,
      0.349, 0.686, 0.168, 0,
      0.272, 0.534, 0.131, 0,
      0,     0,     0,     1,
    ])

    const rgba = new cv.Mat()
    cv.cvtColor(rgb, rgba, cv.COLOR_RGB2RGBA)

    const result = new cv.Mat()
    cv.transform(rgba, result, kernel)

    rgb.delete()
    kernel.delete()
    rgba.delete()

    return result
  },
}
