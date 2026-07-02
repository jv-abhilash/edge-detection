let prevFrame = null

export const motionDetection = {
  key: 'motion',
  label: 'Motion Detection',
  category: 'nonml',
  tier: 'temporal',
  needsThresholds: true,
  info: 'absdiff compares the current frame against the PREVIOUS frame, pixel by pixel — anything that changed shows up bright, anything static goes black. The first frame with no history yet is always blank.',
  run(cv, { gray, lowThresh }) {
    if (!prevFrame) {
      prevFrame = gray.clone()
      return new cv.Mat(gray.rows, gray.cols, cv.CV_8UC1, new cv.Scalar(0))
    }

    const diff = new cv.Mat()
    cv.absdiff(gray, prevFrame, diff)

    const result = new cv.Mat()
    cv.threshold(diff, result, lowThresh, 255, cv.THRESH_BINARY)

    prevFrame.delete()
    prevFrame = gray.clone()
    diff.delete()

    return result
  },
  reset() {
    if (prevFrame) {
      prevFrame.delete()
      prevFrame = null
    }
  },
}
