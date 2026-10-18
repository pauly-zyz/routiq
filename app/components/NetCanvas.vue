<script setup lang="ts">
// Drifting node network with light packets travelling between nodes.
const el = ref<HTMLCanvasElement>()
let stop = () => {}

onMounted(() => {
  const canvas = el.value!
  const ctx = canvas.getContext('2d')!
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const LINK = 150
  type N = { x: number, y: number, vx: number, vy: number, r: number }
  let w = 0, h = 0, raf = 0, visible = true
  let nodes: N[] = []
  let packets: { a: N, b: N, t: number, sp: number }[] = []

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    w = r.width; h = r.height
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.min(70, Math.round((w * h) / 18000))
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, r: Math.random() * 1.3 + 0.7
    }))
    packets = []
  }

  const spawn = () => {
    const a = nodes[(Math.random() * nodes.length) | 0]
    if (!a) return
    let best: N | null = null, bd = Infinity
    for (const b of nodes) {
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (b !== a && d > 40 && d < LINK && d < bd) { bd = d; best = b }
    }
    if (best) packets.push({ a, b: best, t: 0, sp: 0.008 + Math.random() * 0.01 })
  }

  const frame = () => {
    ctx.clearRect(0, 0, w, h)
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy
      if (n.x < 0 || n.x > w) n.vx *= -1
      if (n.y < 0 || n.y > h) n.vy *= -1
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!, b = nodes[j]!
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < LINK) {
          ctx.strokeStyle = `rgba(124,92,255,${(1 - d / LINK) * 0.2})`
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
      }
    }
    ctx.fillStyle = 'rgba(200,200,220,.5)'
    for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill() }
    if (packets.length < 9 && Math.random() < 0.08) spawn()
    packets = packets.filter(p => p.t <= 1)
    for (const p of packets) {
      p.t += p.sp
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8)
      g.addColorStop(0, 'rgba(56,217,245,.95)'); g.addColorStop(1, 'rgba(56,217,245,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill()
    }
    if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame)
  }
  const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) }

  resize(); start()
  let rt: ReturnType<typeof setTimeout>
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { resize(); start() }, 150) }
  const onVis = () => { if (!document.hidden && visible) start() }
  const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) start() })
  io.observe(canvas)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVis)
  stop = () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis) }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <canvas ref="el" class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
</template>
