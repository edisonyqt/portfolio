/* ============================================================
   Qiutong Yang · Interaction Design Portfolio
   Scroll-reveal, sticky header, drag-to-scroll boards, lightbox.
   Motion is gated on prefers-reduced-motion.
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal ------------------------------------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- header background on scroll ----------------------- */
  const header = document.getElementById('siteHeader');
  if (header) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     Lightbox
     ============================================================ */
  const lb = document.getElementById('lightbox');
  const lbStage = document.getElementById('lbStage');
  const lbImg = document.getElementById('lbImg');
  const lbCap = document.getElementById('lbCap');
  const lbCount = document.getElementById('lbCount');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');

  let group = [];
  let gi = 0;
  let lastFocus = null;

  function render() {
    const img = group[gi];
    const isBoard = img.classList.contains('board-img');
    lbImg.src = img.dataset.full || img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lbImg.classList.toggle('is-board', isBoard);
    lbStage.classList.toggle('is-board', isBoard);
    lbCap.textContent = img.alt || '';
    lbCount.textContent = group.length > 1 ? (gi + 1) + ' / ' + group.length : '';
    const many = group.length > 1;
    lbPrev.style.display = many ? '' : 'none';
    lbNext.style.display = many ? '' : 'none';
    // reset scroll so wide boards start at the left edge
    lbStage.scrollLeft = 0;
    lbStage.scrollTop = 0;
  }

  function openLb(images, index) {
    group = images;
    gi = index;
    lastFocus = document.activeElement;
    render();
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('open'));
    document.body.style.overflow = 'hidden';
    lbClose.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeLb() {
    lb.classList.remove('open');
    lb.hidden = true;
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(dir) {
    if (group.length < 2) return;
    gi = (gi + dir + group.length) % group.length;
    render();
  }

  function onKey(e) {
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {
      // simple focus trap across the three controls
      e.preventDefault();
      const focusables = [lbClose, lbPrev, lbNext].filter((b) => b.style.display !== 'none');
      const i = focusables.indexOf(document.activeElement);
      const nextI = (i + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
      focusables[nextI].focus();
    }
  }

  if (lb) {
    lbClose.addEventListener('click', closeLb);
    lbPrev.addEventListener('click', () => step(-1));
    lbNext.addEventListener('click', () => step(1));
    // click on the dim background (not the image) closes
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target === lbStage) closeLb();
    });
  }

  function wireGroup(images) {
    images.forEach((img, i) => {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(images, i); }
      });
    });
  }

  /* ---- boards: drag-to-scroll + click-to-open ------------ */
  document.querySelectorAll('.boards-track').forEach((track) => {
    const imgs = [...track.querySelectorAll('img')];
    wireGroup(imgs);

    let down = false, startX = 0, startScroll = 0, moved = false;

    track.addEventListener('pointerdown', (e) => {
      down = true; moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('dragstart', (e) => e.preventDefault());

    imgs.forEach((img, i) => {
      img.addEventListener('click', () => { if (!moved) openLb(imgs, i); });
    });
  });

  /* ---- case photos: click-to-open ------------------------ */
  document.querySelectorAll('.img-grid').forEach((grid) => {
    const imgs = [...grid.querySelectorAll('img')];
    wireGroup(imgs);
    imgs.forEach((img, i) => img.addEventListener('click', () => openLb(imgs, i)));
  });

  /* ---- pan wide boards inside the lightbox --------------- */
  if (lbStage) {
    let pd = false, px = 0, py = 0, sl = 0, st = 0;
    lbStage.addEventListener('pointerdown', (e) => {
      if (!lbStage.classList.contains('is-board')) return;
      if (e.target !== lbImg) return;
      pd = true; px = e.clientX; py = e.clientY; sl = lbStage.scrollLeft; st = lbStage.scrollTop;
      lbStage.setPointerCapture(e.pointerId);
    });
    lbStage.addEventListener('pointermove', (e) => {
      if (!pd) return;
      lbStage.scrollLeft = sl - (e.clientX - px);
      lbStage.scrollTop = st - (e.clientY - py);
    });
    const pend = (e) => { pd = false; try { lbStage.releasePointerCapture(e.pointerId); } catch (_) {} };
    lbStage.addEventListener('pointerup', pend);
    lbStage.addEventListener('pointercancel', pend);
  }

  /* ---- smooth in-page anchors ---------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
})();
