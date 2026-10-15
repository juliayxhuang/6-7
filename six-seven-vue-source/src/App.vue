<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import NavOverlay from './components/NavOverlay.vue'
import GuideCanvas from './components/GuideCanvas.vue'
import CursorImageTrail from './components/CursorImageTrail.vue'
import AboutBlendText from './components/AboutBlendText.vue'
import GlossaryText from './components/GlossaryText.vue'
import publication from './data/publication.json'
import footerSource from './data/ascii-hands-footer.txt?raw'
import maverickArt from './data/ascii-home/ascii-maverick-trevillain.txt?raw'
import lameloArt from './data/ascii-home/ascii-lamelo-ball.txt?raw'
import cynthiaArt from './data/ascii-home/ascii-cynthia-gordon.txt?raw'
import homerArt from './data/ascii-home/ascii-homer-simpson.txt?raw'

const names = { kaitlyn: 'Kaitlyn', yui: 'Yui', audrey: 'Audrey', madhu: 'Madhu' }
const homeTabs = [ ['what', 'What is 6-7?'], ['belonging', 'Language for Belonging'], ['bleaching', 'Semantic Bleaching'] ]
const paragraphColors = {
  what: { 4: 'text-cyan', 7: 'text-cyan' },
  belonging: { 1: 'text-cyan', 8: 'text-cyan', 9: 'text-lime', 12: 'text-lime', 15: 'text-lime', 18: 'text-lime', 20: 'text-lime' },
  bleaching: { 1: 'text-cyan', 2: 'text-lime', 11: 'text-cyan' }
}
const glossaryIndex = new Map(publication.glossary.map((item, index) => [item.term.toLocaleLowerCase(), index]))
const homeMedia = [
  { key: 'maverick', art: maverickArt, caption: [{ label: '#MaverickTrevillian', term: 'Maverick Trevillian' }, { label: '#67Kid' }] },
  { key: 'lamelo', art: lameloArt, caption: [{ label: '#LaMeloBall', term: 'Lamelo Ball' }, { label: '#6\'7"' }, { label: '#Basketball' }] },
  { key: 'cynthia', art: cynthiaArt, caption: [{ label: '#CynthiaGordon', term: 'Cynthia Gordon' }, { label: '#Linguistics', term: 'Linguistics' }, { label: '#Professor' }] },
  { key: 'homer', art: homerArt, caption: [{ label: '#HomerSimpson', term: 'Homer Simpson' }, { label: '#TheSimpsons', term: 'The Simpsons' }, { label: '#Doh', term: 'Doh' }] }
]
function initialRoute() {
  const [page, detail] = location.hash.slice(1).split('/')
  return { page: ['home', 'guide', 'interviews', 'credits'].includes(page) ? page : 'home', detail: detail || '' }
}
const route = reactive(initialRoute())
const entered = ref(false)
const cursorVisual = ref(null)
const navOpen = ref(false)
const controlsOpen = ref(false)
const footerActive = ref(false)
const footerClipTop = ref('100dvh')
const selectedGlossary = ref(null)
const bibliographyOpen = ref(route.detail === 'bibliography')
let bibliographyOpenedAt = 0
let bibliographyLeaveTimer = 0
let glossaryWiggleFrame = 0
let lastPointer = null
const hideImages = ref(false)
const photoFootprints = ref([])
try { hideImages.value = localStorage.getItem('six-seven-hide-images') === 'true' } catch {}
watch(hideImages, value => { try { localStorage.setItem('six-seven-hide-images', String(value)) } catch {} })
const feedScroll = ref(null)
const glossaryScroll = ref(null)
const cameraVideo = ref(null)
const cameraCanvas = ref(null)
const accessInput = ref(null)
const gatewayMode = ref('camera')
const typedAccess = ref('')
const requiredGestures = 7
const cameraStatus = ref('0/7')
let stream = null, detector = null, raf = 0
let entryTimer = 0
const gesture = { last: 0, changes: 0, lastAt: 0 }
const handSegments = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[17,0]]
const footerArt = (() => {
  const lines = footerSource.replace(/\r/g, '').split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.search(/\S/)))
  return lines.map(line => line.slice(indent).trimEnd()).join('\n')
})()

const currentPerson = computed(() => names[route.detail] ? route.detail : 'kaitlyn')
const homeArticles = computed(() => [
  { key: 'what', title: 'What is 6-7?', paragraphs: publication.what },
  { key: 'belonging', title: 'Language for Belonging', paragraphs: publication.belonging },
  { key: 'bleaching', title: 'Semantic Bleaching', paragraphs: [...publication.bleaching, ...publication.bleaching_cont] }
])
const transcript = computed(() => publication[currentPerson.value] || [])
const interviewExchanges = computed(() => {
  const lines = transcript.value.map(speakerLine)
  return Array.from({ length: Math.ceil(lines.length / 2) }, (_, index) => ({ question: lines[index * 2], answer: lines[index * 2 + 1] }))
})
const interviewDirection = computed(() => ['yui', 'madhu'].includes(currentPerson.value) ? 'reverse' : 'forward')
const bibliographyEntries = computed(() => {
  const source = publication.bibliography.join(' ')
  const entries = []
  const links = /https?:\/\/\S+/g
  let start = 0
  for (const match of source.matchAll(links)) {
    entries.push(source.slice(start, match.index + match[0].length).trim())
    start = match.index + match[0].length
  }
  if (source.slice(start).trim()) entries.push(source.slice(start).trim())
  return entries
})

function revealCaptionTerm(term) {
  const index = glossaryIndex.get(term.toLocaleLowerCase())
  if (index !== undefined) revealGlossary(index)
}

function navigate(page, detail = '') {
  route.page = page
  route.detail = detail || (page === 'interviews' ? 'kaitlyn' : '')
  navOpen.value = false
  controlsOpen.value = false
  footerActive.value = false
  bibliographyOpen.value = page === 'credits' && detail === 'bibliography'
  const hash = route.detail ? `${page}/${route.detail}` : page
  history.replaceState(null, '', `#${hash}`)
  nextTick(() => {
    const scroller = feedScroll.value?.parentElement
    if (!scroller) return
    const target = detail && document.getElementById(page === 'guide' ? `guide-${detail}` : `section-${detail}`)
    scroller.scrollTop = target ? scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 76 : 0
  })
}
function onLayoutScroll(event) {
  footerActive.value = route.page === 'home' && event.target.scrollTop > 0
  if (route.page === 'home') {
    const footerTop = event.target.querySelector('.site-footer')?.getBoundingClientRect().top ?? window.innerHeight
    footerClipTop.value = `${Math.max(0, Math.min(window.innerHeight, footerTop))}px`
  }
  if (footerActive.value) controlsOpen.value = false
}
function openBibliography() {
  bibliographyOpen.value = true
  bibliographyOpenedAt = performance.now()
  clearTimeout(bibliographyLeaveTimer)
  bibliographyLeaveTimer = setTimeout(checkBibliographyLeave, 450)
  history.replaceState(null, '', '#credits/bibliography')
}
function closeBibliography() {
  if (!bibliographyOpen.value) return
  bibliographyOpen.value = false
  clearTimeout(bibliographyLeaveTimer)
  history.replaceState(null, '', '#credits')
}
function checkBibliographyLeave() {
  if (!bibliographyOpen.value || !lastPointer || performance.now() - bibliographyOpenedAt < 400) return
  const bounds = document.getElementById('bibliographyDrawer')?.getBoundingClientRect()
  if (bounds && (lastPointer.x < bounds.left || lastPointer.x >= bounds.right || lastPointer.y < bounds.top || lastPointer.y >= bounds.bottom)) closeBibliography()
}
function onBibliographyPointerMove(event) {
  if (event.pointerType === 'touch') return
  lastPointer = { x: event.clientX, y: event.clientY }
  if (cursorVisual.value) {
    cursorVisual.value.style.left = `${event.clientX}px`
    cursorVisual.value.style.top = `${event.clientY}px`
    cursorVisual.value.style.visibility = 'visible'
  }
  checkBibliographyLeave()
}
function onPointerOut(event) { if (!event.relatedTarget && cursorVisual.value) cursorVisual.value.style.visibility = 'hidden' }
function revealGlossary(index) {
  const scroller = glossaryScroll.value?.parentElement
  const row = document.getElementById(`glossary-${index}`)
  if (!scroller || !row) return
  const targetTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 14))
  scroller.scrollTo({ top: targetTop, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  document.querySelector('.glossary-item.glossary-wiggle')?.classList.remove('glossary-wiggle')
  selectedGlossary.value = index
  cancelAnimationFrame(glossaryWiggleFrame)
  if (index === 65 || index === 5) {
    const started = performance.now()
    let settledFrames = 0
    const tiltWhenVisible = () => {
      if (selectedGlossary.value !== index) return
      settledFrames = Math.abs(scroller.scrollTop - targetTop) < 2 ? settledFrames + 1 : 0
      if ((performance.now() - started > 120 && settledFrames >= 4) || performance.now() - started > 4000) {
        row.classList.remove('glossary-wiggle')
        void row.offsetWidth
        row.classList.add('glossary-wiggle')
      } else glossaryWiggleFrame = requestAnimationFrame(tiltWhenVisible)
    }
    glossaryWiggleFrame = requestAnimationFrame(tiltWhenVisible)
  }
}
function speakerLine(line) {
  const match = line.match(/^(JH|KH|YK|MU|AY):\s*/)
  return match ? { speaker: `${match[1]}:`, answer: match[1] !== 'JH', text: line.slice(match[0].length) } : { speaker: '', answer: false, text: line }
}

const defaults = { paragraphSizePt: 16, glossarySizePt: 11, headerSizePt: 72, tracking: 0, lineHeight: 1, paragraphSpacing: 1.1, opacity: 100, contrast: 100, saturation: 2, imageSize: 100, imageColor: 0, imageSpacing: 200, cursorSize: 1 }
const controls = [
  { key: 'paragraphSizePt', label: 'Paragraph (pt)', min: 10, max: 36, step: 1 },
  { key: 'glossarySizePt', label: 'Glossary (pt)', min: 8, max: 24, step: 1 },
  { key: 'headerSizePt', label: 'Headers (pt)', min: 36, max: 144, step: 1 },
  { key: 'tracking', label: 'Tracking', min: 0, max: 8, step: .25, decimals: 2 },
  { key: 'lineHeight', label: 'Line height', min: .8, max: 2, step: .02, decimals: 2 },
  { key: 'paragraphSpacing', label: 'Paragraph gap', min: .3, max: 2.5, step: .05, decimals: 2 },
  { key: 'opacity', label: 'Opacity (%)', min: 40, max: 100, step: 1 },
  { key: 'contrast', label: 'Contrast (%)', min: 70, max: 160, step: 1 },
  { key: 'saturation', label: 'Saturation (%)', min: 0, max: 3, step: 1 },
  { key: 'cursorSize', label: 'Cursor size', min: 1, max: 3, step: 1 },
  { key: 'imageSize', label: 'Image size', min: 50, max: 200, step: 10, aboutOnly: true },
  { key: 'imageColor', label: 'Image color', min: 0, max: 2, step: 1, aboutOnly: true },
  { key: 'imageSpacing', label: 'Frequency', min: 100, max: 300, step: 20, aboutOnly: true }
]
const visibleControls = computed(() => controls.filter(control => !control.aboutOnly || route.page === 'credits'))
const typeParams = reactive({ ...defaults })
const aboutPhotoFootprints = computed(() => typeParams.imageColor === 2 ? [] : photoFootprints.value)
watch([entered, () => typeParams.cursorSize], ([isEntered, size]) => {
  const finePointer = isEntered && matchMedia('(pointer:fine)').matches
  document.body.classList.toggle('large-cursor-enabled', finePointer && size === 2)
  document.body.classList.toggle('custom-cursor-enabled', finePointer && size === 3)
}, { immediate: true })
try {
  const current = localStorage.getItem('six-seven-type-v6')
  const previous = localStorage.getItem('six-seven-type-v5')
  const saved = JSON.parse(current || previous || localStorage.getItem('six-seven-type-v4') || '{}')
  if (!current && ((previous && saved.glossarySizePt === 10) || (!previous && saved.glossarySizePt === 12))) saved.glossarySizePt = 11
  for (const control of controls) {
    const value = Number(saved[control.key])
    if (Number.isFinite(value) && saved[control.key] !== undefined) typeParams[control.key] = Math.max(control.min, Math.min(control.max, value))
  }
  typeParams.paragraphSizePt = Math.round(typeParams.paragraphSizePt)
  typeParams.glossarySizePt = Math.round(typeParams.glossarySizePt)
} catch {}
function updateControl(control, raw) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  const stepped = control.min + Math.round((Math.max(control.min, Math.min(control.max, value)) - control.min) / control.step) * control.step
  typeParams[control.key] = Number(stepped.toFixed(2))
}
function displayControl(control) {
  if (control.key === 'saturation') return ['B&W', 'Low', 'Med', 'High'][typeParams.saturation]
  if (control.key === 'imageSize') return `${typeParams.imageSize}%`
  if (control.key === 'imageColor') return ['Reg', 'Inverted', 'B&W'][typeParams.imageColor]
  if (control.key === 'imageSpacing') return `${typeParams.imageSpacing}px`
  if (control.key === 'cursorSize') return ({ 1: 'Reg', 2: 'Large', 3: '67' })[typeParams.cursorSize]
  return control.decimals ? Number(typeParams[control.key]).toFixed(control.decimals) : String(Math.round(typeParams[control.key]))
}
function applyTypography() {
  const root = document.documentElement
  root.style.setProperty('--body-size', `${typeParams.paragraphSizePt}pt`)
  root.style.setProperty('--glossary-size', `${typeParams.glossarySizePt}pt`)
  root.style.setProperty('--header-size', `${typeParams.headerSizePt}pt`)
  root.style.setProperty('--sub-size', `${typeParams.headerSizePt / 2}pt`)
  root.style.setProperty('--leading', typeParams.lineHeight)
  root.style.setProperty('--tracking', `${typeParams.tracking}px`)
  root.style.setProperty('--paragraph-gap', `${typeParams.paragraphSpacing}em`)
  root.style.setProperty('--ink-opacity', typeParams.opacity / 100)
  root.style.setProperty('--contrast', typeParams.contrast / 100)
  root.style.setProperty('--saturation-factor', [0, .55, 1, 1.6][typeParams.saturation])
  document.getElementById('app')?.classList.toggle('six-seven-tilt', entered.value && typeParams.headerSizePt === 67)
  try { localStorage.setItem('six-seven-type-v6', JSON.stringify(typeParams)) } catch {}
}
watch(typeParams, applyTypography, { deep: true, immediate: true })

function stopCamera() {
  cancelAnimationFrame(raf)
  detector?.close?.(); detector = null
  stream?.getTracks().forEach(track => track.stop()); stream = null
  if (cameraVideo.value) cameraVideo.value.srcObject = null
}
function enter() { stopCamera(); navigate(route.page, route.detail); entered.value = true; applyTypography(); nextTick(() => feedScroll.value?.focus({ preventScroll: true })) }
function showTypingGateway() {
  stopCamera()
  gatewayMode.value = 'typing'
  nextTick(() => accessInput.value?.focus())
}
function onGatewayInput() {
  clearTimeout(entryTimer)
  const phrase = typedAccess.value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
  if (phrase === 'sixseven' || phrase === '67') entryTimer = window.setTimeout(() => {
    if (!entered.value && gatewayMode.value === 'typing') enter()
  }, 900)
}
function backToTop() {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  document.querySelector('.layout-wrapper.home')?.scrollTo({ top: 0, behavior: motion })
  document.querySelectorAll('.layout-wrapper.home .column').forEach(column => column.scrollTo({ top: 0, behavior: motion }))
}
function drawHands(hands) {
  const canvas = cameraCanvas.value
  if (!canvas) return
  const width = window.innerWidth
  const height = window.innerHeight
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const backingWidth = Math.round(width * ratio)
  const backingHeight = Math.round(height * ratio)
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth
    canvas.height = backingHeight
  }
  const context = canvas.getContext('2d')
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const stageWidth = Math.min(width, height * 4 / 3)
  const stageLeft = (width - stageWidth) / 2
  for (const hand of hands) {
    const points = hand.map(point => ({ x: Math.round(stageLeft + (1 - point.x) * stageWidth), y: Math.round(point.y * height) }))
    context.fillStyle = '#ffffff'
    for (const [start, end] of handSegments) {
      const from = points[start], to = points[end]
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.floor(distance / 7))
      for (let step = 0; step <= steps; step++) {
        const x = Math.round(from.x + (to.x - from.x) * step / steps)
        const y = Math.round(from.y + (to.y - from.y) * step / steps)
        context.fillRect(x - 1, y - 1, 3, 3)
      }
    }
    context.fillStyle = '#a6ce38'
    for (const point of points) {
      context.fillRect(point.x - 5, point.y - 5, 10, 10)
    }
  }
}
function detectGesture(result, now) {
  const hands = result.landmarks || []
  drawHands(hands)
  if (hands.length < 2) { gesture.last = 0; cameraStatus.value = `${gesture.changes}/${requiredGestures}`; return }
  const sorted = [...hands].sort((a, b) => a[0].x - b[0].x)
  const left = sorted[0][0], right = sorted[1][0]
  const separation = Math.abs(left.x - right.x), difference = left.y - right.y
  if (separation < .15 || Math.abs(difference) < .075) return
  const sign = Math.sign(difference)
  if (gesture.last && sign !== gesture.last && now - gesture.lastAt > 180) {
    gesture.changes += 1
    gesture.lastAt = now
    if (gesture.changes >= requiredGestures) { cameraStatus.value = 'ACCESS GRANTED'; enter(); return }
  }
  if (!gesture.last) gesture.lastAt = now
  gesture.last = sign
  cameraStatus.value = `${Math.min(gesture.changes, requiredGestures)}/${requiredGestures}`
}
function cameraFrame() {
  if (!stream || !detector || !cameraVideo.value) return
  if (cameraVideo.value.readyState >= 2) {
    try { detectGesture(detector.detectForVideo(cameraVideo.value, performance.now()), performance.now()) }
    catch { showTypingGateway(); return }
  }
  raf = requestAnimationFrame(cameraFrame)
}
async function startCamera() {
  gatewayMode.value = 'camera'
  cameraStatus.value = `0/${requiredGestures}`
  await nextTick()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
    if (entered.value || gatewayMode.value !== 'camera') { stopCamera(); return }
    cameraVideo.value.srcObject = stream
    await cameraVideo.value.play()
  } catch { showTypingGateway(); return }
  try {
    const { FilesetResolver, HandLandmarker } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm')
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm')
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
    try { detector = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 }) }
    catch { detector = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2 }) }
    if (entered.value || gatewayMode.value !== 'camera') { stopCamera(); return }
    cameraStatus.value = `0/${requiredGestures}`
    cameraFrame()
  } catch { showTypingGateway() }
}
function onKey(event) {
  if (!entered.value && gatewayMode.value === 'camera' && event.key === 'Escape') { showTypingGateway(); return }
  if (event.key === 'Escape') { navOpen.value = false; controlsOpen.value = false; closeBibliography() }
}
function onOutsideControlsPointerDown(event) {
  if (controlsOpen.value && event.target instanceof Element && !event.target.closest('#typePanel, #typeButton')) controlsOpen.value = false
}
function onHash() {
  const { page, detail } = initialRoute()
  navigate(page, detail)
}
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onOutsideControlsPointerDown); window.addEventListener('hashchange', onHash); window.addEventListener('pointermove', onBibliographyPointerMove); window.addEventListener('pointerout', onPointerOut); applyTypography(); if (new URLSearchParams(location.search).has('no-camera')) showTypingGateway(); else startCamera() })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOutsideControlsPointerDown); window.removeEventListener('hashchange', onHash); window.removeEventListener('pointermove', onBibliographyPointerMove); window.removeEventListener('pointerout', onPointerOut); document.body.classList.remove('custom-cursor-enabled', 'large-cursor-enabled'); clearTimeout(bibliographyLeaveTimer); clearTimeout(entryTimer); cancelAnimationFrame(glossaryWiggleFrame); stopCamera() })
</script>

<template>
  <section v-if="!entered" class="gateway" aria-label="Entry screen">
    <video ref="cameraVideo" class="gateway-source-video" autoplay muted playsinline aria-hidden="true"></video>
    <template v-if="gatewayMode === 'camera'"><canvas ref="cameraCanvas" class="gateway-hand-canvas" aria-label="Hand pose tracker"></canvas><div class="gateway-count" role="status">{{ cameraStatus }}</div></template>
    <div v-else class="gateway-typing" @click="accessInput?.focus()"><div class="gateway-prompt">Doot Doot...</div><div class="gateway-type-line"><input ref="accessInput" v-model="typedAccess" class="gateway-type-capture" type="text" aria-label="Type six seven to enter" autocomplete="off" autocapitalize="off" spellcheck="false" @input="onGatewayInput"><span aria-hidden="true">{{ typedAccess }}<span class="gateway-underscore">_</span></span></div></div>
  </section>

  <template v-else>
    <NavOverlay :open="navOpen" :route="route.page" :cursor-size="typeParams.cursorSize" @close="navOpen = false" @navigate="navigate($event)" @scroll="onLayoutScroll">
      <template #column-1>
        <aside v-if="route.page !== 'credits'" ref="glossaryScroll" class="rail" aria-label="Glossary"><div class="glossary-list"><article v-for="(item, index) in publication.glossary" :id="`glossary-${index}`" :key="index" class="glossary-item" :class="{ 'glossary-selected': selectedGlossary === index }"><span class="number">{{ index === 5 ? '#6/7' : `#${index < 5 ? index + 1 : index + 2}` }}</span><div><span class="term">{{ item.term }}</span> <span class="definition">{{ item.definition }}</span></div></article></div></aside>
      </template>
      <template #column-2>
        <section ref="feedScroll" class="feed" aria-label="Publication text" tabindex="-1">
          <nav v-if="route.page === 'home'" class="page-tabs" aria-label="Sections on this page"><button v-for="[key, label] in homeTabs" :key="key" type="button" :class="{ active: (route.detail || 'what') === key }" :aria-current="(route.detail || 'what') === key ? 'page' : undefined" @click="navigate('home', key)">{{ label }}</button></nav>
          <template v-if="route.page === 'home'"><article v-for="item in homeArticles" :id="`section-${item.key}`" :key="item.key" class="feed-article"><h1 v-if="item.key === 'what'">{{ item.title }}</h1><h2 v-else>{{ item.title }}</h2><p v-for="(paragraph, index) in item.paragraphs" :key="index" :class="paragraphColors[item.key]?.[index + 1]"><GlossaryText :text="paragraph" @reveal="revealGlossary" /></p></article></template>

          <template v-else-if="route.page === 'interviews'">
            <header class="interview-intro"><h1>Interviews</h1><nav class="interview-names" aria-label="Interview participants"><button v-for="(label, key, index) in names" :key="key" type="button" :class="{ active: currentPerson === key }" :style="{ '--name-step': index }" :aria-current="currentPerson === key ? 'page' : undefined" @click="navigate('interviews', key)">{{ label }}</button></nav></header>
            <article class="interview-transcript" :class="`interview-${interviewDirection}`"><div v-for="(exchange, index) in interviewExchanges" :key="index" class="interview-exchange" :style="{ '--exchange-step': 2 * index / Math.max(1, interviewExchanges.length - 1) }"><p v-if="exchange.question"><span v-if="exchange.question.speaker" class="speaker speaker-question">{{ exchange.question.speaker }}</span> <GlossaryText :text="exchange.question.text" @reveal="revealGlossary" /></p><p v-if="exchange.answer" class="interview-answer"><span v-if="exchange.answer.speaker" class="speaker speaker-answer">{{ exchange.answer.speaker }}</span> <GlossaryText :text="exchange.answer.text" @reveal="revealGlossary" /></p></div></article>
          </template>

          <template v-else><section id="section-note" class="about-section"><div class="about-intro"><AboutBlendText as="h1" text="About" :photos="aboutPhotoFootprints" /><AboutBlendText v-for="(paragraph, index) in publication.colophon.slice(0, 2)" :key="index" :text="paragraph" :photos="aboutPhotoFootprints" /></div><div class="about-credits"><AboutBlendText v-for="(paragraph, index) in publication.colophon.slice(2)" :key="index" :text="paragraph" :photos="aboutPhotoFootprints" /></div></section></template>

        </section>
      </template>
      <template #column-3>
        <aside v-if="route.page === 'home'" class="media home-media" aria-label="ASCII portraits"><template v-if="!hideImages"><figure v-for="item in homeMedia" :key="item.key" class="ascii-portrait"><pre aria-hidden="true">{{ item.art }}</pre><figcaption><template v-for="(tag, index) in item.caption" :key="index"><button v-if="tag.term" type="button" class="ascii-caption-term" :aria-label="`${tag.term} — find in glossary`" @click="revealCaptionTerm(tag.term)">{{ tag.label }}</button><span v-else>{{ tag.label }}</span><span v-if="index < item.caption.length - 1">&nbsp;</span></template></figcaption></figure></template></aside>
      </template>
      <template #guide><GuideCanvas v-if="route.page === 'guide'" :hide-images="hideImages" /></template>
      <template #footer><footer v-if="route.page === 'home'" class="site-footer" :style="{ '--footer-clip-top': footerClipTop }" aria-label="6-7 ASCII hands"><div class="footer-action-stick"><button class="footer-back-to-top" type="button" @click="backToTop">Back to top</button></div><div class="footer-art-stick"><pre class="footer-art" aria-hidden="true">{{ footerArt }}</pre></div></footer></template>
    </NavOverlay>

    <CursorImageTrail v-if="route.page === 'credits' && !navOpen && !hideImages" :image-size="typeParams.imageSize" :image-color="typeParams.imageColor" :image-spacing="typeParams.imageSpacing" @stamps-change="photoFootprints = $event" />
    <template v-if="route.page === 'credits' && !navOpen"><button v-if="!bibliographyOpen" class="bibliography-edge" type="button" aria-label="Open bibliography" :aria-expanded="bibliographyOpen" aria-controls="bibliographyDrawer" @mouseenter="openBibliography" @click="openBibliography"></button><aside id="bibliographyDrawer" class="bibliography-drawer" :class="{ open: bibliographyOpen }" :aria-hidden="!bibliographyOpen" aria-label="Bibliography" @mouseleave="closeBibliography"><h1>Bibliography</h1><p v-for="(entry, index) in bibliographyEntries" :key="index">{{ entry }}</p></aside></template>
    <div v-if="!navOpen && !footerActive" class="floating-actions" :class="{ 'light-surface': route.page === 'credits' || route.page === 'interviews', 'panel-open': controlsOpen }"><button id="menuButton" type="button" aria-label="Open navigation" :aria-expanded="navOpen" aria-controls="navOverlay" @click="controlsOpen = false; navOpen = true">#</button><button id="typeButton" type="button" aria-label="Typography and accessibility controls" :aria-expanded="controlsOpen" aria-controls="typePanel" @click="controlsOpen = !controlsOpen">+</button></div>
    <Transition name="controls-drawer"><section v-if="controlsOpen && !navOpen" id="typePanel" class="type-panel" aria-label="Typography controls"><h2 class="controls-title">Controls</h2><div class="controls-list"><div v-for="control in visibleControls" :key="control.key" class="control-row"><label :for="`control-${control.key}`">{{ control.label }}</label><input :id="`control-${control.key}`" class="control-slider" type="range" :min="control.min" :max="control.max" :step="control.step" :value="typeParams[control.key]" @input="updateControl(control, $event.target.value)"><output v-if="['saturation', 'cursorSize', 'imageSize', 'imageColor', 'imageSpacing'].includes(control.key)" class="control-value">{{ displayControl(control) }}</output><input v-else class="control-value" type="number" :min="control.min" :max="control.max" :step="control.step" :value="displayControl(control)" :aria-label="`${control.label} value`" @change="updateControl(control, $event.target.value)" @blur="updateControl(control, $event.target.value)" @keydown.enter="updateControl(control, $event.target.value); $event.target.blur()"></div></div><label class="hide-images-control"><input type="checkbox" v-model="hideImages"><span>Hide images</span></label><button class="controls-reset" type="button" @click="Object.assign(typeParams, defaults); hideImages = false">Reset</button></section></Transition>
    <Teleport to="body"><div v-if="typeParams.cursorSize === 3" ref="cursorVisual" class="custom-cursor size-3" aria-hidden="true">67</div></Teleport>
  </template>
</template>
