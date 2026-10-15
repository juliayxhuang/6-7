<script setup>
import { computed, ref } from 'vue'
import InfiniteCanvas from './InfiniteCanvas.vue'
import publication from '../data/publication.json'
import scuba from '../data/ascii-guide/ascii-scuba.txt?raw'
import floss from '../data/ascii-guide/ascii-floss.txt?raw'
import ballerina from '../data/ascii-guide/ascii-ballerina-cappucina.txt?raw'
import brr from '../data/ascii-guide/ascii-brr-brr-patapim.txt?raw'
import dab from '../data/ascii-guide/ascii-dab.txt?raw'
import tung from '../data/ascii-guide/ascii-tung-tung-tung-sahur.txt?raw'
import gangnam from '../data/ascii-guide/ascii-gangnam-style.txt?raw'
import griddy from '../data/ascii-guide/ascii-griddy.txt?raw'
import renegade from '../data/ascii-guide/ascii-renegade.txt?raw'
import bombardino from '../data/ascii-guide/ascii-bombardino-crocodilo.txt?raw'
import tralalero from '../data/ascii-guide/ascii-tralalero-tralala.txt?raw'

defineProps({ hideImages: Boolean })
const worldWidth = 2650
const worldHeight = 1810
const pinned = ref([])
const hoverSuppressed = ref([])
const isLayoutMode = ref(false)
const showAllHoverStates = ref(false)
const showLayoutTools = new URLSearchParams(window.location.search).has('layout-mode')
const layoutPositions = ref({})
const layoutOffsets = ref({})
const activeDragId = ref('')
const copyStatus = ref('')
const definitions = new Map(publication.glossary.map(item => [item.term.toLowerCase(), item.definition]))
const art = [
  { name: 'Scuba', image: scuba, x: 612, y: 136, color: 'white', titleX: 208, titleY: 379, titleColor: 'white' },
  { name: 'Floss', image: floss, x: 1886, y: 231, color: 'white', titleX: -53, titleY: -42, titleColor: 'white' },
  { name: 'Ballerina\nCappucina', image: ballerina, x: 976, y: 629, color: 'lime', titleX: 102, titleY: -63, titleColor: 'lime' },
  { name: 'Brr Brr\nPatapim', image: brr, x: 1477, y: 564, color: 'cyan', titleX: -121, titleY: 217, titleColor: 'cyan' },
  { name: 'Dab', image: dab, x: 1567, y: 881, color: 'lime', titleX: 214, titleY: -39, titleColor: 'lime' },
  { name: 'Tung Tung\nTung Sahur', image: tung, x: 315, y: 943, color: 'lime', titleX: 150, titleY: -90, titleColor: 'lime' },
  { name: 'Gangnam Style', image: gangnam, x: 660, y: 1151, color: 'cyan', titleX: 113, titleY: -44, titleColor: 'cyan' },
  { name: 'Griddy', image: griddy, x: 1194, y: 954, color: 'white', titleX: -84, titleY: -40, titleColor: 'white' },
  { name: 'Renegade', image: renegade, x: 1044, y: 1406, color: 'lime', titleX: 192, titleY: -32, titleColor: 'lime' },
  { name: 'Bombardino\nCrocodilo', image: bombardino, x: 1560, y: 1295, color: 'white', titleX: 167, titleY: -74, titleColor: 'white' },
  { name: 'Tralalero Tralala', image: tralalero, x: 2145, y: 1170, color: 'cyan', titleX: -251, titleY: -44, titleColor: 'cyan' }
]
const terms = [
  { label: '322', note: 'This originates in Dota2.\n\nOnce a competition player won $322\nfor betting against his own team.\n\nSo if twitch users spam “322”, it\nimplies that the player may be\nmanipulating the match.', noteWidth: 420, x: 2143, y: 85, noteX: 70, noteY: 48, noteColor: 'white' },
  { label: '1337', note: 'Hacker sp33k for leet', x: 1050, y: 375, noteX: 40, noteY: -17, noteColor: 'white' },
  { label: 'sigma', note: 'a person who is coolly self-assured, independent, and driven', noteWidth: 410, x: 1616, y: 375, noteX: 73, noteY: 44, noteColor: 'cyan' },
  { label: '21', bigReveal: '9 + 10 =', bigColor: 'cyan', bigX: -205, bigY: 1, note: '“You stupid!”\n\n“No I not!”\n\n“What’s 9+10?”\n\n“21”\n\n“You stupid!”', x: 1361, y: 464, noteX: 35, noteY: 48, noteColor: 'white' },
  { label: '420', note: 'In 1971, five high school students – Steve Capper, Dave Reddix, Jeffrey Noel, Larry Schwartz, and Mark Gravich – in San Rafael, California, calling themselves the Waldos because “their chosen hang-out spot was a wall outside the school”, used the term in connection with a 1971 plan to search for an abandoned cannabis crop that they had learned about, based on a treasure map made by the grower. The Waldos designated the Louis Pasteur statue on the grounds of San Rafael High School as their meeting place, and 4:20 p.m. as their meeting time. The Waldos referred to this plan with the phrase “4:20 Louis”. After several failed attempts to find the crop, the group eventually shortened their phrase to simply “4:20”, which ultimately evolved into a code-word that the teens used to mean consuming cannabis.', x: 1831, y: 639, noteX: 79, noteY: 26, noteColor: 'lime' },
  { label: '1738', bigReveal: 'Fetty Wap', bigColor: 'white', bigX: -215, bigY: -56, note: 'Trap Queen\n\nRGF Productions\nRemy Boyz, yah-ah\n1738, ayy', x: 435, y: 705, noteX: -91, noteY: 45, noteColor: 'white' },
  { label: 'aura', note: 'the quality of being impressively\ncool; charming, or appealing;\n\nAura is also used to mean “stylishness”\nor “confident an suave excellence.”', noteWidth: 405, x: 852, y: 915, noteX: -172, noteY: 49, noteColor: 'lime' },
  { label: 'LARP', note: 'Live-action role-play', x: 1932, y: 1012, noteX: 100, noteY: 47, noteColor: 'lime' },
  { label: '69', bigReveal: 'Nice', bigColor: 'white', bigX: 45, bigY: -36, x: 1574, y: 1157, noteX: 90, noteY: 60, noteColor: 'white' },
  { label: 'skibidi toilet', note: 'Skibidi is a gibberish word spread by Skibidi\nToilet, a popular YouTube show featuring\nhuman-headed toilets battling camera-headed\nhumans. It is widely used as a nonsensical\n(and occasionally pejorative) expression and\nmeme online.', noteWidth: 460, x: 171, y: 1261, noteX: 163, noteY: 45, noteColor: 'cyan' },
  { label: 'LMAO', note: 'laughing my ass off', x: 813, y: 1400, noteX: 106, noteY: -15, noteColor: 'white' },
  { label: 'IJBOL', note: 'I just burst out laughing\n\nIJBOL has been in use online since\nat least the late 2000s, but in\nrecent years it has gained slightly\nmore traction (when compared to\nsimilar expressions like LOL and\nLMAO) thanks to K-pop fandom.', noteWidth: 390, x: 1105, y: 1276, noteX: 95, noteY: -153, noteColor: 'cyan' },
  { label: 'LOL', note: 'laugh out loud; laughing out loud\n\nLeague of Legends, a team-based video game', x: 451, y: 1562, noteX: 70, noteY: -62, noteColor: 'white' },
  { label: 'gyatt', note: 'used for “god” as an intensive\nor interjection\n\nan appealingly shapely or\nlarge butt', noteWidth: 350, x: 1371, y: 1625, noteX: 84, noteY: -97, noteColor: 'white' },
  { label: 'rizz', note: 'short for charisma; romantic\nappeal or charm', noteWidth: 340, x: 1923, y: 1438, noteX: 66, noteY: 46, noteColor: 'white' }
]
function noteFor(term) { return term.note || definitions.get((term.lookup || term.label).toLowerCase()) || '[INSERT TEXT HERE]' }
function itemId(kind, item) { return `${kind}:${(kind === 'art' ? item.name : item.label).replace(/\n/g, ' ')}` }
function coordinates(kind, item) { return layoutPositions.value[itemId(kind, item)] || { x: item.x, y: item.y } }
function place(kind, item) { const { x, y } = coordinates(kind, item); return { left: `${x}px`, top: `${y}px`, '--title-x': `${item.titleX || 0}px`, '--title-y': `${item.titleY || 0}px`, '--note-x': `${item.noteX || 0}px`, '--note-y': `${item.noteY || 0}px`, '--big-x': `${item.bigX || 0}px`, '--big-y': `${item.bigY || 0}px` } }
function revealId(kind, item, part) { return `hover:${itemId(kind, item)}:${part}` }
function revealOffset(kind, item, part) {
  return layoutOffsets.value[revealId(kind, item, part)] || { x: item[`${part}X`] || 0, y: item[`${part}Y`] || 0 }
}
function revealPlace(kind, item, part) {
  const { x, y } = revealOffset(kind, item, part)
  return { left: `${x}px`, top: `${y}px`, ...(part === 'note' && item.noteWidth ? { width: `${item.noteWidth}px` } : {}) }
}
function exportedReveal(kind, item, part) {
  const parentId = itemId(kind, item)
  const { x, y } = revealOffset(kind, item, part)
  return { id: revealId(kind, item, part), relativeTo: parentId, left: `${x}px`, top: `${y}px` }
}
const layoutJson = computed(() => JSON.stringify([
  ...art.map(item => ({ id: itemId('art', item), left: `${coordinates('art', item).x}px`, top: `${coordinates('art', item).y}px` })),
  ...terms.map(item => ({ id: itemId('term', item), left: `${coordinates('term', item).x}px`, top: `${coordinates('term', item).y}px` })),
  ...art.map(item => exportedReveal('art', item, 'title')),
  ...terms.flatMap(item => [
    ...(item.bigReveal ? [exportedReveal('term', item, 'big')] : []),
    ...(item.note || item.lookup || !item.bigReveal ? [exportedReveal('term', item, 'note')] : [])
  ])
], null, 2))
function setLayoutMode() {
  isLayoutMode.value = !isLayoutMode.value
  pinned.value = []
  hoverSuppressed.value = []
  copyStatus.value = ''
}
async function copyLayout() {
  try {
    await navigator.clipboard.writeText(layoutJson.value)
    copyStatus.value = 'Copied'
  } catch {
    copyStatus.value = 'Select the JSON below to copy'
  }
}
function onItemClick(key) { if (!isLayoutMode.value) toggle(key) }
let itemDrag = null
let revealDrag = null
function startItemDrag(event, kind, item) {
  if (!isLayoutMode.value || event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  const point = coordinates(kind, item)
  itemDrag = { pointerId: event.pointerId, id: itemId(kind, item), x: event.clientX, y: event.clientY, left: point.x, top: point.y, node: event.currentTarget }
  activeDragId.value = itemDrag.id
  event.currentTarget.setPointerCapture(event.pointerId)
}
function moveItemDrag(event) {
  if (!itemDrag || itemDrag.pointerId !== event.pointerId) return
  const x = Math.round(Math.max(0, Math.min(worldWidth - itemDrag.node.offsetWidth, itemDrag.left + event.clientX - itemDrag.x)))
  const y = Math.round(Math.max(0, Math.min(worldHeight - itemDrag.node.offsetHeight, itemDrag.top + event.clientY - itemDrag.y)))
  layoutPositions.value = { ...layoutPositions.value, [itemDrag.id]: { x, y } }
}
function stopItemDrag(event) {
  if (!itemDrag || itemDrag.pointerId !== event.pointerId) return
  moveItemDrag(event)
  const point = layoutPositions.value[itemDrag.id] || { x: itemDrag.left, y: itemDrag.top }
  console.info('Guide layout:', { id: itemDrag.id, left: `${point.x}px`, top: `${point.y}px` })
  itemDrag = null
  activeDragId.value = ''
}
function startRevealDrag(event, kind, item, part) {
  if (!isLayoutMode.value || event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  const point = revealOffset(kind, item, part)
  revealDrag = { pointerId: event.pointerId, id: revealId(kind, item, part), parentId: itemId(kind, item), kind, item, x: event.clientX, y: event.clientY, left: point.x, top: point.y, node: event.currentTarget }
  activeDragId.value = revealDrag.id
  event.currentTarget.setPointerCapture(event.pointerId)
}
function moveRevealDrag(event) {
  if (!revealDrag || revealDrag.pointerId !== event.pointerId) return
  event.stopPropagation()
  const parent = coordinates(revealDrag.kind, revealDrag.item)
  const x = Math.round(Math.max(-parent.x, Math.min(worldWidth - parent.x - revealDrag.node.offsetWidth, revealDrag.left + event.clientX - revealDrag.x)))
  const y = Math.round(Math.max(-parent.y, Math.min(worldHeight - parent.y - revealDrag.node.offsetHeight, revealDrag.top + event.clientY - revealDrag.y)))
  layoutOffsets.value = { ...layoutOffsets.value, [revealDrag.id]: { x, y } }
}
function stopRevealDrag(event) {
  if (!revealDrag || revealDrag.pointerId !== event.pointerId) return
  moveRevealDrag(event)
  const point = layoutOffsets.value[revealDrag.id] || { x: revealDrag.left, y: revealDrag.top }
  console.info('Guide layout:', { id: revealDrag.id, relativeTo: revealDrag.parentId, left: `${point.x}px`, top: `${point.y}px` })
  revealDrag = null
  activeDragId.value = ''
}
function isPinned(key) { return pinned.value.includes(key) }
function isSuppressed(key) { return hoverSuppressed.value.includes(key) }
function toggle(key) {
  if (isPinned(key)) {
    pinned.value = pinned.value.filter(value => value !== key)
    hoverSuppressed.value = [...hoverSuppressed.value, key]
  } else {
    pinned.value = [...pinned.value, key]
    hoverSuppressed.value = hoverSuppressed.value.filter(value => value !== key)
  }
}
function leave(key) { hoverSuppressed.value = hoverSuppressed.value.filter(value => value !== key) }
</script>

<template>
  <InfiniteCanvas class="guide-viewport" :class="{ 'guide-layout-mode': isLayoutMode, 'force-hover-visible': isLayoutMode || showAllHoverStates }" :world-width="worldWidth" :world-height="worldHeight" aria-label="Guide to Internet Slang canvas">
    <div class="guide-canvas">
      <figure v-for="item in art" v-show="!hideImages || isLayoutMode" :key="item.name" class="guide-art-item" :class="[`guide-${item.color}`, { 'guide-revealed': !isLayoutMode && isPinned(`art:${item.name}`), 'guide-hover-suppressed': isSuppressed(`art:${item.name}`), 'guide-drag-active': activeDragId === itemId('art', item) || activeDragId.startsWith(`hover:${itemId('art', item)}:`) }]" :style="place('art', item)" :data-layout-id="itemId('art', item)" role="button" tabindex="0" :aria-pressed="isPinned(`art:${item.name}`)" :aria-label="item.name.replace('\n', ' ')" @pointerdown="startItemDrag($event, 'art', item)" @pointermove="moveItemDrag" @pointerup="stopItemDrag" @pointercancel="stopItemDrag" @click.stop="onItemClick(`art:${item.name}`)" @keydown.enter.prevent="onItemClick(`art:${item.name}`)" @keydown.space.prevent="onItemClick(`art:${item.name}`)" @mouseleave="leave(`art:${item.name}`)">
        <pre aria-hidden="true">{{ item.image }}</pre>
        <figcaption class="guide-art-title" :class="[`guide-title-${item.titleColor}`, { 'guide-reveal-drag-active': activeDragId === revealId('art', item, 'title') }]" :style="revealPlace('art', item, 'title')" :data-layout-id="revealId('art', item, 'title')" @pointerdown.stop="startRevealDrag($event, 'art', item, 'title')" @pointermove.stop="moveRevealDrag" @pointerup.stop="stopRevealDrag" @pointercancel.stop="stopRevealDrag"><span v-for="line in item.name.split('\n')" :key="line">{{ line }}</span></figcaption>
      </figure>
      <div v-for="term in terms" :key="term.label" class="guide-term-item" :class="{ 'guide-revealed': !isLayoutMode && isPinned(`term:${term.label}`), 'guide-hover-suppressed': isSuppressed(`term:${term.label}`), 'guide-drag-active': activeDragId === itemId('term', term) || activeDragId.startsWith(`hover:${itemId('term', term)}:`) }" :style="place('term', term)" :data-layout-id="itemId('term', term)" role="button" tabindex="0" :aria-pressed="isPinned(`term:${term.label}`)" @pointerdown="startItemDrag($event, 'term', term)" @pointermove="moveItemDrag" @pointerup="stopItemDrag" @pointercancel="stopItemDrag" @click.stop="onItemClick(`term:${term.label}`)" @keydown.enter.prevent="onItemClick(`term:${term.label}`)" @keydown.space.prevent="onItemClick(`term:${term.label}`)" @mouseleave="leave(`term:${term.label}`)">
        <span class="guide-term-label">{{ term.label }}</span>
        <span v-if="term.bigReveal" class="guide-term-big" :class="[`guide-title-${term.bigColor}`, { 'guide-reveal-drag-active': activeDragId === revealId('term', term, 'big') }]" :style="revealPlace('term', term, 'big')" :data-layout-id="revealId('term', term, 'big')" @pointerdown.stop="startRevealDrag($event, 'term', term, 'big')" @pointermove.stop="moveRevealDrag" @pointerup.stop="stopRevealDrag" @pointercancel.stop="stopRevealDrag"><span>{{ term.bigReveal }}</span></span>
        <span v-if="term.note || term.lookup || !term.bigReveal" class="guide-term-note" :class="{ 'guide-reveal-drag-active': activeDragId === revealId('term', term, 'note') }" :style="revealPlace('term', term, 'note')" :data-layout-id="revealId('term', term, 'note')" @pointerdown.stop="startRevealDrag($event, 'term', term, 'note')" @pointermove.stop="moveRevealDrag" @pointerup.stop="stopRevealDrag" @pointercancel.stop="stopRevealDrag"><span v-for="(chunk, index) in noteFor(term).split('\n\n')" :key="index" class="guide-note-chunk"><span class="guide-note-highlight" :class="`guide-note-${term.noteColor}`">{{ chunk }}</span></span></span>
      </div>
    </div>
  </InfiniteCanvas>
  <button type="button" class="guide-eye-toggle" :class="{ 'guide-eye-active': showAllHoverStates }" :aria-label="showAllHoverStates ? 'Hide all hover states' : 'Show all hover states'" :aria-pressed="showAllHoverStates" @click="showAllHoverStates = !showAllHoverStates">
    <svg viewBox="0 0 100 70" aria-hidden="true" focusable="false">
      <template v-if="showAllHoverStates"><path d="M10 28 Q50 -1 90 28" /><circle cx="50" cy="49" r="11" /></template>
      <path v-else d="M10 25 Q50 59 90 25" />
    </svg>
  </button>
  <div v-if="showLayoutTools" class="guide-layout-tools">
    <button type="button" class="guide-layout-toggle" :aria-pressed="isLayoutMode" @click="setLayoutMode">Layout Mode: {{ isLayoutMode ? 'On' : 'Off' }}</button>
    <div v-if="isLayoutMode" class="guide-layout-panel">
      <button type="button" @click="copyLayout">Copy coordinates</button>
      <span aria-live="polite">{{ copyStatus }}</span>
      <small>Hover positions are relative to their parent.</small>
      <textarea readonly :value="layoutJson" aria-label="Guide layout coordinates" @focus="$event.target.select()"></textarea>
    </div>
  </div>
</template>
