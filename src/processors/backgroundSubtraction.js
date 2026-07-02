let subtractor = null

export const backgroundSubtraction = {
  key: 'bgsub',
  label: 'Background Subtraction',
  category: 'nonml',
  tier: 'temporal',
  needsThresholds: false,
  info: 'BackgroundSubtractorMOG2 builds a statistical model of the static background over many frames, then flags anything that doesn\u2019t match as foreground. Tolerates gradual lighting changes, unlike simple frame-differencing.',
  run(cv, { src }) {
    if (!subtractor) {
      subtractor = new cv.BackgroundSubtractorMOG2(500, 16, true)
    }

    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const fgMask = new cv.Mat()
    subtractor.apply(rgb, fgMask)

    const result = new cv.Mat()
    cv.cvtColor(fgMask, result, cv.COLOR_GRAY2RGB)

    rgb.delete()
    fgMask.delete()

    return result
  },
  reset() {
    if (subtractor) {
      subtractor.delete?.()
      subtractor = null
    }
  },
}
