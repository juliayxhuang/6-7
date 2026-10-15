<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  worldWidth: { type: Number, required: true },
  worldHeight: { type: Number, required: true },
  initialX: { type: Number, default: null },
  initialY: { type: Number, default: null }
})

const viewport = ref(null)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const tiles = [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => ({ x, y, id: `${x}:${y}` })))
const tileStyle = tile => ({
  width: `${props.worldWidth}px`,
  height: `${props.worldHeight}px`,
  transform: `translate3d(${panX.value + tile.x * props.worldWidth}px, ${panY.value + tile.y * props.worldHeight}px, 0)`
})
const wrap = (value, size) => ((value % size) + size) % size - size
const state = { vx: 0, vy: 0, frame: 0, lastFrame: 0, lastMove: 0, pointer: null, moved: false, suppressClick: false }

function step(time) {
  state.frame = 0
  if (dragging.value) return
  const elapsed = state.lastFrame ? Math.min(time - state.lastFrame, 48) : 16.67
  state.lastFrame = time
  const scale = elapsed / 16.67
  panX.value = wrap(panX.value + state.vx * scale, props.worldWidth)
  panY.value = wrap(panY.value + state.vy * scale, props.worldHeight)
  const friction = Math.pow(.94, scale)
  state.vx *= friction
  state.vy *= friction
  if (Math.abs(state.vx) < .05) state.vx = 0
  if (Math.abs(state.vy) < .05) state.vy = 0
  if (state.vx || state.vy) state.frame = requestAnimationFrame(step)
  else state.lastFrame = 0
}
function coast() {
  if (!state.frame && (state.vx || state.vy)) {
    state.lastFrame = 0
    state.frame = requestAnimationFrame(step)
  }
}
function onPointerDown(event) {
  if (event.button !== 0 || event.target.closest('button, a, input, textarea, select')) return
  cancelAnimationFrame(state.frame)
  state.frame = 0
  state.vx = 0
  state.vy = 0
  state.moved = false
  state.suppressClick = false
  state.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
  dragging.value = true
}
function onPointerMove(event) {
  const pointer = state.pointer
  if (!pointer || pointer.id !== event.pointerId) return
  const dx = event.clientX - pointer.x
  const dy = event.clientY - pointer.y
  if (!state.moved && Math.abs(dx) + Math.abs(dy) < 4) return
  if (!state.moved) {
    state.moved = true
    viewport.value.setPointerCapture(event.pointerId)
  }
  panX.value = wrap(panX.value + dx, props.worldWidth)
  panY.value = wrap(panY.value + dy, props.worldHeight)
  const elapsed = Math.max(event.timeStamp - pointer.time, 8)
  const blend = .4
  state.vx = state.vx * (1 - blend) + Math.max(-28, Math.min(28, dx * 16.67 / elapsed)) * blend
  state.vy = state.vy * (1 - blend) + Math.max(-28, Math.min(28, dy * 16.67 / elapsed)) * blend
  pointer.x = event.clientX
  pointer.y = event.clientY
  pointer.time = event.timeStamp
  state.lastMove = event.timeStamp
}
function onPointerEnd(event) {
  if (!state.pointer || state.pointer.id !== event.pointerId) return
  const moved = state.moved
  state.pointer = null
  dragging.value = false
  if (moved) {
    const idle = Math.max(0, event.timeStamp - state.lastMove)
    const decay = Math.pow(.94, idle / 16.67)
    state.vx *= decay
    state.vy *= decay
    state.suppressClick = true
    window.setTimeout(() => { state.suppressClick = false }, 100)
    coast()
  } else {
    state.vx = 0
    state.vy = 0
  }
}
function onClickCapture(event) {
  if (!state.suppressClick) return
  event.preventDefault()
  event.stopImmediatePropagation()
  state.suppressClick = false
}
function onWheel(event) {
  if (event.ctrlKey || dragging.value) return
  event.preventDefault()
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.value.clientHeight : 1
  const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit
  const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit
  state.vx = Math.max(-45, Math.min(45, state.vx - dx * .12))
  state.vy = Math.max(-45, Math.min(45, state.vy - dy * .12))
  coast()
}
onMounted(() => {
  const node = viewport.value
  panX.value = wrap(props.initialX ?? -(props.worldWidth - node.clientWidth) / 2, props.worldWidth)
  panY.value = wrap(props.initialY ?? -(props.worldHeight - node.clientHeight) / 2, props.worldHeight)
})
onUnmounted(() => cancelAnimationFrame(state.frame))
defineExpose({ viewport, panX, panY })
</script>

<template>
  <div ref="viewport" class="infinite-canvas-viewport" :class="{ 'infinite-canvas-dragging': dragging }" @wheel="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerEnd" @pointercancel="onPointerEnd" @click.capture="onClickCapture">
    <div v-for="tile in tiles" :key="tile.id" class="infinite-canvas-tile" :style="tileStyle(tile)" :aria-hidden="tile.x || tile.y ? 'true' : undefined">
      <slot />
    </div>
  </div>
</template>
