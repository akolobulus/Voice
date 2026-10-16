export function createAiBackground(canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const points = []
  let width = 1
  let height = 1
  let dpr = 1
  let raf = 0
  let start = performance.now()

  function layout() {
    const rect = canvas.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    points.length = 0
    const spacing = Math.max(10, Math.min(17, width / 78))
    const centerX = width * .73
    const centerY = height * .48
    const radiusX = Math.min(width * .25, 310)
    const radiusY = Math.min(height * .44, 360)
    const isFeature = (nx, ny) => {
      const eye = (Math.abs(ny + .1) < .025 && Math.abs(Math.abs(nx) - .28) < .08)
      const brow = (Math.abs(ny + .19) < .025 && Math.abs(Math.abs(nx) - .28) < .1)
      const nose = (Math.abs(nx) < .035 && ny > -.05 && ny < .22) || (Math.abs(ny - .22) < .025 && Math.abs(nx) < .08)
      const mouth = (Math.abs(ny - .34) < .035 && Math.abs(nx) < .16) || (Math.abs(ny - .39) < .025 && Math.abs(nx) < .1)
      return eye || brow || nose || mouth
    }
    for (let y = centerY - radiusY * 1.12; y < centerY + radiusY * 1.1; y += spacing) {
      for (let x = centerX - radiusX * 1.08; x < centerX + radiusX * 1.08; x += spacing) {
        const nx = (x - centerX) / radiusX
        const ny = (y - centerY) / radiusY
        const head = nx * nx + ny * ny < 1
        const hair = ny < -.55 && nx * nx + (ny + .25) * (ny + .25) < 1.12
        const ear = Math.abs(Math.abs(nx) - 1) < .08 && Math.abs(ny + .02) < .22
        if (!head && !hair && !ear && !isFeature(nx, ny)) continue
        const jitterX = (Math.random() - .5) * spacing * .35
        const jitterY = (Math.random() - .5) * spacing * .35
        const homeX = x + jitterX
        const homeY = y + jitterY
        const distance = Math.hypot(nx, ny)
        points.push({
          x: reduced ? homeX : homeX + (Math.random() - .5) * width * .9,
          y: reduced ? homeY : homeY + (Math.random() - .5) * height * .8,
          hx: homeX,
          hy: homeY,
          distance: distance + Math.cos(Math.atan2(ny, nx) * 8) * .035,
          size: isFeature(nx, ny) ? 1.8 + Math.random() * 1.1 : 1 + Math.random() * .8,
          alpha: isFeature(nx, ny) ? .95 : .55 + Math.random() * .35,
        })
      }
    }
  }

  function draw(now) {
    const t = reduced ? 0 : (now - start) / 1000
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const gradient = ctx.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .42, Math.max(width, height) * .7)
    gradient.addColorStop(0, 'rgba(122, 105, 238, .12)')
    gradient.addColorStop(.46, 'rgba(151, 130, 245, .045)')
    gradient.addColorStop(1, 'rgba(245, 247, 251, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    const pulse = (Math.sin(t * Math.PI * .6) + 1) * .5
    const rgb = .35 + pulse * .35
    for (const point of points) {
      if (!reduced) {
        const dx = point.hx - point.x
        const dy = point.hy - point.y
        point.x += dx * .018
        point.y += dy * .018
      }
      const wave = Math.atan(Math.sin(t * 2.4 - point.distance * 13) / (.08 + Math.min(1, point.distance) * .12))
      const scale = 1 + wave * .025
      const x = point.hx + (point.x - point.hx) * .35 * scale
      const y = point.hy + (point.y - point.hy) * .35 * scale
      const edge = Math.min(1, Math.abs(point.distance) * .7)
      ctx.globalAlpha = .08 + (1 - edge) * .25
      ctx.fillStyle = `rgb(${Math.round(89 + rgb * 25)}, ${Math.round(74 + rgb * 20)}, ${Math.round(205 + rgb * 35)})`
      ctx.beginPath()
      ctx.arc(x, y, point.size + wave * .25, 0, Math.PI * 2)
      ctx.fill()
      if (!reduced && edge < .45) {
        ctx.globalAlpha = .035
        ctx.fillStyle = '#e06bd0'
        ctx.fillRect(x + 1.2, y, 1.2, 1.2)
      }
    }
    ctx.globalAlpha = 1
    if (!reduced) raf = requestAnimationFrame(draw)
  }

  const resize = new ResizeObserver(layout)
  resize.observe(canvas)
  layout()
  draw(performance.now())
  return () => {
    resize.disconnect()
    cancelAnimationFrame(raf)
  }
}
