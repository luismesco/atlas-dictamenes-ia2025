(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { playing: false, font: 20, speed: 36, frame: null, lastTime: null, position: 0, sections: [], scheduled: false, mode: 'full', filter: '', currentId: null, hasFindings: false, total: 0 };
  const paragraphs = value => (Array.isArray(value) ? value : [value]).filter(v => typeof v === 'string' && v.trim());
  function appendParagraphs(parent, value) {
    for (const text of paragraphs(value)) { const p = document.createElement('p'); p.textContent = text; parent.append(p); }
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const local = value.startsWith('/') && !value.startsWith('//') ? value.slice(1) : value;
      const url = new URL(local, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  function addLinks(parent, links) {
    let count = 0;
    for (const source of Array.isArray(links) ? links : []) {
      if (!source || typeof source !== 'object') continue;
      const href = safeURL(source.url);
      if (!href) continue;
      const li = element('li'); const a = element('a', '', (source.label || 'Consultar fuente') + ' ↗');
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const url = new URL(href);
      if (url.origin === new URL(document.baseURI).origin && /\/Guion_QROO_seguimientos\.txt$/.test(url.pathname)) { a.download = 'Guion_QROO_seguimientos.txt'; a.removeAttribute('target'); }
      li.append(a); parent.append(li); count++;
    }
    return count;
  }
  function announce(message) { $('announcement').textContent = message; }
  function toolbarHeight() {
    const height = $('readingControls').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--toolbar-height', Math.ceil(height) + 'px');
    return height;
  }
  function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function statusGroup(status) {
    const normalized = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (/^no\s+atendid[ao]s?\b/.test(normalized)) return 'No atendida';
    if (normalized.startsWith('seguimiento')) return 'Seguimiento';
    if (normalized.startsWith('informativa')) return 'Informativa';
    if (normalized.startsWith('sin pronunciamiento')) return 'Sin pronunciamiento';
    return String(status || '');
  }
  function eligibleSections() { return state.sections.filter(section => !state.filter || section.kind === 'observation' && statusGroup(section.status) === state.filter); }
  function visibleSections() { return eligibleSections().filter(section => state.mode === 'full' || section.node.id === state.currentId); }
  function bounds() {
    const list = visibleSections();
    if (!list.length) return { start: 0, end: 0 };
    const max = maxScroll();
    const start = Math.min(max, Math.max(0, window.scrollY + list[0].node.getBoundingClientRect().top - toolbarHeight() - 16));
    const end = Math.max(start, Math.min(max, window.scrollY + list[list.length - 1].node.getBoundingClientRect().bottom - window.innerHeight + 40));
    return { start, end };
  }
  function refreshCurrent() {
    const list = eligibleSections(); const index = list.findIndex(section => section.node.id === state.currentId); const active = list[index];
    $('previousSection').disabled = index <= 0; $('nextSection').disabled = index < 0 || index >= list.length - 1;
    $('currentId').textContent = active?.idLabel || 'Sin selección';
    $('currentStatus').textContent = active?.status || (active ? 'Guion general' : '');
    $('currentTitle').textContent = active?.title || ''; $('currentTitle').title = active?.title || '';
    $('currentStatus').title = active?.status || '';
    if (active) $('sectionSelect').value = active.node.id;
    for (const section of state.sections) { if (section.node.id === state.currentId) section.link.setAttribute('aria-current', 'true'); else section.link.removeAttribute('aria-current'); }
  }
  function applyView(targetId = state.currentId) {
    pause(true);
    const eligible = eligibleSections();
    state.currentId = eligible.some(section => section.node.id === targetId) ? targetId : eligible[0]?.node.id || null;
    for (const section of state.sections) {
      const matches = eligible.includes(section);
      section.node.hidden = !matches || state.mode === 'single' && section.node.id !== state.currentId;
      section.link.hidden = !matches;
    }
    $('sectionSelect').replaceChildren();
    for (const section of eligible) { const option = element('option', '', section.idLabel + ' · ' + section.title + (section.status ? ' · ' + section.status : '')); option.value = section.node.id; $('sectionSelect').append(option); }
    $('sectionSelect').disabled = !eligible.length; $('noCases').hidden = !!eligible.length; $('play').disabled = !eligible.length;
    $('fullMode').setAttribute('aria-pressed', String(state.mode === 'full')); $('singleMode').setAttribute('aria-pressed', String(state.mode === 'single'));
    document.body.classList.toggle('single-observation', state.mode === 'single');
    const count = eligible.filter(section => section.kind === 'observation').length;
    $('navigationHint').textContent = (state.filter ? count + ' de ' + state.total + ' observaciones · ' + state.filter : state.total + ' observaciones, apertura y cierre') + (state.mode === 'single' ? '. Se muestra un apartado a la vez.' : '. Lectura continua de los apartados visibles.');
    $('findings').hidden = !state.hasFindings || !$('showSupport').checked || state.mode === 'single' || !!state.filter;
    refreshCurrent(); toolbarHeight(); scheduleProgress();
  }
  function changeMode(mode) {
    if (mode !== 'full' && mode !== 'single') return;
    const current = state.currentId; state.mode = mode; applyView(current);
    if (state.currentId) jump(state.currentId, false);
    announce(mode === 'single' ? 'Modo por observación. Usa las flechas o el selector para cambiar de apartado.' : 'Modo guion completo. Todos los apartados del filtro están visibles.');
  }
  function pause(quiet = false) {
    const wasPlaying = state.playing;
    state.playing = false;
    if (state.frame !== null) window.cancelAnimationFrame(state.frame);
    state.frame = null; state.lastTime = null;
    $('play').setAttribute('aria-pressed', 'false'); $('playIcon').textContent = '▶'; $('playLabel').textContent = 'Reproducir';
    if (wasPlaying && !quiet) announce('Lectura pausada.');
  }
  function frame(timestamp) {
    if (!state.playing) return;
    const last = state.lastTime;
    state.lastTime = timestamp;
    if (last !== null) {
      state.position += state.speed * Math.max(0, Math.min(100, timestamp - last)) / 1000;
      const range = bounds();
      state.position = Math.min(state.position, range.end);
      window.scrollTo(0, state.position);
      if (state.position >= range.end - .5) { pause(true); updateProgress(); announce(state.mode === 'single' ? 'Fin de este apartado. Usa la flecha siguiente para continuar.' : 'Fin del guion visible.'); return; }
    }
    state.frame = window.requestAnimationFrame(frame);
  }
  function play() {
    const range = bounds();
    if (!$('content').hidden && range.end - range.start > 1) {
      if (window.scrollY < range.start || window.scrollY >= range.end - 1) window.scrollTo(0, range.start);
      state.playing = true; state.position = window.scrollY; state.lastTime = null;
      $('play').setAttribute('aria-pressed', 'true'); $('playIcon').textContent = 'Ⅱ'; $('playLabel').textContent = 'Pausar';
      announce('Lectura automática iniciada.');
      if (state.frame !== null) window.cancelAnimationFrame(state.frame);
      state.frame = window.requestAnimationFrame(frame);
    } else if (!$('content').hidden) announce('El apartado cabe completo en pantalla. Usa las flechas o el selector para continuar.');
  }
  function toggle() { if (state.playing) pause(); else play(); }
  function setFont(value) {
    state.font = Math.max(16, Math.min(32, value));
    document.documentElement.style.setProperty('--reading-size', state.font + 'px');
    $('fontValue').textContent = state.font + ' px'; $('fontDown').disabled = state.font <= 16; $('fontUp').disabled = state.font >= 32;
    if (state.playing) state.position = window.scrollY;
    scheduleProgress();
  }
  function setSpeed(value) {
    const parsed = Number(value); if (!Number.isFinite(parsed)) return;
    state.speed = Math.max(12, Math.min(90, parsed)); $('speed').value = String(state.speed); $('speedValue').textContent = state.speed + ' px/s';
    $('speed').setAttribute('aria-valuetext', state.speed + ' píxeles por segundo');
  }
  function updateProgress() {
    state.scheduled = false;
    const range = bounds(); const distance = range.end - range.start;
    const percent = distance > 1 ? Math.round(Math.min(1, Math.max(0, (window.scrollY - range.start) / distance)) * 100) : (visibleSections().length ? 100 : 0);
    $('readingProgress').setAttribute('aria-valuenow', String(percent)); $('progressFill').style.width = percent + '%';
    const line = $('readingControls').getBoundingClientRect().height + 55;
    const visible = visibleSections(); let active = visible[0];
    for (const section of visible) { if (section.node.getBoundingClientRect().top <= line) active = section; else break; }
    if (active) {
      state.currentId = active.node.id;
    }
    refreshCurrent();
  }
  function scheduleProgress() { if (!state.scheduled) { state.scheduled = true; window.requestAnimationFrame(updateProgress); } }
  function jump(id, focus = true) {
    const item = eligibleSections().find(section => section.node.id === id);
    if (!item) return;
    pause(true);
    state.currentId = id;
    if (state.mode === 'single') applyView(id);
    const top = window.scrollY + item.node.getBoundingClientRect().top - toolbarHeight() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    if (focus) item.node.focus({ preventScroll: true });
    $('sectionSelect').value = id; updateProgress();
    try { history.replaceState(null, '', '#' + encodeURIComponent(id)); } catch { /* Local previews may not support history changes. */ }
  }
  function indexItem(node, label, shortLabel, status = '') {
    node.tabIndex = -1;
    const option = element('option', '', label); option.value = node.id; $('sectionSelect').append(option);
    const a = element('a', '', shortLabel || label); a.href = '#' + node.id; a.title = label;
    a.addEventListener('click', event => { event.preventDefault(); jump(node.id); });
    $('sectionIndex').append(a);
    state.sections.push({ node, link: a, title: node.querySelector('h2')?.textContent || label, idLabel: shortLabel || label, status, kind: node.classList.contains('observation') ? 'observation' : 'general' });
  }
  function render(data) {
    if (!data || !Array.isArray(data.sections) || !data.sections.length) {
      $('loadMessage').textContent = 'El guion no está disponible. Vuelve a la consulta de Quintana Roo para revisar las observaciones.';
      return;
    }
    if (typeof data.title === 'string' && data.title.trim()) { $('pageTitle').textContent = data.title; document.title = data.title; }
    if (typeof data.cutoff === 'string' && data.cutoff.trim()) { $('cutoff').textContent = data.cutoff; $('cutoff').hidden = false; }
    state.total = data.sections.length;
    $('sectionCount').textContent = data.sections.length + (data.sections.length === 1 ? ' observación' : ' observaciones'); $('sectionCount').hidden = false;
    const spoken = [...paragraphs(data.intro), ...data.sections.flatMap(section => paragraphs(section?.speech)), ...paragraphs(data.closing)].join(' ');
    const words = (spoken.match(/\S+/g) || []).length;
    if (words) { $('readingTime').textContent = '≈ ' + Math.ceil(words / 130) + ' min de exposición'; $('readingTime').title = 'Estimación a 130 palabras por minuto; no incluye los detalles ni los documentos de apoyo.'; $('readingTime').hidden = false; }
    appendParagraphs($('introText'), data.intro);
    if (paragraphs(data.intro).length) indexItem($('guion-introduccion'), 'Apertura', 'Apertura'); else $('guion-introduccion').hidden = true;
    const used = new Set(['guion-introduccion', 'guion-cierre']);
    for (const [index, section] of data.sections.entries()) {
      if (!section || typeof section !== 'object') continue;
      const original = String(section.id ?? index + 1); const idLabel = /^\d+$/.test(original) ? 'ID ' + original : original;
      let id = 'guion-' + original.replace(/[^a-zA-Z0-9_-]/g, '-');
      while (used.has(id)) id += '-' + (index + 1);
      used.add(id);
      const node = element('section', 'reading-section observation'); node.id = id;
      const head = element('div', 'section-heading'); head.append(element('span', 'section-id', idLabel));
      const title = element('h2', '', section.title || idLabel); title.id = id + '-title'; head.append(title); node.setAttribute('aria-labelledby', title.id);
      const meta = element('div', 'section-meta');
      if (section.status) meta.append(element('span', 'section-status', section.status));
      if (section.cross) meta.append(element('span', 'section-cross', section.cross));
      if (meta.childNodes.length) head.append(meta);
      node.append(head);
      const speech = element('div', 'speech'); appendParagraphs(speech, section.speech); if (speech.childNodes.length) node.append(speech);
      if (paragraphs(section.detail).length) {
        const detail = element('div', 'detail'); detail.append(element('h3', '', 'Detalle de la observación'));
        const content = element('div', 'detail-content'); appendParagraphs(content, section.detail); detail.append(content); node.append(detail);
      }
      const sources = element('ul', 'source-list'); sources.setAttribute('aria-label', 'Fuentes de ' + idLabel);
      if (addLinks(sources, section.sources)) node.append(sources);
      $('sections').append(node); indexItem(node, idLabel + ' · ' + (section.title || 'Observación'), idLabel, section.status || '');
    }
    appendParagraphs($('closingText'), data.closing);
    if (paragraphs(data.closing).length) { $('guion-cierre').hidden = false; indexItem($('guion-cierre'), 'Cierre', 'Cierre'); }
    for (const finding of Array.isArray(data.findings) ? data.findings : []) {
      if (!finding || typeof finding !== 'object' || !paragraphs(finding.text).length) continue;
      const article = element('article', 'finding');
      if (finding.title) article.append(element('h3', '', finding.title));
      const content = element('div', 'finding-content'); appendParagraphs(content, finding.text); article.append(content); $('findingList').append(article);
    }
    state.hasFindings = !!$('findingList').childNodes.length;
    $('findings').hidden = !state.hasFindings;
    $('documents').hidden = !addLinks($('documentList'), data.documents);
    $('loadMessage').hidden = true; $('content').hidden = false;
    for (const id of ['play', 'fontDown', 'fontUp', 'speed']) $(id).disabled = false;
    const statuses = [...new Set(state.sections.filter(section => section.kind === 'observation').map(section => statusGroup(section.status)).filter(Boolean))];
    $('statusSelect').options[0].textContent = 'Todos los estatus · ' + state.total;
    for (const status of statuses) { const count = state.sections.filter(section => section.kind === 'observation' && statusGroup(section.status) === status).length; const option = element('option', '', status + ' · ' + count); option.value = status; $('statusSelect').append(option); }
    state.currentId = state.sections[0]?.node.id || null;
    setFont(20); setSpeed(36); applyView();
    if (location.hash) { const hash = location.hash.slice(1); if (state.sections.some(section => section.node.id === hash)) jump(hash, false); }
  }
  $('play').addEventListener('click', toggle);
  $('fontDown').addEventListener('click', () => setFont(state.font - 2));
  $('fontUp').addEventListener('click', () => setFont(state.font + 2));
  $('speed').addEventListener('input', event => setSpeed(event.target.value));
  $('sectionSelect').addEventListener('change', event => jump(event.target.value));
  $('statusSelect').addEventListener('change', event => { state.filter = event.target.value; applyView(); if (state.currentId) jump(state.currentId, false); announce($('navigationHint').textContent); });
  $('fullMode').addEventListener('click', () => changeMode('full'));
  $('singleMode').addEventListener('click', () => changeMode('single'));
  $('previousSection').addEventListener('click', () => { const list = eligibleSections(); const index = list.findIndex(section => section.node.id === state.currentId); if (index > 0) jump(list[index - 1].node.id); });
  $('nextSection').addEventListener('click', () => { const list = eligibleSections(); const index = list.findIndex(section => section.node.id === state.currentId); if (index >= 0 && index < list.length - 1) jump(list[index + 1].node.id); });
  $('showSupport').addEventListener('change', event => {
    pause(); document.body.classList.toggle('reading-only', !event.target.checked);
    $('findings').hidden = !state.hasFindings || !event.target.checked || state.mode === 'single' || !!state.filter;
    updateProgress();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { pause(); return; }
    const target = event.target;
    const interactive = target && typeof target.closest === 'function' && target.closest('input,textarea,select,button,a,summary,[contenteditable="true"],[contenteditable=""]');
    if (interactive || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); if (!event.repeat) toggle(); }
    else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) pause();
  });
  window.addEventListener('wheel', () => pause(), { passive: true });
  window.addEventListener('touchstart', () => pause(), { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', () => { toolbarHeight(); if (state.playing) state.position = window.scrollY; scheduleProgress(); });
  window.addEventListener('beforeprint', () => pause(true));
  window.QROOGuion = Object.freeze({ pause, play, jump, getState: () => ({ playing: state.playing, font: state.font, speed: state.speed, sections: state.sections.length, mode: state.mode, filter: state.filter, currentId: state.currentId, visible: visibleSections().map(section => section.node.id) }) });
  render(window.GUION_DATA);
})();
