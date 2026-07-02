let accumulator = null

export const lightTrail = {
  key: 'lightTrail',
  label: 'Light Trail',
  category: 'nonml',
  tier: 'temporal',
  needsThresholds: false,
  info: 'Each new frame is blended with the running accumulator via addWeighted: result = accumulator*(1-alpha) + newFrame*alpha. Small alpha means old bright pixels fade slowly — like a slow-shutter long-exposure photo.',
  run(cv, { src }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    if (!accumulator) {
      accumulator = rgb.clone()
    } else {
      const alpha = 0.08
      const blended = new cv.Mat()
      cv.addWeighted(accumulator, 1 - alpha, rgb, alpha, 0, blended)
      accumulator.delete()
      accumulator = blended
    }

    rgb.delete()
    return accumulator.clone()
  },
  reset() {
    if (accumulator) {
      accumulator.delete()
      accumulator = null
    }
  },
}
