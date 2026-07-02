export const invert = {
  key: 'invert',
  label: 'Invert',
  category: 'nonml',
  needsThresholds: false,
  run(cv, { src }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const result = new cv.Mat()
    cv.bitwise_not(rgb, result)

    rgb.delete()
    return result
  },
}
