<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({ open: Boolean, route: { type: String, default: 'home' } })
const emit = defineEmits(['close', 'navigate'])
const isBlurred = ref(false)
const canvas = ref(null)

function drawBackground() {
  const node = canvas.value
  if (!node) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  node.width = Math.round(width * ratio)
  node.height = Math.round(height * ratio)
  const ctx = node.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  // Fixed, quiet archival marks. Only the canvas blur changes on hover.
  const marks = [
    [0.06, 0.12, 4, '#a6ce38'], [0.22, 0.06, 3, '#53c7de'],
    [0.81, 0.15, 3, '#a6ce38'], [0.95, 0.29, 5, '#53c7de'],
    [0.72, 0.56, 3, '#53c7de'], [0.10, 0.83, 4, '#a6ce38'],
    [0.92, 0.91, 4, '#a6ce38']
  ]
  for (const [x, y, size, color] of marks) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.26
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(Math.round(width * x + i * size * 3.4), Math.round(height * y + i * size * 0.7), size, size)
    }
  }
  ctx.globalAlpha = 1
}
onMounted(() => { drawBackground(); window.addEventListener('resize', drawBackground) })
onUnmounted(() => window.removeEventListener('resize', drawBackground))
function navigate(destination) { isBlurred.value = false; emit('navigate', destination) }
function close() { isBlurred.value = false; emit('close') }
</script>

<template>
  <div class="layout-wrapper" :class="[route, { 'nav-open': open }]">
    <div id="canvas-bg" class="canvas-layer" :class="{ 'is-blurred': isBlurred }" aria-hidden="true">
      <canvas ref="canvas"></canvas>
    </div>
    <main class="columns-container">
      <section class="column"><slot name="column-1" /></section>
      <section class="column"><slot name="column-2" /></section>
      <section class="column"><slot name="column-3" /></section>
    </main>
    <nav v-if="open" id="navOverlay" class="nav-overlay" aria-label="Main pages">
      <button class="nav-close" type="button" aria-label="Close navigation" @click="close">X</button>
      <div class="nav-content">
        <button class="nav-trigger nav-home" type="button" :aria-current="route === 'home' ? 'page' : undefined" @mouseenter="isBlurred = true" @mouseleave="isBlurred = false" @focus="isBlurred = true" @blur="isBlurred = false" @click="navigate('home')"><span class="nav-base">#Home</span><span class="nav-echo" aria-hidden="true">#Home</span></button>
        <button class="nav-trigger nav-guide" type="button" :aria-current="route === 'guide' ? 'page' : undefined" @mouseenter="isBlurred = true" @mouseleave="isBlurred = false" @focus="isBlurred = true" @blur="isBlurred = false" @click="navigate('guide')"><span class="nav-base">#Guide to<br>Internet Slang</span><span class="nav-echo" aria-hidden="true">#Guide to<br>Internet Slang</span></button>
        <button class="nav-trigger nav-interviews" type="button" :aria-current="route === 'interviews' ? 'page' : undefined" @mouseenter="isBlurred = true" @mouseleave="isBlurred = false" @focus="isBlurred = true" @blur="isBlurred = false" @click="navigate('interviews')"><span class="nav-base">#Interviews</span><span class="nav-echo" aria-hidden="true">#Interviews</span></button>
        <button class="nav-trigger nav-about" type="button" :aria-current="route === 'credits' ? 'page' : undefined" @mouseenter="isBlurred = true" @mouseleave="isBlurred = false" @focus="isBlurred = true" @blur="isBlurred = false" @click="navigate('credits')"><span class="nav-base">#About</span><span class="nav-echo" aria-hidden="true">#About</span></button>
      </div>
    </nav>
  </div>
</template>
