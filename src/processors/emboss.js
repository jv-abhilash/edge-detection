export const emboss = {
  key: 'emboss',
  label: 'Emboss',
  category: 'nonml',
  tier: 'pixel',
  info: 'A directional convolution kernel (negative weights one side, positive the other) — flat regions cancel toward mid-gray, sharp edges produce a raised/carved look.',
  needsThresholds: false,
  run(cv, { gray }) {
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      -2, -1, 0,
      -1,  1, 1,
       0,  1, 2,
    ])

    const filtered = new cv.Mat()
    cv.filter2D(gray, filtered, cv.CV_32F, kernel)

    const shifted = new cv.Mat()
    cv.convertScaleAbs(filtered, shifted, 1, 128)

    kernel.delete()
    filtered.delete()

    return shifted
  },
}
