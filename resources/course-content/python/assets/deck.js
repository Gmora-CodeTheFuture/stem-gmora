/* ================================================================
   Gmora LESSON DECK ENGINE
   Shared runtime for Python course presentations.
   ================================================================ */
(function () {
  const SOURCE = 'gmora-deck';
  const slides = Array.from(document.querySelectorAll('.slide'));
  const slidePos = document.getElementById('slidePos');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const progressFill = document.querySelector('.progress-fill');
  const fsBtn = document.getElementById('fsBtn');

  const lessonId = document.body.dataset.lessonId || '';
  const nextLesson = document.body.dataset.nextLesson || '';
  const prevLesson = document.body.dataset.prevLesson || '';

  let currentSlide = 0;
  let currentFrag = 0;
  let lastPostedPercent = -1;

  function post(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: SOURCE, lessonId, ...payload }, window.location.origin);
      }
    } catch (_) { /* ignore */ }
  }

  function setNextLabel(last) {
    if (!nextBtn) return;
    if (last && nextLesson && nextLesson !== 'null') {
      nextBtn.innerHTML = 'Next lesson <span aria-hidden="true">→</span>';
    } else if (last) {
      nextBtn.innerHTML = 'Done <span aria-hidden="true">✓</span>';
    } else {
      nextBtn.innerHTML = 'Next <span aria-hidden="true">→</span>';
    }
  }

  function fragmentsOf(slideEl) {
    return Array.from(slideEl.querySelectorAll('.fragment'));
  }

  function typeHTML(element, speed = 15) {
    if (element.typingTimer) clearTimeout(element.typingTimer);
    const html = element.dataset.originalHtml || element.innerHTML;
    if (!element.dataset.originalHtml) element.dataset.originalHtml = html;
    element.innerHTML = '';
    element.dataset.typed = 'true';
    let i = 0, isTag = false, text = '';
    function type() {
      if (!element.dataset.typed) return;
      if (i < html.length) {
        if (html.charAt(i) === '<') isTag = true;
        text += html.charAt(i);
        if (html.charAt(i) === '>') isTag = false;
        element.innerHTML = text;
        i++;
        if (isTag) type();
        else element.typingTimer = setTimeout(type, speed);
      }
    }
    type();
  }

  let prevSlide = -1;

  function handwriteLede(slideEl) {
    const lede = slideEl.querySelector('.lede:not(.fragment)');
    if (!lede || lede.dataset.hwDone) return;
    const html = lede.dataset.originalHtml || lede.innerHTML;
    if (!lede.dataset.originalHtml) lede.dataset.originalHtml = html;
    lede.dataset.hwDone = 'true';
    lede.innerHTML = '<span class="hw-cursor"></span>';
    let i = 0, isTag = false, text = '';
    function tick() {
      if (i < html.length) {
        if (html.charAt(i) === '<') isTag = true;
        text += html.charAt(i);
        if (html.charAt(i) === '>') isTag = false;
        lede.innerHTML = text + '<span class="hw-cursor"></span>';
        i++;
        if (isTag) tick();
        else setTimeout(tick, 22);
      } else {
        setTimeout(() => { lede.innerHTML = text; }, 1200);
      }
    }
    tick();
  }

  function resetLede(slideEl) {
    const lede = slideEl.querySelector('.lede:not(.fragment)');
    if (!lede || !lede.dataset.hwDone) return;
    lede.innerHTML = lede.dataset.originalHtml;
    lede.dataset.hwDone = '';
  }

  function isLastStep(frags) {
    return currentSlide === slides.length - 1 && currentFrag >= frags.length;
  }

  function isFirstStep() {
    return currentSlide === 0 && currentFrag === 0;
  }

  function emitProgress(frags) {
    const fragRatio = frags.length ? currentFrag / frags.length : 1;
    const percent = Math.min(100, Math.round(((currentSlide + fragRatio) / slides.length) * 1000) / 10);
    const complete = isLastStep(frags);
    if (progressFill) progressFill.style.width = percent + '%';

    if (complete || Math.abs(percent - lastPostedPercent) >= 1) {
      lastPostedPercent = percent;
      post({
        type: 'deck-progress',
        slide: currentSlide,
        slides: slides.length,
        frag: currentFrag,
        frags: frags.length,
        percent,
        complete,
      });
    }
  }

  function render() {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === currentSlide);
      if (i !== currentSlide && i === prevSlide) resetLede(s);
    });
    if (currentSlide !== prevSlide) {
      handwriteLede(slides[currentSlide]);
      prevSlide = currentSlide;
    }
    const activeSlide = slides[currentSlide];
    const frags = fragmentsOf(activeSlide);
    frags.forEach((f, i) => {
      const isVisible = i < currentFrag;
      f.classList.toggle('visible', isVisible);
      const typeEl = f.querySelector('.type-text');
      if (typeEl) {
        if (isVisible && !typeEl.dataset.typed) {
          typeHTML(typeEl);
        } else if (!isVisible && typeEl.dataset.typed) {
          if (typeEl.typingTimer) clearTimeout(typeEl.typingTimer);
          typeEl.dataset.typed = '';
          typeEl.innerHTML = '';
        }
      }
    });

    if (slidePos) {
      slidePos.textContent = (currentSlide + 1) + ' / ' + slides.length;
      slidePos.setAttribute('aria-label', 'Slide ' + (currentSlide + 1) + ' of ' + slides.length);
    }

    if (prevBtn) {
      prevBtn.disabled = isFirstStep() && (!prevLesson || prevLesson === 'null');
    }
    const last = isLastStep(frags);
    setNextLabel(last);
    if (nextBtn) {
      nextBtn.disabled = last && (!nextLesson || nextLesson === 'null');
    }

    emitProgress(frags);
  }

  function goToSlide(index, showAllFragments) {
    currentSlide = Math.max(0, Math.min(slides.length - 1, index));
    currentFrag = showAllFragments ? fragmentsOf(slides[currentSlide]).length : 0;
    render();
  }

  function requestNavigate(direction) {
    post({ type: 'deck-navigate', direction });
  }

  function next() {
    const frags = fragmentsOf(slides[currentSlide]);
    if (currentFrag < frags.length) {
      currentFrag++;
      render();
      return;
    }
    if (currentSlide < slides.length - 1) {
      currentSlide++;
      currentFrag = 0;
      render();
      return;
    }
    // Past last step → next lesson
    if (nextLesson && nextLesson !== 'null') {
      post({ type: 'deck-progress', slide: currentSlide, slides: slides.length, frag: currentFrag, frags: frags.length, percent: 100, complete: true });
      requestNavigate('next');
    }
  }

  function prev() {
    if (currentFrag > 0) {
      currentFrag--;
      render();
      return;
    }
    if (currentSlide > 0) {
      currentSlide--;
      currentFrag = fragmentsOf(slides[currentSlide]).length;
      render();
      return;
    }
    if (prevLesson && prevLesson !== 'null') {
      requestNavigate('prev');
    }
  }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  // Replace hard-coded next-lesson anchors with postMessage CTAs
  document.querySelectorAll('a[href$=".html"], a.next-lesson-cta').forEach((a) => {
    a.classList.add('next-lesson-cta');
    a.removeAttribute('href');
    a.setAttribute('role', 'button');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      post({ type: 'deck-progress', percent: 100, complete: true, slide: currentSlide, slides: slides.length, frag: currentFrag, frags: 0 });
      requestNavigate('next');
    });
  });

  function isTypingTarget(el) {
    if (!el || !(el instanceof Element)) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  document.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0, false);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(slides.length - 1, true);
    } else if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      toggleFullscreen();
    }
  });

  // Capture keys even when the LMS parent page holds focus (iframe embeds).
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'gmora-lms' || data.type !== 'deck-key') return;
    if (data.key === 'ArrowRight' || data.key === 'ArrowDown' || data.key === ' ') next();
    else if (data.key === 'ArrowLeft' || data.key === 'ArrowUp') prev();
    else if (data.key === 'Home') goToSlide(0, false);
    else if (data.key === 'End') goToSlide(slides.length - 1, true);
  });

  try {
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
  } catch (_) { /* ignore */ }

  const FS_ICON_ENTER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  const FS_ICON_EXIT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

  function isNativeFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function isCssFullscreen() {
    return document.documentElement.classList.contains('deck-fs');
  }

  function isFullscreenActive() {
    return isNativeFullscreen() || isCssFullscreen();
  }

  function setCssFullscreen(active) {
    document.documentElement.classList.toggle('deck-fs', active);
    document.body.classList.toggle('deck-fs', active);
    post({ type: 'deck-fullscreen', active: Boolean(active) });
  }

  function syncFullscreenButton() {
    if (!fsBtn) return;
    const active = isFullscreenActive();
    fsBtn.innerHTML = active ? FS_ICON_EXIT : FS_ICON_ENTER;
    fsBtn.title = active ? 'Exit fullscreen (Esc or F)' : 'Fullscreen (F)';
    fsBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen');
    fsBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    fsBtn.classList.toggle('is-active', active);
  }

  function enterFullscreen() {
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    // iOS Safari (and many iframe embeds) reject native fullscreen — use CSS immersive mode.
    if (!request) {
      setCssFullscreen(true);
      syncFullscreenButton();
      return;
    }
    try {
      const result = request.call(root);
      if (result && typeof result.then === 'function') {
        result.then(syncFullscreenButton).catch(() => {
          setCssFullscreen(true);
          syncFullscreenButton();
        });
      } else {
        // Older webkit may not return a promise; fall back shortly if nothing happened.
        setTimeout(() => {
          if (!isNativeFullscreen()) {
            setCssFullscreen(true);
            syncFullscreenButton();
          }
        }, 120);
      }
    } catch (_) {
      setCssFullscreen(true);
      syncFullscreenButton();
    }
  }

  function exitFullscreen() {
    if (isCssFullscreen()) {
      setCssFullscreen(false);
      syncFullscreenButton();
      return;
    }
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      try {
        const result = exit.call(document);
        if (result && typeof result.then === 'function') {
          result.finally(syncFullscreenButton);
        } else {
          syncFullscreenButton();
        }
      } catch (_) {
        syncFullscreenButton();
      }
    }
  }

  function toggleFullscreen() {
    if (isFullscreenActive()) exitFullscreen();
    else enterFullscreen();
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      if (isNativeFullscreen() && isCssFullscreen()) setCssFullscreen(false);
      syncFullscreenButton();
      post({ type: 'deck-fullscreen', active: isFullscreenActive() });
    });
    document.addEventListener('webkitfullscreenchange', () => {
      if (isNativeFullscreen() && isCssFullscreen()) setCssFullscreen(false);
      syncFullscreenButton();
      post({ type: 'deck-fullscreen', active: isFullscreenActive() });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isCssFullscreen()) {
        exitFullscreen();
      }
    });
    syncFullscreenButton();
  }

  /* ---------- Pyodide Run buttons ---------- */
  const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/';
  let pyodideReadyPromise = null;

  function ensurePyodide() {
    if (pyodideReadyPromise) return pyodideReadyPromise;
    if (typeof loadPyodide === 'undefined') {
      return Promise.reject(new Error('Python engine failed to load. Check your network and try again.'));
    }
    // indexURL must be absolute — presentations inject a <base href> that would
    // otherwise break relative package fetches from the CDN.
    pyodideReadyPromise = loadPyodide({
      indexURL: PYODIDE_INDEX,
      stdin: () => prompt('Python input:') || '',
    });
    return pyodideReadyPromise;
  }

  /** Strip shared leading indentation from HTML-pretty-printed code samples. */
  function dedentCode(code) {
    const lines = String(code).replace(/\t/g, '  ').replace(/\r/g, '').split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

    const indents = lines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const match = line.match(/^ */);
        return match ? match[0].length : 0;
      });
    if (!indents.length) return '';

    let min = Math.min(...indents);
    // Pretty-printed HTML often leaves the first line flush-left and indents the rest.
    if (min === 0 && indents.some((n) => n > 0)) {
      const positive = indents.filter((n) => n > 0);
      min = Math.min(...positive);
      return lines
        .map((line) => {
          if (!line.trim()) return '';
          const cur = (line.match(/^ */) || [''])[0].length;
          return cur >= min ? line.slice(min) : line;
        })
        .join('\n');
    }

    return lines.map((line) => line.slice(Math.min(min, line.length))).join('\n');
  }

  function codeSourceForButton(btn) {
    const wrap = btn.closest('.run-btn-wrap');
    if (wrap) {
      const prev = wrap.previousElementSibling;
      if (prev && (prev.classList.contains('code-block') || prev.classList.contains('terminal'))) {
        return prev;
      }
    }
    let prev = btn.previousElementSibling;
    while (prev && prev.nodeType === 1 && !prev.classList.contains('code-block') && !prev.classList.contains('terminal')) {
      // Skip non-code siblings (e.g. empty text wrappers)
      prev = prev.previousElementSibling;
    }
    if (prev && (prev.classList.contains('code-block') || prev.classList.contains('terminal'))) {
      return prev;
    }
    const slide = btn.closest('.slide');
    if (!slide) return null;
    return slide.querySelector('.code-block, .terminal');
  }

  /** Pull runnable Python from either a .code-block or a .terminal widget. */
  function extractCode(source) {
    if (!source) return '';
    if (source.classList.contains('code-block')) {
      const codeEl = source.querySelector('code');
      return dedentCode(codeEl ? codeEl.textContent : '');
    }
    const body = source.classList.contains('terminal-body')
      ? source
      : source.querySelector('.terminal-body');
    if (!body) return '';
    const parts = [];
    body.childNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.classList.contains('out-line')) return;
      const text = node.textContent.replace(/\u00a0/g, ' ').trimEnd();
      if (text.trim()) parts.push(text.trimStart());
    });
    return parts.join('\n');
  }

  function outputTarget(source) {
    let outLine = source.querySelector('.out-line');
    if (outLine) return outLine;
    outLine = document.createElement('div');
    outLine.className = 'out-line';
    outLine.setAttribute('aria-live', 'polite');
    const container = source.querySelector('pre') || source.querySelector('.terminal-body') || source;
    container.appendChild(outLine);
    return outLine;
  }

  // Ensure every .code-block sample has a Run control (terminals already ship with one).
  document.querySelectorAll('.code-block').forEach((block) => {
    const next = block.nextElementSibling;
    if (next && (next.classList.contains('run-btn-wrap') || next.classList.contains('run-btn'))) return;
    if (block.closest('.cover')) return;
    const code = block.querySelector('code');
    if (!code || !code.textContent.trim()) return;
    const wrap = document.createElement('div');
    wrap.className = 'run-btn-wrap';
    wrap.innerHTML = '<button type="button" class="run-btn">▶ Run</button>';
    block.insertAdjacentElement('afterend', wrap);
  });

  document.querySelectorAll('.run-btn').forEach((btn) => {
    if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const source = codeSourceForButton(btn);
      if (!source) {
        console.warn('[gmora-deck] No code source found for Run button');
        return;
      }

      const codeText = extractCode(source);
      if (!codeText.trim()) {
        console.warn('[gmora-deck] Empty code for Run button');
        return;
      }

      btn.disabled = true;
      const originalLabel = btn.textContent;
      btn.textContent = 'Running…';

      const outLine = outputTarget(source);
      outLine.textContent = 'Loading Python…';
      outLine.style.color = 'var(--code-success)';
      try {
        const pyodide = await ensurePyodide();
        outLine.textContent = '';
        pyodide.setStdout({ batched: (msg) => { outLine.textContent += msg + '\n'; } });
        pyodide.setStderr({ batched: (msg) => { outLine.textContent += msg + '\n'; } });
        await pyodide.runPythonAsync(codeText);
        if (outLine.textContent.endsWith('\n')) {
          outLine.textContent = outLine.textContent.slice(0, -1);
        }
        if (!outLine.textContent.trim()) {
          outLine.textContent = '(ran successfully — no output)';
          outLine.style.color = 'var(--code-comment)';
        }
      } catch (err) {
        outLine.style.color = '#ff6b6b';
        outLine.textContent = String(err);
      } finally {
        const container = source.querySelector('pre') || source.querySelector('.terminal-body');
        if (container) container.scrollTop = container.scrollHeight;
        btn.disabled = false;
        btn.textContent = /again/i.test(originalLabel) ? originalLabel : '↻ Run again';
      }
    });
  });

  // Warm the engine in the background so the first Run feels snappy.
  if (document.querySelector('.run-btn') && typeof loadPyodide !== 'undefined') {
    ensurePyodide().catch(() => { /* surfaced on first Run click */ });
  }

  render();
})();
