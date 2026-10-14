<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({ open: Boolean, route: { type: String, default: 'home' }, cursorSize: { type: Number, default: 1 } })
const emit = defineEmits(['close', 'navigate'])
const canvas = ref(null)
const titleCanvas = ref(null)
const pixel = 8
const brushRadii = [6, 7, 11, 15]
const colors = ['#53c7de', '#a6ce38', '#000']
let lastPoint = null
let painted = new Set()
let titlePixels = new Map()
let activeName = null
let titleRects = []
let titleFrame = 0

function pixelHash(x, y) {
  return Math.abs((x * 73856093 ^ y * 19349663) >>> 0)
}
function resetCanvas() {
  const node = canvas.value
  const titleNode = titleCanvas.value
  if (!node || !titleNode) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  for (const layer of [node, titleNode]) {
    layer.width = Math.round(window.innerWidth * ratio)
    layer.height = Math.round(window.innerHeight * ratio)
    layer.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0)
  }
  const ctx = node.getContext('2d')
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  painted = new Set()
  titlePixels = new Map()
  activeName = null
  titleRects = []
  cancelAnimationFrame(titleFrame)
  titleFrame = 0
  lastPoint = null
  for (let y = 12; y < window.innerHeight; y += 38) {
    for (let x = 12; x < window.innerWidth; x += 38) {
      if (pixelHash(x, y) % 13 !== 0) continue
      ctx.fillStyle = pixelHash(y, x) % 2 ? '#d5edeb' : '#e5efd0'
      ctx.fillRect(x, y, 3, 3)
    }
  }
}
function clearTitlePixels() {
  cancelAnimationFrame(titleFrame)
  titleFrame = 0
  titleCanvas.value?.getContext('2d').clearRect(0, 0, window.innerWidth, window.innerHeight)
  titlePixels.clear()
}
function renderTitlePixels(now) {
  const ctx = titleCanvas.value?.getContext('2d')
  if (!ctx) { titleFrame = 0; return }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  for (const [key, mark] of titlePixels) {
    const age = now - mark.born
    if (age >= 1000) { titlePixels.delete(key); continue }
    ctx.globalAlpha = 1 - age / 1000
    ctx.fillStyle = mark.color
    ctx.fillRect(mark.x, mark.y, pixel - 1, pixel - 1)
  }
  ctx.globalAlpha = 1
  titleFrame = titlePixels.size ? requestAnimationFrame(renderTitlePixels) : 0
}
function addTitlePixel(key, x, y, color) {
  if (titlePixels.has(key)) return
  titlePixels.set(key, { x, y, color, born: performance.now() })
  if (!titleFrame) titleFrame = requestAnimationFrame(renderTitlePixels)
}
function stamp(x, y, overName = false) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  const radius = (brushRadii[props.cursorSize] ?? brushRadii[1]) * (overName ? 1.45 : 1)
  const minX = Math.floor((x - radius) / pixel)
  const maxX = Math.floor((x + radius) / pixel)
  const minY = Math.floor((y - radius) / pixel)
  const maxY = Math.floor((y + radius) / pixel)
  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const distance = Math.hypot(col * pixel + pixel / 2 - x, row * pixel + pixel / 2 - y)
      if (distance > radius) continue
      const cellX = col * pixel + pixel / 2, cellY = row * pixel + pixel / 2
      if (!overName && titleRects.some(rect => cellX >= rect.left && cellX <= rect.right && cellY >= rect.top && cellY <= rect.bottom)) continue
      const key = `${col}:${row}`
      if (overName ? titlePixels.has(key) : painted.has(key)) continue
      if (Math.random() < (overName ? .4 : .23)) continue
      const colorPick = Math.random()
      const color = colorPick < .52 ? colors[0] : colorPick < .86 ? colors[1] : colors[2]
      if (overName) addTitlePixel(key, col * pixel, row * pixel, color)
      else { painted.add(key); ctx.fillStyle = color; ctx.fillRect(col * pixel, row * pixel, pixel - 1, pixel - 1) }
      if (overName && Math.random() < .22) {
        const jitterX = (Math.floor(Math.random() * 5) - 2) * pixel
        const jitterY = (Math.floor(Math.random() * 5) - 2) * pixel
        const jx = col * pixel + jitterX, jy = row * pixel + jitterY
        addTitlePixel(`jitter:${jx}:${jy}`, jx, jy, color)
      }
    }
  }
}
function onPointerMove(event) {
  if (!props.open || event.pointerType === 'touch') return
  titleRects = [...document.querySelectorAll('.nav-trigger .nav-base,.nav-trigger .nav-echo')].map(node => node.getBoundingClientRect())
  const point = { x: event.clientX, y: event.clientY }
  const name = event.target.closest?.('.nav-trigger') || null
  if (name !== activeName) {
    activeName = name
    lastPoint = null
  }
  const overName = Boolean(name)
  if (lastPoint) {
    const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
    const steps = Math.max(1, Math.ceil(distance / (pixel / 2)))
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps
      stamp(lastPoint.x + (point.x - lastPoint.x) * fraction, lastPoint.y + (point.y - lastPoint.y) * fraction, overName)
    }
  } else stamp(point.x, point.y, overName)
  lastPoint = point
}
function onPointerOut(event) { if (!event.relatedTarget) { lastPoint = null; activeName = null } }
watch(() => props.open, open => { if (open) resetCanvas(); else { lastPoint = null; clearTitlePixels() } })
onMounted(() => { resetCanvas(); window.addEventListener('resize', resetCanvas); window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerout', onPointerOut) })
onUnmounted(() => { window.removeEventListener('resize', resetCanvas); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerout', onPointerOut); cancelAnimationFrame(titleFrame) })
</script>

<template>
  <div class="layout-wrapper" :class="[route, { 'nav-open': open }]">
    <div id="canvas-bg" class="canvas-layer" aria-hidden="true"><canvas ref="canvas"></canvas></div>
    <canvas ref="titleCanvas" class="title-pixels" aria-hidden="true"></canvas>
    <main class="columns-container">
      <section class="column"><slot name="column-1" /></section>
      <section class="column"><slot name="column-2" /></section>
      <section class="column"><slot name="column-3" /></section>
    </main>
    <nav v-if="open" id="navOverlay" class="nav-overlay" aria-label="Main pages">
      <button class="nav-close" type="button" aria-label="Close navigation" @click="emit('close')">X</button>
      <div class="nav-content">
        <button class="nav-trigger nav-home" type="button" :aria-current="route === 'home' ? 'page' : undefined" @click="emit('navigate', 'home')"><span class="nav-base">#Home</span><span class="nav-echo" aria-hidden="true">#Home</span></button>
        <button class="nav-trigger nav-guide" type="button" :aria-current="route === 'guide' ? 'page' : undefined" @click="emit('navigate', 'guide')"><span class="nav-base">#Guide to<br>Internet Slang</span><span class="nav-echo" aria-hidden="true"><span class="nav-line">#Guide to</span><span class="nav-line">Internet Slang</span></span></button>
        <button class="nav-trigger nav-interviews" type="button" :aria-current="route === 'interviews' ? 'page' : undefined" @click="emit('navigate', 'interviews')"><span class="nav-base">#Interviews</span><span class="nav-echo" aria-hidden="true">#Interviews</span></button>
        <button class="nav-trigger nav-about" type="button" :aria-current="route === 'credits' ? 'page' : undefined" @click="emit('navigate', 'credits')"><span class="nav-base">#About</span><span class="nav-echo" aria-hidden="true">#About</span></button>
      </div>
    </nav>
  </div>
</template>
