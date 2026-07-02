export const documentScanner = {
  key: 'docScanner',
  label: 'Document Scanner',
  category: 'nonml',
  tier: 'applied',
  needsThresholds: true,
  info: 'Finds the largest 4-cornered contour in the frame (assumed to be a page), then getPerspectiveTransform + warpPerspective mathematically "flattens" it as if photographed dead-on — the same core technique document-scanning apps use.',
  run(cv, { src, gray, lowThresh, highThresh }) {
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    const blur = new cv.Mat()
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)
    const edges = new cv.Mat()
    cv.Canny(blur, edges, lowThresh, highThresh)

    const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    const dilated = new cv.Mat()
    cv.dilate(edges, dilated, kernel)

    const contourList = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(dilated, contourList, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    let bestQuad = null
    let bestArea = 0
    for (let i = 0; i < contourList.size(); i++) {
      const cnt = contourList.get(i)
      const area = cv.contourArea(cnt)
      if (area > 4000) {
        const peri = cv.arcLength(cnt, true)
        const approx = new cv.Mat()
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true)
        if (approx.rows === 4 && area > bestArea) {
          if (bestQuad) bestQuad.delete()
          bestQuad = approx
          bestArea = area
        } else {
          approx.delete()
        }
      }
      cnt.delete()
    }

    let result
    if (bestQuad) {
      const pts = []
      for (let i = 0; i < 4; i++) {
        pts.push({ x: bestQuad.data32S[i * 2], y: bestQuad.data32S[i * 2 + 1] })
      }
      pts.sort((a, b) => a.y - b.y)
      const [tl, tr] = pts.slice(0, 2).sort((a, b) => a.x - b.x)
      const [bl, br] = pts.slice(2, 4).sort((a, b) => a.x - b.x)

      const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y)
      const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y)
      const maxWidth = Math.max(widthTop, widthBottom)
      const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y)
      const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y)
      const maxHeight = Math.max(heightLeft, heightRight)

      const srcQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
      const dstQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight])
      const M = cv.getPerspectiveTransform(srcQuad, dstQuad)

      result = new cv.Mat()
      cv.warpPerspective(rgb, result, M, new cv.Size(maxWidth, maxHeight))

      srcQuad.delete()
      dstQuad.delete()
      M.delete()
      bestQuad.delete()
    } else {
      result = rgb.clone()
    }

    blur.delete()
    edges.delete()
    kernel.delete()
    dilated.delete()
    contourList.delete()
    hierarchy.delete()
    rgb.delete()

    return result
  },
}
