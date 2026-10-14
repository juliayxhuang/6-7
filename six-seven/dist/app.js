(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = {data: null, route: 'home', section: null, person: null, stream: null, handLandmarker: null, raf: 0, gesture: {last: 0, changes: 0, lastAt: 0}};
  const names = {kaitlyn: 'Kaitlyn H.', yui: 'Yui K.', madhu: 'Madhumita U.', audrey: 'Audrey Y.'};
  const root = document.documentElement;
  const typeDefaults = {paragraphSizePt: 16, glossarySizePt: 12, headerSizePt: 72, tracking: 0, lineHeight: 1, paragraphSpacing: 1.1, opacity: 100, contrast: 100, saturation: 2};
  const typeParams = {...typeDefaults};

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function addParagraphs(target, paragraphs, className = '') {
    for (const paragraph of paragraphs || []) target.append(el('p', className, paragraph));
  }
  function heading(target, value) { target.append(el('h1', '', value)); }
  function pageTabs(target, items, active) {
    const tabs = el('nav', 'page-tabs');
    tabs.setAttribute('aria-label', 'Sections on this page');
    for (const item of items) {
      const button = el('button', item.key === active ? 'active' : '', item.label);
      button.type = 'button';
      button.setAttribute('aria-current', item.key === active ? 'page' : 'false');
      button.addEventListener('click', () => navigate(item.route, item.section, item.person));
      tabs.append(button);
    }
    target.append(tabs);
  }
  const paragraphColors = {
    'section-what': {4: 'text-cyan', 7: 'text-cyan'},
    'section-belonging': {1: 'text-cyan', 8: 'text-cyan', 9: 'text-lime', 12: 'text-lime', 15: 'text-lime', 18: 'text-lime', 20: 'text-lime'},
    'section-bleaching': {1: 'text-cyan', 2: 'text-lime', 11: 'text-cyan'}
  };
  function article(target, id, title, paragraphs, first = false) {
    const section = el('article', 'feed-article');
    section.id = id;
    section.append(el(first ? 'h1' : 'h2', '', title));
    (paragraphs || []).forEach((paragraph, index) => section.append(el('p', paragraphColors[id]?.[index + 1] || '', paragraph)));
    target.append(section);
    return section;
  }
  function escapePattern(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function revealGlossary(index) {
    const rail = $('.rail');
    const row = $(`#glossary-${index}`);
    if (!rail || !row) return;
    rail.scrollTo({top: rail.scrollTop + row.getBoundingClientRect().top - rail.getBoundingClientRect().top - 14, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    row.classList.remove('glossary-flash');
    void row.offsetWidth;
    row.classList.add('glossary-flash');
  }
  function linkGlossaryTerms(feed) {
    const entries = state.data?.glossary || [];
    if (!entries.length) return;
    const lookup = new Map(entries.map((item, index) => [item.term.toLocaleLowerCase(), index]));
    const terms = entries.map(item => item.term).sort((a, b) => b.length - a.length).map(escapePattern);
    const matcher = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.join('|')})(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?:6[-–— ]?7|67)`, 'giu');
    for (const paragraph of feed.querySelectorAll('p')) {
      const source = paragraph.textContent;
      matcher.lastIndex = 0;
      let match, cursor = 0;
      const fragment = document.createDocumentFragment();
      while ((match = matcher.exec(source))) {
        const index = lookup.get(match[0].toLocaleLowerCase()) ?? lookup.get('6-7');
        if (index === undefined) continue;
        fragment.append(document.createTextNode(source.slice(cursor, match.index)));
        const link = el('button', 'glossary-link', match[0]);
        link.type = 'button';
        link.setAttribute('aria-label', `${match[0]} — find in glossary`);
        link.addEventListener('click', () => revealGlossary(index));
        fragment.append(link);
        cursor = match.index + match[0].length;
      }
      if (cursor) {
        fragment.append(document.createTextNode(source.slice(cursor)));
        paragraph.replaceChildren(fragment);
      }
    }
  }
  function renderFeed() {
    const feed = $('#feed');
    feed.replaceChildren();
    if (!state.data) {
      heading(feed, '[CONTENT FILE MISSING]');
      feed.append(el('p', '', '[OPEN THE COMPLETE DIST FOLDER]'));
      return;
    }
    const d = state.data;
    if (state.route === 'home') {
      pageTabs(feed, [
        {key: 'what', label: 'What is 6-7?', route: 'home', section: 'what'},
        {key: 'belonging', label: 'Language for Belonging', route: 'home', section: 'belonging'},
        {key: 'bleaching', label: 'Semantic Bleaching', route: 'home', section: 'bleaching'}
      ], state.section || 'what');
      article(feed, 'section-what', 'What is 6-7?', d.what, true);
      article(feed, 'section-belonging', 'Language for Belonging', d.belonging);
      article(feed, 'section-bleaching', 'Semantic Bleaching', [...d.bleaching, ...d.bleaching_cont]);
    } else if (state.route === 'guide') {
      pageTabs(feed, [
        {key: 'slang', label: 'Slang', route: 'guide', section: 'slang'},
        {key: 'memes', label: 'Memes', route: 'guide', section: 'memes'},
        {key: 'dance', label: 'Dance fads', route: 'guide', section: 'dance'},
        {key: 'numbers', label: 'Numbers', route: 'guide', section: 'numbers'}
      ], state.section || 'numbers');
      heading(feed, 'Guide to Internet Slang');
      for (const item of d.glossary) {
        const section = el('article', 'guide-entry');
        const guideAnchors = {'Slang': 'slang', 'Internet meme': 'memes', 'Renegade dance': 'dance', '6-7': 'numbers'};
        if (guideAnchors[item.term]) section.id = `guide-${guideAnchors[item.term]}`;
        section.append(el('h2', '', item.term), el('p', '', item.definition));
        feed.append(section);
      }
    } else if (state.route === 'interviews') {
      pageTabs(feed, Object.entries(names).map(([key, label]) => ({key, label, route: 'interviews', person: key})), state.person || 'kaitlyn');
      heading(feed, 'Interviews');
      const person = state.person || 'kaitlyn';
      const transcript = el('article', 'interview-transcript');
      transcript.id = `interview-${person}`;
      addParagraphs(transcript, d[person]);
      feed.append(transcript);
    } else if (state.route === 'credits') {
      pageTabs(feed, [
        {key: 'note', label: 'Author’s note', route: 'credits', section: 'note'},
        {key: 'bibliography', label: 'Bibliography', route: 'credits', section: 'bibliography'}
      ], state.section || 'note');
      const note = el('section', 'about-section'); note.id = 'section-note';
      heading(note, 'About'); addParagraphs(note, d.colophon); feed.append(note);
      const bibliography = el('section', 'about-section'); bibliography.id = 'section-bibliography';
      heading(bibliography, 'Bibliography'); addParagraphs(bibliography, d.bibliography); feed.append(bibliography);
    }
    linkGlossaryTerms(feed);
    for (const paragraph of feed.querySelectorAll('.interview-transcript p')) {
      const first = paragraph.firstChild;
      const match = first?.nodeType === Node.TEXT_NODE && first.textContent.match(/^(JH|KH|YK|MU|AY):\s*/);
      if (!match) continue;
      const speaker = el('span', match[1] === 'JH' ? 'speaker speaker-question' : 'speaker speaker-answer', `${match[1]}:`);
      first.textContent = first.textContent.slice(match[0].length);
      paragraph.prepend(speaker, document.createTextNode(' '));
      if (match[1] !== 'JH') paragraph.classList.add('interview-answer');
    }
  }
  function renderGlossary() {
    const list = $('#glossaryList');
    list.replaceChildren();
    const entries = state.data?.glossary || [];
    entries.forEach((item, index) => {
      const row = el('article', 'glossary-item');
      row.id = `glossary-${index}`;
      row.append(el('span', 'number', `#${index + 1}`));
      const content = el('div');
      content.append(el('span', 'term', item.term), el('p', '', item.definition));
      row.append(content); list.append(row);
    });
  }
  function navigate(route, section, person) {
    state.route = route;
    state.section = ['home', 'guide', 'credits'].includes(route) ? section || null : null;
    state.person = route === 'interviews' ? person || 'kaitlyn' : null;
    closeMenu();
    window.scrollTo(0, 0);
    renderFeed();
    const feed = $('#feed');
    feed.scrollTop = 0;
    const target = route === 'guide' && section ? $(`#guide-${section}`) : (route === 'home' || route === 'credits') && section ? $(`#section-${section}`) : null;
    if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 20);
    history.replaceState(null, '', '#' + (['home', 'guide', 'credits'].includes(route) && section ? `${route}/${section}` : route === 'interviews' ? `interviews/${state.person}` : route));
    updateNavActive();
  }
  function updateNavActive() {
    $$('#navOverlay [data-route]').forEach(button => {
      const active = button.dataset.route === state.route;
      button.classList.toggle('active', !!active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  function openMenu() {
    typePanel(false);
    updateNavActive();
    const overlay = $('#navOverlay');
    overlay.hidden = false;
    overlay.classList.remove('nav-entering');
    void overlay.offsetWidth;
    overlay.classList.add('nav-entering');
    overlay.dispatchEvent(new Event('navopen'));
    $('#menuButton').setAttribute('aria-expanded','true');
    $('#closeMenu').focus();
  }
  function closeMenu() { const overlay = $('#navOverlay'); overlay.hidden = true; overlay.dispatchEvent(new Event('navclose')); $('#menuButton').setAttribute('aria-expanded','false'); }
  function setupNavMotion() {
    const overlay = $('#navOverlay');
    const canvas = $('#navBackground');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 0, height = 0, frame = 0, pointer = null, seed = 67;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const particles = Array.from({length: 220}, () => ({x: random(), y: random(), size: 2 + Math.floor(random() * 4), color: random() < .68 ? '#a6ce38' : '#53c7de', dx: 0, dy: 0}));
    function resize() {
      const bounds = overlay.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw() {
      if (overlay.hidden) { frame = 0; return; }
      if (canvas.width !== Math.round(width * Math.min(devicePixelRatio || 1, 2)) || width !== overlay.clientWidth || height !== overlay.clientHeight) resize();
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const homeX = p.x * width, homeY = p.y * height;
        let targetX = 0, targetY = 0, glow = 0;
        if (pointer) {
          const vx = homeX - pointer.x, vy = homeY - pointer.y;
          const distance = Math.hypot(vx, vy) || 1;
          glow = Math.max(0, 1 - distance / 175);
          targetX = vx / distance * glow * 48;
          targetY = vy / distance * glow * 48;
        }
        p.dx += (targetX - p.dx) * .12;
        p.dy += (targetY - p.dy) * .12;
        ctx.globalAlpha = .32 + glow * .48;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(homeX + p.dx), Math.round(homeY + p.dy), p.size + glow * 3, p.size + glow * 3);
      }
      ctx.globalAlpha = 1;
      if (pointer) {
        for (let i = 0; i < 60; i++) {
          const angle = i * 2.39996;
          const radius = Math.sqrt(i) * 14;
          ctx.fillStyle = i % 4 === 0 ? '#000' : i % 2 ? '#53c7de' : '#a6ce38';
          ctx.globalAlpha = .7;
          const size = i % 5 === 0 ? 9 : 5;
          ctx.fillRect(Math.round(pointer.x + Math.cos(angle) * radius), Math.round(pointer.y + Math.sin(angle) * radius), size, size);
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }
    overlay.addEventListener('navopen', () => { resize(); if (!frame) frame = requestAnimationFrame(draw); });
    overlay.addEventListener('navclose', () => { cancelAnimationFrame(frame); frame = 0; pointer = null; overlay.classList.remove('nav-mousing'); });
    overlay.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const bounds = overlay.getBoundingClientRect();
      pointer = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
      overlay.classList.add('nav-mousing');
    });
    overlay.addEventListener('pointerleave', () => {
      pointer = null;
      overlay.classList.remove('nav-mousing');
    });
  }
  function typePanel(open) {
    $('#typePanel').hidden = !open;
    $('#site').classList.toggle('controls-open', open);
    $('#typeButton').setAttribute('aria-expanded', String(open));
  }

  function applyTypography() {
    const headerScale = typeParams.headerSizePt / 72;
    root.style.setProperty('--body-size', `${typeParams.paragraphSizePt}pt`);
    root.style.setProperty('--glossary-size', `${typeParams.glossarySizePt}pt`);
    root.style.setProperty('--header-size', `${typeParams.headerSizePt}pt`);
    root.style.setProperty('--sub-size', `${36 * headerScale}pt`);
    root.style.setProperty('--header-scale', String(headerScale));
    root.style.setProperty('--home-header-size', `${typeParams.headerSizePt}pt`);
    root.style.setProperty('--ink-opacity', String(typeParams.opacity / 100));
    root.style.setProperty('--contrast', String(typeParams.contrast / 100));
    root.style.setProperty('--saturation-factor', String([0, .55, 1, 1.6][typeParams.saturation]));
    root.style.setProperty('--leading', String(typeParams.lineHeight));
    root.style.setProperty('--tracking', `${typeParams.tracking}px`);
    root.style.setProperty('--paragraph-gap', `${typeParams.paragraphSpacing}em`);
    root.style.setProperty('--glossary-item-gap', `${9 * typeParams.paragraphSpacing / 1.1}px`);
    try { localStorage.setItem('six-seven-type-v4', JSON.stringify(typeParams)); } catch {}
  }
  function setupTypography() {
    try {
      const saved = JSON.parse(localStorage.getItem('six-seven-type-v4') || '{}');
      const limits = {paragraphSizePt:[10,36],glossarySizePt:[8,24],headerSizePt:[36,144],tracking:[0,8],lineHeight:[1,2],paragraphSpacing:[.3,2.5],opacity:[40,100],contrast:[70,160],saturation:[0,3]};
      for (const [key, value] of Object.entries(saved)) {
        if (!(key in limits)) continue;
        const number = Number(value);
        if (value !== undefined && Number.isFinite(number)) typeParams[key] = Math.max(limits[key][0], Math.min(limits[key][1], number));
      }
    } catch {}
    typeParams.paragraphSizePt = Math.round(typeParams.paragraphSizePt);
    typeParams.glossarySizePt = Math.round(typeParams.glossarySizePt);
    typeParams.saturation = Math.round(typeParams.saturation);
    applyTypography();
    const panel = $('#typePanel');
    const title = el('h2', 'controls-title', 'Controls');
    const list = el('div', 'controls-list');
    const controls = [
      {key: 'paragraphSizePt', label: 'Paragraph (pt)', min: 10, max: 36, step: 1},
      {key: 'glossarySizePt', label: 'Glossary (pt)', min: 8, max: 24, step: 1},
      {key: 'headerSizePt', label: 'Headers (pt)', min: 36, max: 144, step: 1},
      {key: 'tracking', label: 'Tracking', min: 0, max: 8, step: .25, decimals: 2},
      {key: 'lineHeight', label: 'Line height', min: 1, max: 2, step: .02, decimals: 2},
      {key: 'paragraphSpacing', label: 'Paragraph gap', min: .3, max: 2.5, step: .05, decimals: 2},
      {key: 'opacity', label: 'Opacity (%)', min: 40, max: 100, step: 1},
      {key: 'contrast', label: 'Contrast (%)', min: 70, max: 160, step: 1},
      {key: 'saturation', label: 'Saturation (%)', min: 0, max: 3, step: 1}
    ];
    const refreshers = [];
    for (const control of controls) {
      const row = el('div', 'control-row');
      const label = el('label', '', control.label);
      const slider = el('input', 'control-slider');
      slider.type = 'range'; slider.id = `control-${control.key}`;
      slider.min = String(control.min); slider.max = String(control.max); slider.step = String(control.step);
      label.htmlFor = slider.id;
      const value = control.key === 'saturation' ? el('output', 'control-value') : el('input', 'control-value');
      if (control.key !== 'saturation') {
        value.type = 'number'; value.min = slider.min; value.max = slider.max; value.step = slider.step;
        value.setAttribute('aria-label', `${control.label} value`);
      }
      const refresh = () => {
        slider.value = String(typeParams[control.key]);
        const shown = control.key === 'saturation' ? ['B&W', 'Low', 'Med', 'High'][typeParams.saturation] : control.decimals ? typeParams[control.key].toFixed(control.decimals) : String(typeParams[control.key]);
        if (control.key === 'saturation') value.textContent = shown;
        else value.value = shown;
      };
      const update = raw => {
        const number = Number(raw);
        if (!Number.isFinite(number)) { refresh(); return; }
        const stepped = control.min + Math.round((Math.max(control.min, Math.min(control.max, number)) - control.min) / control.step) * control.step;
        typeParams[control.key] = Number(stepped.toFixed(2));
        refresh(); applyTypography();
      };
      slider.addEventListener('input', () => update(slider.value));
      if (control.key !== 'saturation') value.addEventListener('change', () => update(value.value));
      row.append(label, slider, value);
      list.append(row);
      refreshers.push(refresh);
      refresh();
    }
    const reset = el('button', 'controls-reset', 'Reset');
    reset.type = 'button';
    reset.addEventListener('click', () => { Object.assign(typeParams, typeDefaults); refreshers.forEach(refresh => refresh()); applyTypography(); });
    panel.replaceChildren(title, list, reset);
  }
  function setupTilt() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.tilt').forEach(card => {
      let dragging = false, originX = 0, originY = 0, initialX = 0, initialY = 0;
      card.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') return; dragging = true; originX = event.clientX; originY = event.clientY; initialX = +(card.dataset.x || 0); initialY = +(card.dataset.y || 0); card.setPointerCapture(event.pointerId); });
      card.addEventListener('pointermove', event => {
        if (dragging) {
          const x = Math.max(-65, Math.min(65, initialX + event.clientX - originX));
          const y = Math.max(-65, Math.min(65, initialY + event.clientY - originY));
          card.dataset.x = x; card.dataset.y = y;
          card.style.setProperty('--drag-x', `${x}px`); card.style.setProperty('--drag-y', `${y}px`);
        } else {
          const box = card.getBoundingClientRect();
          card.style.setProperty('--tilt', `${((event.clientX - box.left) / box.width - .5) * 5}deg`);
        }
      });
      card.addEventListener('pointerup', () => { dragging = false; });
      card.addEventListener('pointercancel', () => { dragging = false; });
      card.addEventListener('pointerleave', () => { if (!dragging) card.style.setProperty('--tilt','0deg'); });
      card.addEventListener('dblclick', () => { card.dataset.x = 0; card.dataset.y = 0; card.style.setProperty('--drag-x','0px'); card.style.setProperty('--drag-y','0px'); card.style.setProperty('--tilt','0deg'); });
    });
  }
  function stopCamera() {
    cancelAnimationFrame(state.raf);
    state.handLandmarker?.close?.();
    state.handLandmarker = null;
    state.stream?.getTracks().forEach(track => track.stop());
    state.stream = null;
    $('#cameraVideo').srcObject = null;
  }
  function enter() {
    stopCamera();
    $('#gateway').hidden = true;
    $('#site').hidden = false;
    $('#feed').focus({preventScroll:true});
  }
  function detectGesture(result, now) {
    const hands = result.landmarks || [];
    if (hands.length < 2) { state.gesture.changes = 0; state.gesture.last = 0; return; }
    const sorted = [...hands].sort((a,b) => a[0].x - b[0].x);
    const left = sorted[0][0], right = sorted[1][0];
    const separation = Math.abs(left.x - right.x);
    const difference = left.y - right.y;
    if (separation < .15 || Math.abs(difference) < .075) return;
    const sign = Math.sign(difference);
    const gesture = state.gesture;
    if (gesture.last && sign !== gesture.last && now - gesture.lastAt > 180) {
      gesture.changes = now - gesture.lastAt > 3500 ? 1 : gesture.changes + 1;
      gesture.lastAt = now;
      if (gesture.changes >= 2) { $('#cameraStatus').textContent = 'ACCESS GRANTED'; enter(); return; }
    }
    if (!gesture.last) gesture.lastAt = now;
    gesture.last = sign;
    $('#cameraStatus').textContent = `6—7 / ${Math.min(gesture.changes,2)}/2`;
  }
  function cameraFrame() {
    const video = $('#cameraVideo');
    if (!state.stream || !state.handLandmarker) return;
    if (video.readyState >= 2) {
      try { detectGesture(state.handLandmarker.detectForVideo(video, performance.now()), performance.now()); }
      catch {
        state.handLandmarker?.close?.();
        state.handLandmarker = null;
        $('#cameraStatus').textContent = 'GESTURE DETECTOR STOPPED — TRY AGAIN';
        $('#cameraButton').disabled = false;
        return;
      }
    }
    state.raf = requestAnimationFrame(cameraFrame);
  }
  async function startCamera() {
    const control = $('#cameraButton');
    control.disabled = true;
    control.setAttribute('aria-label', 'Loading camera');
    $('#cameraWrap').hidden = false;
    $('#cameraStatus').textContent = 'STARTING CAMERA…';
    if (!state.stream) {
      if (!navigator.mediaDevices?.getUserMedia) {
        $('#cameraStatus').textContent = location.protocol === 'file:' ? 'CAMERA NEEDS A LOCAL SERVER — OPEN ON LOCALHOST' : 'CAMERA API UNAVAILABLE IN THIS BROWSER';
        control.disabled = false;
        return;
      }
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
        if ($('#gateway').hidden) { stopCamera(); return; }
        const video = $('#cameraVideo');
        video.srcObject = state.stream;
        await video.play();
      } catch (error) {
        stopCamera();
        const messages = {NotAllowedError:'CAMERA PERMISSION BLOCKED',NotFoundError:'NO CAMERA FOUND',NotReadableError:'CAMERA IS IN USE',OverconstrainedError:'CAMERA SETTINGS UNSUPPORTED'};
        $('#cameraStatus').textContent = messages[error?.name] || 'CAMERA COULD NOT START';
        control.setAttribute('aria-label', 'Retry camera for the 6-7 gesture');
        control.disabled = false;
        return;
      }
    }
    $('#cameraStatus').textContent = 'CAMERA READY — LOADING GESTURE DETECTOR…';
    try {
      const {FilesetResolver, HandLandmarker} = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm');
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
      const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      try {
        state.handLandmarker = await HandLandmarker.createFromOptions(vision, {baseOptions:{modelAssetPath,delegate:'GPU'},runningMode:'VIDEO',numHands:2});
      } catch {
        state.handLandmarker = await HandLandmarker.createFromOptions(vision, {baseOptions:{modelAssetPath,delegate:'CPU'},runningMode:'VIDEO',numHands:2});
      }
      if ($('#gateway').hidden) { stopCamera(); return; }
      $('#cameraStatus').textContent = '[6-7 GESTURE]';
      cameraFrame();
    } catch {
      $('#cameraStatus').textContent = 'GESTURE DETECTOR UNAVAILABLE — CHECK CONNECTION';
      control.setAttribute('aria-label', 'Retry 6-7 gesture detector');
      control.disabled = false;
    }
  }
  function setup() {
    if (location.hash === '#glossary') history.replaceState(null, '', '#home');
    const [route, detail] = location.hash.slice(1).split('/');
    if (['home', 'guide', 'interviews', 'credits'].includes(route)) {
      state.route = route;
      state.section = route === 'home' && ['what', 'belonging', 'bleaching'].includes(detail) || route === 'guide' && ['slang', 'memes', 'dance', 'numbers'].includes(detail) || route === 'credits' && ['note', 'bibliography'].includes(detail) ? detail : null;
      state.person = route === 'interviews' && names[detail] ? detail : route === 'interviews' ? 'kaitlyn' : null;
    }
    $$('[data-route]').forEach(node => node.addEventListener('click', () => navigate(node.dataset.route, node.dataset.section, node.dataset.person)));
    $('#menuButton').addEventListener('click', openMenu);
    $('#closeMenu').addEventListener('click', closeMenu);
    $('#typeButton').addEventListener('click', () => typePanel($('#typePanel').hidden));
    $('#cameraButton').addEventListener('click', startCamera);
    $('#skipButton').addEventListener('click', enter);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); typePanel(false); } });
    setupTypography(); setupTilt(); setupNavMotion();
    window.addEventListener('resize', applyTypography);
    state.data = window.SIX_SEVEN_PUBLICATION || null;
    renderGlossary();
    renderFeed();
    updateNavActive();
    const target = state.route === 'guide' && state.section ? $(`#guide-${state.section}`) : (state.route === 'home' || state.route === 'credits') && state.section ? $(`#section-${state.section}`) : null;
    if (target) requestAnimationFrame(() => window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 20));
  }
  setup();
})();
