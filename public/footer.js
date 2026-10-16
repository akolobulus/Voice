const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

export function initFooter(root) {
  const canvas = root.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let dots = []
  let pointer = { x: -9999, y: -9999 }
  let ring = null
  let frame = 0
  let width = 1
  let height = 1
  let dpr = 1

  function layout() {
    const rect = root.getBoundingClientRect()
    width = Math.max(1, Math.round(rect.width))
    height = Math.max(1, Math.round(rect.height))
    dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    const gap = Math.max(5, Math.min(8, width / 180))
    const mask = document.createElement('canvas')
    mask.width = width
    mask.height = height
    const m = mask.getContext('2d', { willReadFrequently: true })
    if (!m) return
    const fontSize = Math.min(width / 3.8, 260)
    m.font = `600 ${fontSize}px Inter, Arial, sans-serif`
    m.textAlign = 'center'
    m.textBaseline = 'alphabetic'
    m.fillStyle = '#000'
    m.fillText('VOICE', width / 2, height + fontSize * .18)
    const pixels = m.getImageData(0, 0, width, height).data
    dots = []
    for (let y = 0; y < height; y += gap) {
      for (let x = 0; x < width; x += gap) {
        const alpha = pixels[(y * width + x) * 4 + 3] / 255
        if (alpha > .12) dots.push({ x, y, hx: x, hy: y, vx: 0, vy: 0, alpha })
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#f0f3f8'
    ctx.fillRect(0, 0, width, height)
    let moving = false
    for (const dot of dots) {
      if (!reduced) {
        const dx = dot.x - pointer.x
        const dy = dot.y - pointer.y
        const distance = Math.hypot(dx, dy)
        if (distance < 110) {
          const force = (1 - distance / 110) * 2.5
          dot.vx += (dx / (distance || 1)) * force
          dot.vy += (dy / (distance || 1)) * force
        }
        if (ring) {
          const ringDistance = Math.hypot(dot.hx - ring.x, dot.hy - ring.y)
          const age = performance.now() - ring.time
          const band = clamp(1 - Math.abs(ringDistance - age * .7) / 22, 0, 1)
          dot.vx += (dot.hx - ring.x) * band * .025
          dot.vy += (dot.hy - ring.y) * band * .025
          if (age > 900) ring = null
        }
        dot.vx = (dot.vx + (dot.hx - dot.x) * .055) * .82
        dot.vy = (dot.vy + (dot.hy - dot.y) * .055) * .82
        dot.x += dot.vx
        dot.y += dot.vy
        moving ||= Math.abs(dot.vx) + Math.abs(dot.vy) > .02
      }
      const warmth = clamp(Math.hypot(dot.x - dot.hx, dot.y - dot.hy) / 34, 0, 1)
      ctx.fillStyle = `rgb(${Math.round(82 + warmth * 90)}, ${Math.round(98 + warmth * 35)}, ${Math.round(180 + warmth * 30)})`
      ctx.globalAlpha = .18 + dot.alpha * .7
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, 1.2 + dot.alpha * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (!reduced && (moving || ring || pointer.x > -1000)) frame = requestAnimationFrame(draw)
  }

  function wake() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(draw)
  }
  function local(event) {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  root.addEventListener('pointermove', (event) => { pointer = local(event); wake() })
  root.addEventListener('pointerleave', () => { pointer = { x: -9999, y: -9999 }; wake() })
  root.addEventListener('pointerdown', (event) => {
    if (event.target.closest('a, button')) return
    ring = { ...local(event), time: performance.now() }
    wake()
  })
  const resize = new ResizeObserver(() => { layout(); wake() })
  resize.observe(root)
  layout()
  draw()
}
