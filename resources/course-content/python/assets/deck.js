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
  const nextLessonBtn = document.getElementById('nextLessonBtn');
  const fsBtn = document.getElementById('fsBtn');

  const lessonId = document.body.dataset.lessonId || '';
  const nextLesson = document.body.dataset.nextLesson || '';
  const prevLesson = document.body.dataset.prevLesson || '';
  const nextTitle = document.body.dataset.nextTitle || 'Next lesson';

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

    if (nextLessonBtn) {
      if (complete && nextLesson && nextLesson !== 'null') {
        nextLessonBtn.classList.add('visible');
        nextLessonBtn.setAttribute('aria-hidden', 'false');
        nextLessonBtn.textContent = 'Next: ' + nextTitle + ' →';
      } else {
        nextLessonBtn.classList.remove('visible');
        nextLessonBtn.setAttribute('aria-hidden', 'true');
      }
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
  if (nextLessonBtn) {
    nextLessonBtn.addEventListener('click', () => {
      post({ type: 'deck-progress', percent: 100, complete: true, slide: currentSlide, slides: slides.length, frag: currentFrag, frags: 0 });
      requestNavigate('next');
    });
  }

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

  function syncFullscreenButton() {
    if (!fsBtn) return;
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    fsBtn.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    fsBtn.title = active ? 'Exit fullscreen (Esc or F)' : 'Fullscreen (F)';
    fsBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    fsBtn.classList.toggle('is-active', active);
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    if (!active) {
      (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
    syncFullscreenButton();
  }

  /* ---------- Pyodide Run buttons ---------- */
  let pyodideReadyPromise = null;
  if (typeof loadPyodide !== 'undefined') {
    pyodideReadyPromise = loadPyodide({
      stdin: () => prompt('Python Input:') || '',
    });
  }

  document.querySelectorAll('.run-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Running...';
      const codeBlock = btn.parentElement.previousElementSibling;
      if (!codeBlock) {
        btn.textContent = '↻ Run again';
        btn.disabled = false;
        return;
      }
      const codeEl = codeBlock.querySelector('code');
      const codeText = codeEl ? codeEl.textContent : '';
      let outLine = codeBlock.querySelector('.out-line');
      if (!outLine) {
        outLine = document.createElement('div');
        outLine.className = 'out-line';
        outLine.style.cssText = 'display:block;margin-top:10px;color:var(--code-success);min-height:20px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;white-space:pre-wrap;';
        const container = codeBlock.querySelector('pre') || codeBlock.querySelector('.terminal-body');
        if (container) container.appendChild(outLine);
      }
      outLine.textContent = 'Initializing Python engine...';
      outLine.style.color = 'var(--code-success)';
      try {
        if (!pyodideReadyPromise) throw new Error('Pyodide failed to load.');
        const pyodide = await pyodideReadyPromise;
        outLine.textContent = '';
        pyodide.setStdout({ batched: (msg) => { outLine.textContent += msg + '\n'; } });
        pyodide.setStderr({ batched: (msg) => { outLine.textContent += msg + '\n'; } });
        await pyodide.runPythonAsync(codeText);
        if (outLine.textContent.endsWith('\n')) {
          outLine.textContent = outLine.textContent.slice(0, -1);
        }
      } catch (err) {
        outLine.style.color = '#ff6b6b';
        outLine.textContent += String(err);
      } finally {
        const container = codeBlock.querySelector('pre') || codeBlock.querySelector('.terminal-body');
        if (container) container.scrollTop = container.scrollHeight;
        btn.disabled = false;
        btn.textContent = '↻ Run again';
      }
    });
  });

  render();
})();
