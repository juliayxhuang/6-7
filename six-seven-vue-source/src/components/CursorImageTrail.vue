<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const emit = defineEmits(['stamps-change'])
const props = defineProps({ imageSize: { type: Number, default: 100 }, imageColor: { type: Number, default: 0 }, imageSpacing: { type: Number, default: 200 } })

// Vite turns these local files into production asset URLs at build time.
const photos = Object.entries(import.meta.glob('../assets/trail/*.png', { eager: true, query: '?url', import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url)

const stamps = ref([])
const timers = new Map()
const visibleFor = 2400
const fadeDuration = 650
const maxStamps = 24
let nextId = 0
let nextPhoto = 0
let animationFrame = 0
let pointer = null
let follower = null
let lastStamp = null
let reduceMotion = false
let measureFrame = 0

function emitStampFootprints() {
  measureFrame = 0
  const footprints = stamps.value.flatMap(stamp => {
    const image = document.querySelector(`[data-trail-id="${stamp.id}"]`)
    if (!image || !image.offsetWidth || !image.offsetHeight) return []
    const rect = image.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angle = stamp.tilt * Math.PI / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const halfWidth = image.offsetWidth / 2
    const halfHeight = image.offsetHeight / 2
    const corners = [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [-halfWidth, halfHeight]]
      .map(([x, y]) => [centerX + x * cos - y * sin, centerY + x * sin + y * cos])
    return [{ id: stamp.id, phase: stamp.phase, corners }]
  })
  emit('stamps-change', footprints)
}

function scheduleFootprints() {
  cancelAnimationFrame(measureFrame)
  measureFrame = requestAnimationFrame(emitStampFootprints)
}

watch(stamps, async () => { await nextTick(); scheduleFootprints() }, { deep: true, flush: 'post' })
watch(() => props.imageSize, async () => { await nextTick(); scheduleFootprints() }, { flush: 'post' })

function removeStamp(id) {
  const handles = timers.get(id)
  if (handles) {
    cancelAnimationFrame(handles[0])
    clearTimeout(handles[1])
    clearTimeout(handles[2])
  }
  timers.delete(id)
  stamps.value = stamps.value.filter(stamp => stamp.id !== id)
}

function addStamp(x, y) {
  if (!photos.length) return
  if (stamps.value.length >= maxStamps) removeStamp(stamps.value[0].id)

  const stamp = {
    id: ++nextId,
    src: photos[nextPhoto++ % photos.length],
    x,
    y,
    tilt: Math.round((Math.random() * 20 - 10) * 10) / 10,
    phase: 'entering'
  }
  stamps.value = [...stamps.value, stamp]

  // An animation frame lets the browser paint opacity: 0 before the entrance.
  const enter = requestAnimationFrame(() => { stamps.value.find(item => item.id === stamp.id).phase = 'visible' })
  const fade = setTimeout(() => { stamps.value.find(item => item.id === stamp.id).phase = 'leaving' }, visibleFor)
  const remove = setTimeout(() => removeStamp(stamp.id), visibleFor + fadeDuration)
  timers.set(stamp.id, [enter, fade, remove])
}

function animate() {
  if (!pointer || !follower) { animationFrame = 0; return }
  follower.x += (pointer.x - follower.x) * 0.22
  follower.y += (pointer.y - follower.y) * 0.22

  if (lastStamp && Math.hypot(follower.x - lastStamp.x, follower.y - lastStamp.y) >= props.imageSpacing) {
    addStamp(follower.x, follower.y)
    lastStamp = { ...follower }
  }

  if (Math.hypot(pointer.x - follower.x, pointer.y - follower.y) > 0.35) {
    animationFrame = requestAnimationFrame(animate)
  } else {
    follower = { ...pointer }
    animationFrame = 0
  }
}

function onPointerMove(event) {
  if (reduceMotion || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return
  pointer = { x: event.clientX, y: event.clientY }
  if (!follower) {
    follower = { ...pointer }
    lastStamp = { ...pointer }
  }
  if (!animationFrame) animationFrame = requestAnimationFrame(animate)
}

function onPointerLeave(event) {
  if (event.relatedTarget) return
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  pointer = null
  follower = null
  lastStamp = null
}

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerout', onPointerLeave)
  window.addEventListener('resize', scheduleFootprints)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerout', onPointerLeave)
  window.removeEventListener('resize', scheduleFootprints)
  cancelAnimationFrame(animationFrame)
  cancelAnimationFrame(measureFrame)
  emit('stamps-change', [])
  for (const id of timers.keys()) removeStamp(id)
})
</script>

<template>
  <div class="cursor-image-trail" aria-hidden="true">
    <img
      v-for="stamp in stamps"
      :key="stamp.id"
      class="cursor-image-stamp"
      :class="[`is-${stamp.phase}`, `image-color-${imageColor}`]"
      :src="stamp.src"
      :data-trail-id="stamp.id"
      alt=""
      draggable="false"
      :style="{ left: `${stamp.x}px`, top: `${stamp.y}px`, '--stamp-tilt': `${stamp.tilt}deg`, width: `clamp(${92 * imageSize / 100}px, ${10.8 * imageSize / 100}vw, ${144 * imageSize / 100}px)`, maxHeight: `${30.4 * imageSize / 100}vh` }"
      @load="scheduleFootprints"
    >
  </div>
</template>

<style scoped>
.cursor-image-trail {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  pointer-events: none;
  contain: layout style paint;
}

.cursor-image-stamp {
  position: absolute;
  display: block;
  width: clamp(115px, 13.5vw, 180px);
  height: auto;
  max-height: 38vh;
  object-fit: contain;
  transform: translate(-50%, -50%) rotate(var(--stamp-tilt));
  opacity: 0;
  pointer-events: none;
  user-select: none;
  transition: opacity 420ms ease-out;
  will-change: opacity;
}

.cursor-image-stamp.is-visible { opacity: 1; }
.cursor-image-stamp.is-leaving { opacity: 0; transition-duration: 650ms; }
.cursor-image-stamp.image-color-1 { filter: invert(1); }
.cursor-image-stamp.image-color-2 { filter: grayscale(1); }
</style>
