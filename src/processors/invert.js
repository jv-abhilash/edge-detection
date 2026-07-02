export const invert = {
  key: 'invert',
  label: 'Invert',
  category: 'nonml',
  tier: 'pixel',
  info: 'bitwise_not flips every pixel value: 255 minus the original. No neighboring pixels involved at all — the simplest operation in this whole app.',
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
