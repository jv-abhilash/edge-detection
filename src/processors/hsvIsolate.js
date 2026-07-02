export const hsvIsolate = {
  key: 'hsvIsolate',
  label: 'Color Isolation',
  category: 'nonml',
  tier: 'spatial',
  needsThresholds: true,
  info: 'Converts to HSV (Hue/Saturation/Value) so color can be isolated by hue alone, independent of lighting. Pixels inside the hue range keep their color; everything else is desaturated to gray.',
  run(cv, { src, gray, lowThresh, highThresh }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
    const hsv = new cv.Mat()
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV)

    const hueCenter = Math.round((lowThresh / 255) * 179)
    const tolerance = Math.max(6, Math.round((highThresh / 255) * 45))
    const hueLow = Math.max(0, hueCenter - tolerance)
    const hueHigh = Math.min(179, hueCenter + tolerance)

    const lowerBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hueLow, 60, 40, 0])
    const upperBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hueHigh, 255, 255, 255])
    const mask = new cv.Mat()
    cv.inRange(hsv, lowerBound, upperBound, mask)

    const grayRgb = new cv.Mat()
    cv.cvtColor(gray, grayRgb, cv.COLOR_GRAY2RGB)

    const invMask = new cv.Mat()
    cv.bitwise_not(mask, invMask)

    const colorPart = new cv.Mat()
    cv.bitwise_and(rgb, rgb, colorPart, mask)
    const grayPart = new cv.Mat()
    cv.bitwise_and(grayRgb, grayRgb, grayPart, invMask)

    const result = new cv.Mat()
    cv.add(colorPart, grayPart, result)

    rgb.delete(); hsv.delete(); lowerBound.delete(); upperBound.delete()
    mask.delete(); grayRgb.delete(); invMask.delete()
    colorPart.delete(); grayPart.delete()

    return result
  },
}
