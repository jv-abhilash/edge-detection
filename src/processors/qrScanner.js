let detector = null

export const qrScanner = {
  key: 'qrScanner',
  label: 'QR Scanner',
  category: 'nonml',
  tier: 'applied',
  needsThresholds: false,
  info: 'cv.QRCodeDetector locates and decodes a QR code\u2019s payload directly \u2014 no external library needed. detect() finds the 4 corner points, decode() reads the actual embedded data from that region.',
  run(cv, { src }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    if (!detector) {
      detector = new cv.QRCodeDetector()
    }

    const points = new cv.Mat()
    const found = detector.detect(rgb, points)

    if (found) {
      const boxColor = new cv.Scalar(80, 220, 120, 255)
      for (let i = 0; i < 4; i++) {
        const x1 = points.data32F[i * 2]
        const y1 = points.data32F[i * 2 + 1]
        const next = (i + 1) % 4
        const x2 = points.data32F[next * 2]
        const y2 = points.data32F[next * 2 + 1]
        cv.line(rgb, new cv.Point(x1, y1), new cv.Point(x2, y2), boxColor, 3)
      }

      const text = detector.decode(rgb, points)
      if (text) {
        cv.putText(
          rgb, text, new cv.Point(12, 30),
          cv.FONT_HERSHEY_SIMPLEX, 0.8,
          new cv.Scalar(255, 170, 60, 255), 2
        )
      }
    }

    points.delete()
    return rgb
  },
  reset() {
    if (detector) {
      detector.delete?.()
      detector = null
    }
  },
}
