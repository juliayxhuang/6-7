<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import NavOverlay from './components/NavOverlay.vue'
import GlossaryText from './components/GlossaryText.vue'
import publication from './data/publication.json'
import asciiArt from './data/ascii-footer.html?raw'

const names = { kaitlyn: 'Kaitlyn H.', yui: 'Yui K.', madhu: 'Madhumita U.', audrey: 'Audrey Y.' }
const homeTabs = [ ['what', 'What is 6-7?'], ['belonging', 'Language for Belonging'], ['bleaching', 'Semantic Bleaching'] ]
const guideTabs = [ ['slang', 'Slang'], ['memes', 'Memes'], ['dance', 'Dance fads'], ['numbers', 'Numbers'] ]
const anchors = { Slang: 'slang', 'Internet meme': 'memes', 'Renegade dance': 'dance', '6-7': 'numbers' }
const paragraphColors = {
  what: { 4: 'text-cyan', 7: 'text-cyan' },
  belonging: { 1: 'text-cyan', 8: 'text-cyan', 9: 'text-lime', 12: 'text-lime', 15: 'text-lime', 18: 'text-lime', 20: 'text-lime' },
  bleaching: { 1: 'text-cyan', 2: 'text-lime', 11: 'text-cyan' }
}
function initialRoute() {
  const [page, detail] = location.hash.slice(1).split('/')
  return { page: ['home', 'guide', 'interviews', 'credits'].includes(page) ? page : 'home', detail: detail || '' }
}
const route = reactive(initialRoute())
const entered = ref(false)
const cursorVisual = ref(null)
const navOpen = ref(false)
const controlsOpen = ref(false)
const selectedGlossary = ref(null)
const bibliographyOpen = ref(route.detail === 'bibliography')
let bibliographyOpenedAt = 0
let bibliographyLeaveTimer = 0
let glossaryWiggleFrame = 0
let lastPointer = null
const hideImages = ref(false)
try { hideImages.value = localStorage.getItem('six-seven-hide-images') === 'true' } catch {}
watch(hideImages, value => { try { localStorage.setItem('six-seven-hide-images', String(value)) } catch {} })
const feedScroll = ref(null)
const glossaryScroll = ref(null)
const cameraVideo = ref(null)
const cameraWrap = ref(false)
const requiredGestures = 7
const cameraStatus = ref('0/7')
const cameraBusy = ref(false)
let stream = null, detector = null, raf = 0
const gesture = { last: 0, changes: 0, lastAt: 0 }

const currentPerson = computed(() => names[route.detail] ? route.detail : 'kaitlyn')
const homeArticles = computed(() => [
  { key: 'what', title: 'What is 6-7?', paragraphs: publication.what },
  { key: 'belonging', title: 'Language for Belonging', paragraphs: publication.belonging },
  { key: 'bleaching', title: 'Semantic Bleaching', paragraphs: [...publication.bleaching, ...publication.bleaching_cont] }
])
const transcript = computed(() => publication[currentPerson.value] || [])
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

function navigate(page, detail = '') {
  route.page = page
  route.detail = detail || (page === 'interviews' ? 'kaitlyn' : '')
  navOpen.value = false
  controlsOpen.value = false
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
  if (index === 65) {
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

const defaults = { paragraphSizePt: 16, glossarySizePt: 12, headerSizePt: 72, tracking: 0, lineHeight: 1, paragraphSpacing: 1.1, opacity: 100, contrast: 100, saturation: 2, cursorSize: 1 }
const controls = [
  { key: 'paragraphSizePt', label: 'Paragraph (pt)', min: 10, max: 36, step: 1 },
  { key: 'glossarySizePt', label: 'Glossary (pt)', min: 8, max: 24, step: 1 },
  { key: 'headerSizePt', label: 'Headers (pt)', min: 36, max: 144, step: 1 },
  { key: 'tracking', label: 'Tracking', min: 0, max: 8, step: .25, decimals: 2 },
  { key: 'lineHeight', label: 'Line height', min: 1, max: 2, step: .02, decimals: 2 },
  { key: 'paragraphSpacing', label: 'Paragraph gap', min: .3, max: 2.5, step: .05, decimals: 2 },
  { key: 'opacity', label: 'Opacity (%)', min: 40, max: 100, step: 1 },
  { key: 'contrast', label: 'Contrast (%)', min: 70, max: 160, step: 1 },
  { key: 'saturation', label: 'Saturation (%)', min: 0, max: 3, step: 1 },
  { key: 'cursorSize', label: 'Cursor size', min: 1, max: 3, step: 1 }
]
const typeParams = reactive({ ...defaults })
watch([entered, () => typeParams.cursorSize], ([isEntered, size]) => {
  const finePointer = isEntered && matchMedia('(pointer:fine)').matches
  document.body.classList.toggle('large-cursor-enabled', finePointer && size === 2)
  document.body.classList.toggle('custom-cursor-enabled', finePointer && size === 3)
}, { immediate: true })
try {
  const saved = JSON.parse(localStorage.getItem('six-seven-type-v4') || '{}')
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
  try { localStorage.setItem('six-seven-type-v4', JSON.stringify(typeParams)) } catch {}
}
watch(typeParams, applyTypography, { deep: true, immediate: true })

function stopCamera() {
  cancelAnimationFrame(raf)
  detector?.close?.(); detector = null
  stream?.getTracks().forEach(track => track.stop()); stream = null
  if (cameraVideo.value) cameraVideo.value.srcObject = null
}
function enter() { stopCamera(); navigate('home'); entered.value = true; applyTypography(); nextTick(() => feedScroll.value?.focus({ preventScroll: true })) }
function detectGesture(result, now) {
  const hands = result.landmarks || []
  if (hands.length < 2) { gesture.changes = 0; gesture.last = 0; cameraStatus.value = `0/${requiredGestures}`; return }
  const sorted = [...hands].sort((a, b) => a[0].x - b[0].x)
  const left = sorted[0][0], right = sorted[1][0]
  const separation = Math.abs(left.x - right.x), difference = left.y - right.y
  if (separation < .15 || Math.abs(difference) < .075) return
  const sign = Math.sign(difference)
  if (gesture.last && sign !== gesture.last && now - gesture.lastAt > 180) {
    gesture.changes = now - gesture.lastAt > 3500 ? 1 : gesture.changes + 1
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
    catch { detector?.close?.(); detector = null; cameraStatus.value = 'GESTURE DETECTOR STOPPED — TRY AGAIN'; cameraBusy.value = false; return }
  }
  raf = requestAnimationFrame(cameraFrame)
}
async function startCamera() {
  cameraBusy.value = true
  cameraWrap.value = true
  cameraStatus.value = 'STARTING CAMERA…'
  await nextTick()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
    if (entered.value) { stopCamera(); return }
    cameraVideo.value.srcObject = stream
    await cameraVideo.value.play()
  } catch (error) {
    stopCamera()
    cameraStatus.value = ({ NotAllowedError: 'CAMERA PERMISSION BLOCKED', NotFoundError: 'NO CAMERA FOUND', NotReadableError: 'CAMERA IS IN USE' })[error?.name] || 'CAMERA COULD NOT START'
    cameraBusy.value = false
    return
  }
  cameraStatus.value = 'CAMERA READY — LOADING GESTURE DETECTOR…'
  try {
    const { FilesetResolver, HandLandmarker } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm')
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm')
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
    try { detector = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 }) }
    catch { detector = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2 }) }
    if (entered.value) { stopCamera(); return }
    cameraStatus.value = `0/${requiredGestures}`
    cameraFrame()
  } catch { cameraStatus.value = 'GESTURE DETECTOR UNAVAILABLE — CHECK CONNECTION'; cameraBusy.value = false }
}
function onKey(event) {
  if (event.key === 'Escape') { navOpen.value = false; controlsOpen.value = false; closeBibliography() }
}
function onHash() {
  const { page, detail } = initialRoute()
  navigate(page, detail)
}
onMounted(() => { document.addEventListener('keydown', onKey); window.addEventListener('hashchange', onHash); window.addEventListener('pointermove', onBibliographyPointerMove); window.addEventListener('pointerout', onPointerOut); applyTypography() })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); window.removeEventListener('pointermove', onBibliographyPointerMove); window.removeEventListener('pointerout', onPointerOut); document.body.classList.remove('custom-cursor-enabled', 'large-cursor-enabled'); clearTimeout(bibliographyLeaveTimer); cancelAnimationFrame(glossaryWiggleFrame); stopCamera() })
</script>

<template>
  <section v-if="!entered" class="gateway" aria-label="Entry screen">
    <div class="gateway-center">
      <button class="gateway-title" type="button" :disabled="cameraBusy" aria-label="What is 6-7? Enable camera for seven gestures" @click="startCamera"><span>What</span><span>is</span><span>6-7?</span></button>
      <div v-if="cameraWrap" class="camera-wrap"><video ref="cameraVideo" autoplay muted playsinline aria-label="Camera preview"></video><div class="camera-guides" aria-hidden="true"><span>6</span><span>7</span></div><div class="camera-status" role="status">{{ cameraStatus }}</div></div>
    </div>
    <button class="gateway-skip" type="button" @click="enter">ENTER WITHOUT CAMERA ↗</button>
  </section>

  <template v-else>
    <NavOverlay :open="navOpen" :route="route.page" :cursor-size="typeParams.cursorSize" @close="navOpen = false" @navigate="navigate($event)">
      <template #column-1>
        <aside v-if="route.page !== 'credits'" ref="glossaryScroll" class="rail" aria-label="Glossary"><div class="glossary-list"><article v-for="(item, index) in publication.glossary" :id="`glossary-${index}`" :key="index" class="glossary-item" :class="{ 'glossary-selected': selectedGlossary === index }"><span class="number">{{ index === 5 ? '#6/7' : `#${index < 5 ? index + 1 : index + 2}` }}</span><div><span class="term">{{ item.term }}</span> <span class="definition">{{ item.definition }}</span></div></article></div></aside>
      </template>
      <template #column-2>
        <section ref="feedScroll" class="feed" aria-label="Publication text" tabindex="-1">
          <nav v-if="route.page === 'home'" class="page-tabs" aria-label="Sections on this page"><button v-for="[key, label] in homeTabs" :key="key" type="button" :class="{ active: (route.detail || 'what') === key }" :aria-current="(route.detail || 'what') === key ? 'page' : undefined" @click="navigate('home', key)">{{ label }}</button></nav>
          <template v-if="route.page === 'home'"><article v-for="item in homeArticles" :id="`section-${item.key}`" :key="item.key" class="feed-article"><h1 v-if="item.key === 'what'">{{ item.title }}</h1><h2 v-else>{{ item.title }}</h2><p v-for="(paragraph, index) in item.paragraphs" :key="index" :class="paragraphColors[item.key]?.[index + 1]"><GlossaryText :text="paragraph" @reveal="revealGlossary" /></p></article></template>

          <template v-else-if="route.page === 'guide'"><nav class="page-tabs" aria-label="Sections on this page"><button v-for="[key, label] in guideTabs" :key="key" type="button" :class="{ active: (route.detail || 'numbers') === key }" @click="navigate('guide', key)">{{ label }}</button></nav><h1>Guide to Internet Slang</h1><article v-for="(item, index) in publication.glossary" :id="anchors[item.term] ? `guide-${anchors[item.term]}` : undefined" :key="index" class="guide-entry"><h2>{{ item.term }}</h2><p><GlossaryText :text="item.definition" @reveal="revealGlossary" /></p></article></template>

          <template v-else-if="route.page === 'interviews'"><nav class="page-tabs" aria-label="Interview participants"><button v-for="(label, key) in names" :key="key" type="button" :class="{ active: currentPerson === key }" @click="navigate('interviews', key)">{{ label }}</button></nav><h1>Interviews</h1><article class="interview-transcript"><p v-for="(line, index) in transcript" :key="index" :class="{ 'interview-answer': speakerLine(line).answer }"><span v-if="speakerLine(line).speaker" class="speaker" :class="speakerLine(line).answer ? 'speaker-answer' : 'speaker-question'">{{ speakerLine(line).speaker }}</span> <GlossaryText :text="speakerLine(line).text" @reveal="revealGlossary" /></p></article></template>

          <template v-else><section id="section-note" class="about-section"><h1>About</h1><p v-for="(paragraph, index) in publication.colophon" :key="index">{{ paragraph }}</p></section></template>

          <footer v-if="route.page === 'home'" class="ascii-footer" aria-label="6-7 ASCII hands"><pre class="ascii-footer-art" aria-hidden="true" v-html="asciiArt"></pre></footer>
        </section>
      </template>
      <template #column-3>
        <aside v-if="route.page === 'home' || route.page === 'guide'" class="media" aria-label="Media and ASCII stream"><template v-for="(label, index) in ['IMAGE PLACEHOLDER / 01', 'IMAGE PLACEHOLDER / 02', 'IMAGE PLACEHOLDER / 03', 'ASCII PLACEHOLDER / 04', 'IMAGE PLACEHOLDER / 05']" :key="index"><div v-if="!hideImages || index === 3" class="media-card" :class="{ cyan: index === 3 }"><span class="block-id">[{{ label }}]</span></div></template></aside>
      </template>
    </NavOverlay>

    <template v-if="route.page === 'credits' && !navOpen"><button v-if="!bibliographyOpen" class="bibliography-edge" type="button" aria-label="Open bibliography" :aria-expanded="bibliographyOpen" aria-controls="bibliographyDrawer" @mouseenter="openBibliography" @click="openBibliography"></button><aside id="bibliographyDrawer" class="bibliography-drawer" :class="{ open: bibliographyOpen }" :aria-hidden="!bibliographyOpen" aria-label="Bibliography" @mouseleave="closeBibliography"><h1>Bibliography</h1><p v-for="(entry, index) in bibliographyEntries" :key="index">{{ entry }}</p></aside></template>
    <div v-if="!navOpen" class="floating-actions" :class="{ 'light-surface': route.page === 'credits' || route.page === 'interviews', 'panel-open': controlsOpen }"><button id="menuButton" type="button" aria-label="Open navigation" :aria-expanded="navOpen" aria-controls="navOverlay" @click="controlsOpen = false; navOpen = true">#</button><button id="typeButton" type="button" aria-label="Typography and accessibility controls" :aria-expanded="controlsOpen" aria-controls="typePanel" @click="controlsOpen = !controlsOpen">+</button></div>
    <Transition name="controls-drawer"><section v-if="controlsOpen && !navOpen" id="typePanel" class="type-panel" aria-label="Typography controls"><h2 class="controls-title">Controls</h2><div class="controls-list"><div v-for="control in controls" :key="control.key" class="control-row"><label :for="`control-${control.key}`">{{ control.label }}</label><input :id="`control-${control.key}`" class="control-slider" type="range" :min="control.min" :max="control.max" :step="control.step" :value="typeParams[control.key]" @input="updateControl(control, $event.target.value)"><output v-if="control.key === 'saturation' || control.key === 'cursorSize'" class="control-value">{{ displayControl(control) }}</output><input v-else class="control-value" type="number" :min="control.min" :max="control.max" :step="control.step" :value="displayControl(control)" :aria-label="`${control.label} value`" @change="updateControl(control, $event.target.value)" @blur="updateControl(control, $event.target.value)" @keydown.enter="updateControl(control, $event.target.value); $event.target.blur()"></div></div><label class="hide-images-control"><input type="checkbox" v-model="hideImages"><span>Hide images</span></label><button class="controls-reset" type="button" @click="Object.assign(typeParams, defaults); hideImages = false">Reset</button></section></Transition>
    <Teleport to="body"><div v-if="typeParams.cursorSize === 3" ref="cursorVisual" class="custom-cursor size-3" aria-hidden="true">67</div></Teleport>
  </template>
</template>
