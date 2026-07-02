export const pencilSketch = {
  key: 'pencil',
  label: 'Pencil Sketch',
  category: 'nonml',
  needsThresholds: false,
  run(cv, { gray }) {
    const inverted = new cv.Mat()
    cv.bitwise_not(gray, inverted)

    const blurred = new cv.Mat()
    cv.GaussianBlur(inverted, blurred, new cv.Size(21, 21), 0, 0, cv.BORDER_DEFAULT)

    const invertedBlur = new cv.Mat()
    cv.bitwise_not(blurred, invertedBlur)

    const sketch = new cv.Mat()
    cv.divide(gray, invertedBlur, sketch, 256)

    inverted.delete()
    blurred.delete()
    invertedBlur.delete()

    return sketch
  },
}
