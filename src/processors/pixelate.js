export const pixelate = {
  key: 'pixelate',
  label: 'Pixelate',
  category: 'nonml',
  tier: 'pixel',
  needsThresholds: false,
  info: 'The same downscale trick we used to speed up Cartoon, but used HERE as the visible effect itself: shrink drastically, then scale back up with nearest-neighbor (blocky, no smoothing) interpolation.',
  run(cv, { src }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const blockSize = 16
    const smallSize = new cv.Size(
      Math.max(1, Math.round(rgb.cols / blockSize)),
      Math.max(1, Math.round(rgb.rows / blockSize))
    )
    const small = new cv.Mat()
    cv.resize(rgb, small, smallSize, 0, 0, cv.INTER_LINEAR)

    const result = new cv.Mat()
    cv.resize(small, result, new cv.Size(rgb.cols, rgb.rows), 0, 0, cv.INTER_NEAREST)

    rgb.delete()
    small.delete()
    return result
  },
}
