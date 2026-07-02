export const cornerDetection = {
  key: 'corners',
  label: 'Corner Detection',
  category: 'nonml',
  tier: 'spatial',
  needsThresholds: false,
  info: 'goodFeaturesToTrack (Shi-Tomasi method) finds distinctive, trackable points — corners where intensity changes sharply in two directions at once — unlike Canny, which marks every edge pixel regardless of direction.',
  run(cv, { gray, src }) {
    const corners = new cv.Mat()
    const maxCorners = 150
    const qualityLevel = 0.02
    const minDistance = 10
    cv.goodFeaturesToTrack(gray, corners, maxCorners, qualityLevel, minDistance)

    const base = new cv.Mat()
    cv.cvtColor(gray, base, cv.COLOR_GRAY2RGB)

    const dotColor = new cv.Scalar(255, 170, 60, 255)
    for (let i = 0; i < corners.rows; i++) {
      const x = corners.data32F[i * 2]
      const y = corners.data32F[i * 2 + 1]
      cv.circle(base, new cv.Point(x, y), 4, dotColor, -1)
    }

    corners.delete()
    return base
  },
}
