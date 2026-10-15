<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ as: { type: String, default: 'p' }, text: { type: String, required: true }, photos: { type: Array, default: () => [] } })
const element = ref(null)
const bounds = ref(null)
let observer

function updateBounds() {
  const rect = element.value?.getBoundingClientRect()
  if (rect) bounds.value = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
}

const overlays = computed(() => {
  if (!bounds.value) return []
  return props.photos.filter(photo => {
    const xs = photo.corners.map(([x]) => x)
    const ys = photo.corners.map(([, y]) => y)
    return Math.max(...xs) > bounds.value.left && Math.min(...xs) < bounds.value.right && Math.max(...ys) > bounds.value.top && Math.min(...ys) < bounds.value.bottom
  }).map(photo => ({
    id: photo.id,
    phase: photo.phase,
    clipPath: `polygon(${photo.corners.map(([x, y]) => `${x - bounds.value.left}px ${y - bounds.value.top}px`).join(',')})`
  }))
})

onMounted(() => {
  updateBounds()
  observer = new ResizeObserver(updateBounds)
  observer.observe(element.value)
  window.addEventListener('resize', updateBounds)
  document.addEventListener('scroll', updateBounds, true)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateBounds)
  document.removeEventListener('scroll', updateBounds, true)
})
</script>

<template>
  <component :is="as" ref="element" class="about-blend-text">
    {{ text }}
    <span v-for="overlay in overlays" :key="overlay.id" class="about-blend-white" :class="`is-${overlay.phase}`" :style="{ clipPath: overlay.clipPath }" aria-hidden="true">{{ text }}</span>
  </component>
</template>
