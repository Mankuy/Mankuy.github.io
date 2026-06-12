/**
 * CONSTRUÍ ESTO — Fanzine renderer
 * Revista digital con volteo de página, lightbox y PDF
 */
(function () {
  'use strict';

  const ROOT_ID = 'zine-root';
  const DATA_URL = 'spreads.json';
  const MAGAZINE_BP = '(min-width: 900px)';

  let revealObserver = null;
  let pageFlipInstance = null;
  let spreadIds = [];
  let flipBookHtml = '';
  let pristineFlipBookHtml = '';
  let reenableMagazine = null;
  let magazineDisable = null;

  function esc(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function imgSrc(path) {
    if (!path) return '';
    return path.split('/').map(seg => encodeURIComponent(seg)).join('/');
  }

  function bodyHtml(text) {
    if (!text) return '';
    return text.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
  }

  function spreadImages(s) {
    if (s.images && s.images.length) return s.images;
    if (s.image) {
      return [{ src: s.image, alt: s.imageAlt || s.title, tilt: s.imageTilt }];
    }
    return [];
  }

  function renderTags(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
  }

  function renderCta(cta) {
    if (!cta) return '';
    if (cta.disabled || !cta.url) {
      return `<span class="cta cta--disabled">${esc(cta.label)}</span>`;
    }
    return `<a class="cta" href="${esc(cta.url)}" target="_blank" rel="noopener">${esc(cta.label)}</a>`;
  }

  function renderStamp(stamp, variant) {
    if (!stamp) return '';
    const cls = variant === 'blue' ? 'stamp stamp--blue' : 'stamp';
    return `<span class="${cls}">${esc(stamp)}</span>`;
  }

  function renderFeatures(features) {
    if (!features || !features.length) return '';
    return `<ul class="feature-list">${features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
  }

  function renderPullquote(text) {
    if (!text) return '';
    return `<blockquote class="pullquote">${esc(text)}</blockquote>`;
  }

  function pageNum(n, total) {
    return `<span class="spread__page-num">— ${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')} —</span>`;
  }

  function renderPhoto(img, opts = {}) {
    const tilt = img.tilt != null ? img.tilt : 0;
    const size = opts.size || 'spread';
    const alt = img.alt || '';
    const gallery = opts.gallery ? ` data-lightbox-gallery="${esc(opts.gallery)}"` : '';
    const loading = opts.loading || 'lazy';
    const idx = opts.index != null ? ` collage-photo--n${opts.index + 1}` : '';
    return `
      <figure class="collage-photo collage-photo--${esc(size)} collage-photo--zoomable${idx}" style="--photo-tilt:${tilt}deg">
        <button type="button" class="collage-photo__btn" data-lightbox-src="${imgSrc(img.src)}" data-lightbox-alt="${esc(alt)}"${gallery} aria-label="Ver imagen en grande">
          <img src="${imgSrc(img.src)}" alt="${esc(alt)}" loading="${loading}" decoding="async">
        </button>
      </figure>`;
  }

  function renderCollagePhoto(item, gallery) {
    return renderPhoto({ src: item.src, alt: '', tilt: item.tilt }, { size: item.size || 'md', gallery });
  }

  function renderWipStamp(s) {
    const label = (s.imagePlaceholder || 'EN CONSTRUCCIÓN').replace(/\s+/g, '<br>');
    return `
      <figure class="collage-wip" style="--photo-tilt:${s.imageTilt || -5}deg" aria-label="Proyecto en construcción">
        <div class="collage-wip__tape" aria-hidden="true"></div>
        <span class="collage-wip__ring">${label}</span>
        <span class="collage-wip__sub">sin captura todavía</span>
      </figure>`;
  }

  function renderCollage(s) {
    const imgs = spreadImages(s);
    if (imgs.length) {
      const gallery = `spread-${s.id}`;
      const stackClass = imgs.length === 1
        ? 'collage-stack--solo'
        : imgs.length === 2
          ? 'collage-stack--duo'
          : 'collage-stack--multi';
      return `<div class="collage-stack ${stackClass}" data-gallery="${gallery}">${
        imgs.map((img, i) => renderPhoto(img, { gallery, loading: 'eager', index: i })).join('')
      }</div>`;
    }
    if (s.imagePlaceholder) return renderWipStamp(s);
    return '';
  }

  function renderIndexList(items) {
    if (!items || !items.length) return '';
    return `
      <ol class="index-list">
        ${items.map(it => `
          <li class="index-list__item">
            <a class="index-list__link" href="#spread-${esc(it.id)}">
              <span class="index-list__page">${String(it.page).padStart(2, '0')}</span>
              <span class="index-list__name">${esc(it.name)}</span>
              <span class="index-list__tier index-list__tier--${esc(it.tier.toLowerCase().replace(/\s+/g, '-'))}">${esc(it.tier)}</span>
            </a>
            <span class="index-list__note">${esc(it.note)}</span>
          </li>`).join('')}
      </ol>`;
  }

  function renderCover(s, total) {
    const lines = (s.coverLines || []).map(l => `<li>${esc(l)}</li>`).join('');
    const hero = s.coverHero;
    const heroHtml = hero ? `
      <figure class="cover-hero">
        <img src="${imgSrc(hero.src)}" alt="${esc(hero.alt || s.title)}" loading="eager" decoding="async" fetchpriority="high">
        <figcaption class="cover-hero__label">${esc(hero.alt || 'SuperCouncil')}</figcaption>
      </figure>` : '';
    const polaroids = (s.coverCollage || []).map((item, i) => {
      const src = typeof item === 'string' ? item : item.src;
      const tilt = typeof item === 'object' && item.tilt != null ? item.tilt : (i % 2 ? 5 : -4);
      return renderPhoto({ src, alt: '', tilt }, { size: 'polaroid', loading: 'eager', index: i });
    }).join('');

    return `
      <article class="spread spread--cover" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="cover-spine" aria-hidden="true"></div>
        <div class="cover-barcode" aria-hidden="true">FG·001·2026</div>
        <div class="cover-inner">
          <header class="cover-mast">
            <span class="cover-kicker">Fanzine · Facundo Galetta</span>
            <span class="cover-price">${esc(s.stamp || '')}</span>
          </header>
          <h1 class="spread__masthead">${esc(s.title)}</h1>
          <p class="spread__issue">${esc(s.hook)}</p>
          <div class="cover-poster">
            ${heroHtml}
            ${polaroids ? `<div class="cover-polaroids">${polaroids}</div>` : ''}
          </div>
          ${lines ? `<ul class="cover-lines">${lines}</ul>` : ''}
          <footer class="cover-footer">
            <p class="spread__author">${esc(s.body)}</p>
            <button type="button" class="cover-cta" id="cover-open-btn">${esc(s.ctaCover || 'Pasá la página →')}</button>
          </footer>
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderIndex(s, total) {
    const gallery = `spread-${s.id}`;
    const collage = (s.collage || []).map(item => renderCollagePhoto(item, gallery)).join('');
    return `
      <article class="spread spread--index" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderIndexList(s.index)}
          ${renderFeatures(s.features)}
          ${renderPullquote(s.pullquote)}
          ${renderStamp(s.stamp, 'blue')}
          ${s.note ? `<div class="note-box">${esc(s.note)}</div>` : ''}
        </div>
        ${collage ? `<div class="collage-cluster" data-gallery="${gallery}">${collage}</div>` : ''}
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderEditorial(s, total) {
    return `
      <article class="spread spread--editorial" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderFeatures(s.features)}
          ${renderPullquote(s.pullquote)}
          ${renderStamp(s.stamp, 'blue')}
          ${s.note ? `<div class="note-box">${esc(s.note)}</div>` : ''}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderProduct(s, total) {
    const cut = s.tier === 'public' ? '<div class="collage-cut">USAR<br>HOY</div>' : '';
    return `
      <article class="spread spread--product" id="spread-${esc(s.id)}" data-page="${s.page}">
        ${cut}
        ${renderCollage(s)}
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderFeatures(s.features)}
          ${renderPullquote(s.pullquote)}
          ${renderTags(s.tags)}
          ${renderCta(s.cta)}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderWeb(s, total) {
    return `
      <article class="spread spread--web" id="spread-${esc(s.id)}" data-page="${s.page}">
        ${renderCollage(s)}
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderFeatures(s.features)}
          ${renderPullquote(s.pullquote)}
          ${renderTags(s.tags)}
          ${renderCta(s.cta)}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderDiary(s, total) {
    return `
      <article class="spread spread--diary" id="spread-${esc(s.id)}" data-page="${s.page}">
        ${renderCollage(s)}
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderFeatures(s.features)}
          ${renderPullquote(s.pullquote)}
          ${renderStamp(s.stamp)}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderBackCover(s, total) {
    const links = (s.links || []).map(l =>
      `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`
    ).join('');
    return `
      <article class="spread spread--back" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="panel">
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body"><p>${esc(s.body)}</p></div>
          <ul class="links">${links}</ul>
          ${s.note ? `<p class="footer-note">${esc(s.note)}</p>` : ''}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  const RENDERERS = {
    cover: renderCover,
    index: renderIndex,
    editorial: renderEditorial,
    product: renderProduct,
    web: renderWeb,
    diary: renderDiary,
    'back-cover': renderBackCover
  };

  function renderSpread(s, total) {
    const fn = RENDERERS[s.layout];
    if (!fn) return renderEditorial(s, total);
    return fn(s, total);
  }

  function initChrome(meta) {
    const issueEl = document.getElementById('zine-issue-label');
    if (issueEl && meta) {
      issueEl.textContent = `${meta.title || 'Fanzine'} #${meta.issue || 1}`;
    }
  }

  function initReveal() {
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    const spreads = document.querySelectorAll('.spread');
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          const pageEl = document.getElementById('zine-page-label');
          if (pageEl) pageEl.textContent = `Pág ${e.target.dataset.page || '?'}`;
        }
      });
    }, { threshold: 0.25 });
    spreads.forEach(el => revealObserver.observe(el));
  }

  function collectGallery(btn) {
    const galleryId = btn.getAttribute('data-lightbox-gallery');
    const scope = galleryId
      ? document.querySelector(`[data-gallery="${galleryId}"]`)
      : btn.closest('.collage-stack, .collage-cluster, .cover-polaroids');
    if (!scope) {
      return [{
        src: btn.getAttribute('data-lightbox-src'),
        alt: btn.getAttribute('data-lightbox-alt') || ''
      }];
    }
    return [...scope.querySelectorAll('[data-lightbox-src]')].map(el => ({
      src: el.getAttribute('data-lightbox-src'),
      alt: el.getAttribute('data-lightbox-alt') || ''
    }));
  }

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbClose = document.getElementById('lightbox-close');
    const lbPrev = document.getElementById('lightbox-prev');
    const lbNext = document.getElementById('lightbox-next');
    const lbCounter = document.getElementById('lightbox-counter');
    if (!lb || !lbImg) return;

    let gallery = [];
    let galleryIndex = 0;

    function showSlide() {
      const item = gallery[galleryIndex];
      if (!item) return;
      lbImg.src = item.src;
      lbImg.alt = item.alt;
      const multi = gallery.length > 1;
      if (lbPrev) lbPrev.hidden = !multi;
      if (lbNext) lbNext.hidden = !multi;
      if (lbCounter) {
        lbCounter.hidden = !multi;
        lbCounter.textContent = `${galleryIndex + 1} / ${gallery.length}`;
      }
    }

    function openFrom(btn) {
      gallery = collectGallery(btn);
      const src = btn.getAttribute('data-lightbox-src');
      galleryIndex = Math.max(0, gallery.findIndex(item => item.src === src));
      showSlide();
      lb.hidden = false;
      document.body.classList.add('lightbox-open');
      lbClose?.focus();
    }

    function close() {
      lb.hidden = true;
      lbImg.src = '';
      gallery = [];
      galleryIndex = 0;
      document.body.classList.remove('lightbox-open');
    }

    function step(delta) {
      if (gallery.length < 2) return;
      galleryIndex = (galleryIndex + delta + gallery.length) % gallery.length;
      showSlide();
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-lightbox-src]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openFrom(btn);
    });

    lbClose?.addEventListener('click', close);
    lbPrev?.addEventListener('click', e => { e.stopPropagation(); step(-1); });
    lbNext?.addEventListener('click', e => { e.stopPropagation(); step(1); });
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.classList.contains('lightbox__backdrop')) close();
    });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
  }

  function wrapFlipPage(html, s, index) {
    const hard = s.layout === 'cover' || s.layout === 'back-cover';
    const parity = index % 2 === 0 ? 'even' : 'odd';
    return `<div class="flip-page" data-density="${hard ? 'hard' : 'soft'}" data-spread-id="${esc(s.id)}" data-page-parity="${parity}">${html}</div>`;
  }

  function preloadFlipImages(root) {
    if (!root) return;
    root.querySelectorAll('img').forEach(img => {
      img.loading = 'eager';
      if (!img.complete && img.decode) img.decode().catch(() => {});
    });
  }

  function spreadIndexFromId(id) {
    if (!id) return -1;
    return spreadIds.indexOf(id);
  }

  function spreadIndexFromHash() {
    const hash = location.hash.replace(/^#/, '').replace(/^spread-/, '');
    if (!hash) return 0;
    const idx = spreadIndexFromId(hash);
    return idx >= 0 ? idx : 0;
  }

  function restoreFlipBook() {
    const root = document.getElementById(ROOT_ID);
    const html = pristineFlipBookHtml || flipBookHtml;
    if (!root || !html) return null;
    if (!document.getElementById('flip-book')) {
      root.innerHTML = `<div class="flip-book" id="flip-book">${html}</div>`;
    }
    return document.getElementById('flip-book');
  }

  function destroyPageFlip() {
    if (!pageFlipInstance) return;
    pageFlipInstance.destroy();
    pageFlipInstance = null;
    restoreFlipBook();
  }

  function initMagazine(total) {
    const mq = window.matchMedia(MAGAZINE_BP);
    const nav = document.getElementById('magazine-nav');
    const edges = document.getElementById('magazine-edges');
    const prevBtn = document.getElementById('magazine-prev');
    const nextBtn = document.getElementById('magazine-next');
    const edgePrev = document.getElementById('magazine-edge-prev');
    const edgeNext = document.getElementById('magazine-edge-next');
    const indicator = document.getElementById('magazine-indicator');
    const pageChrome = document.getElementById('zine-page-label');
    const flipBook = document.getElementById('flip-book');

    let enabled = false;
    let current = 0;

    function updateChrome(index) {
      const spreadEl = document.querySelector(`[data-spread-id="${spreadIds[index]}"] .spread`);
      const page = spreadEl?.dataset.page || index + 1;
      if (indicator) indicator.textContent = `${index + 1} / ${total}`;
      if (pageChrome) pageChrome.textContent = `Pág ${page}`;
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= spreadIds.length - 1;
      if (flipBook) flipBook.dataset.page = String(index + 1);
    }

    function setHash(index, replace) {
      const id = spreadIds[index];
      if (!id) return;
      const url = `${location.pathname}${location.search}#spread-${id}`;
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
    }

    function goTo(index, animate = true) {
      if (!pageFlipInstance) return;
      const next = Math.max(0, Math.min(index, spreadIds.length - 1));
      if (animate) pageFlipInstance.flip(next);
      else {
        pageFlipInstance.turnToPage(next);
        current = next;
        updateChrome(current);
        setHash(current, false);
      }
    }

    function go(delta) {
      if (!pageFlipInstance) return;
      if (delta > 0) pageFlipInstance.flipNext();
      else pageFlipInstance.flipPrev();
    }

    function onFlip(e) {
      current = e.data;
      updateChrome(current);
      setHash(current, false);
    }

    function onKeydown(e) {
      if (!enabled || !pageFlipInstance) return;
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const lb = document.getElementById('lightbox');
      if (lb && !lb.hidden) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(spreadIds.length - 1);
      }
    }

    function onIndexClick(e) {
      if (!enabled) return;
      const link = e.target.closest('.index-list__link');
      if (!link) return;
      e.preventDefault();
      const href = link.getAttribute('href') || '';
      const id = href.replace(/^#spread-/, '');
      const idx = spreadIndexFromId(id);
      if (idx < 0) return;
      goTo(idx);
    }

    function onHashChange() {
      if (!enabled || !pageFlipInstance) return;
      const idx = spreadIndexFromHash();
      if (idx !== current) goTo(idx, false);
    }

    function enable() {
      const book = restoreFlipBook() || document.getElementById('flip-book');
      if (enabled || !book || typeof St === 'undefined' || !St.PageFlip) return;
      enabled = true;

      if (revealObserver) {
        revealObserver.disconnect();
        revealObserver = null;
      }

      document.body.classList.add('magazine-mode');
      if (nav) nav.hidden = false;
      if (edges) {
        edges.hidden = false;
        edges.setAttribute('aria-hidden', 'false');
      }

      preloadFlipImages(book);
      book.querySelectorAll('.spread').forEach(s => s.classList.add('is-visible'));

      const pages = book.querySelectorAll('.flip-page');
      pageFlipInstance = new St.PageFlip(book, {
        width: 480,
        height: 680,
        size: 'stretch',
        minWidth: 320,
        maxWidth: 560,
        minHeight: 460,
        maxHeight: 900,
        maxShadowOpacity: 0.6,
        showCover: true,
        mobileScrollSupport: false,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        drawShadow: true,
        flippingTime: 900,
        startPage: spreadIndexFromHash()
      });

      pageFlipInstance.loadFromHTML(pages);
      pageFlipInstance.on('flip', onFlip);
      requestAnimationFrame(() => pageFlipInstance.update());

      current = pageFlipInstance.getCurrentPageIndex();
      updateChrome(current);
      if (!location.hash) setHash(current, true);

      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onIndexClick);
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('resize', onResize);
    }

    magazineDisable = disable;
    reenableMagazine = () => {
      if (mq.matches) enable();
    };

    function onResize() {
      if (pageFlipInstance) pageFlipInstance.update();
    }

    function disable() {
      if (!enabled) return;
      enabled = false;

      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onIndexClick);
      window.removeEventListener('hashchange', onHashChange);

      destroyPageFlip();

      document.body.classList.remove('magazine-mode');
      if (nav) nav.hidden = true;
      if (edges) {
        edges.hidden = true;
        edges.setAttribute('aria-hidden', 'true');
      }

      initReveal();
    }

    function onMqChange(e) {
      if (e.matches) enable();
      else disable();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));
    if (edgePrev) edgePrev.addEventListener('click', () => go(-1));
    if (edgeNext) edgeNext.addEventListener('click', () => go(1));

    if (mq.matches) enable();
    mq.addEventListener('change', onMqChange);
  }

  function waitForPrintImages() {
    const images = document.querySelectorAll('#zine-root img');
    return Promise.all([...images].map(img => {
      img.loading = 'eager';
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function preparePrintDOM() {
    if (magazineDisable) magazineDisable();
    else destroyPageFlip();
    document.body.classList.remove('magazine-mode');
    document.querySelectorAll('.spread').forEach(s => {
      s.classList.add('is-visible');
      s.classList.remove('is-active', 'is-flip-under', 'is-flip-out-forward', 'is-flip-out-back');
      s.removeAttribute('aria-hidden');
      s.style.visibility = '';
      s.style.opacity = '';
    });
    document.querySelectorAll('.flip-page').forEach(p => {
      p.style.display = 'block';
      p.style.position = 'static';
      p.style.transform = 'none';
    });
  }

  async function preparePrint() {
    preparePrintDOM();
    document.body.classList.add('printing', 'print-prep');
    await waitForPrintImages();
    await new Promise(r => setTimeout(r, 120));
  }

  function cleanupPrint() {
    document.body.classList.remove('printing', 'print-prep');
    if (reenableMagazine) reenableMagazine();
  }

  function initPrint() {
    const btn = document.getElementById('btn-print');
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          btn.disabled = true;
          await preparePrint();
          window.print();
        } catch (err) {
          console.error('PDF error:', err);
        } finally {
          btn.disabled = false;
        }
      });
    }
    window.addEventListener('beforeprint', () => { preparePrint(); });
    window.addEventListener('afterprint', cleanupPrint);
  }

  async function boot() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const spreads = data.spreads || [];
      const total = spreads.length;

      initChrome(data.meta);
      document.title = `${data.meta?.author || 'Facundo Galetta'} — ${data.meta?.title || 'Fanzine'}`;

      const sorted = [...spreads].sort((a, b) => a.page - b.page);
      spreadIds = sorted.map(s => s.id);
      const bookHtml = sorted.map((s, i) => wrapFlipPage(renderSpread(s, total), s, i)).join('');
      pristineFlipBookHtml = bookHtml;
      flipBookHtml = bookHtml;
      root.innerHTML = `<div class="flip-book" id="flip-book">${bookHtml}</div>`;
      preloadFlipImages(root);

      initReveal();
      initLightbox();
      initMagazine(total);
      initPrint();

      document.getElementById('cover-open-btn')?.addEventListener('click', () => {
        if (window.matchMedia(MAGAZINE_BP).matches && pageFlipInstance) {
          pageFlipInstance.flipNext();
        } else {
          document.getElementById('spread-intro')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } catch (err) {
      root.innerHTML = `<p style="padding:2rem;color:#e63946;font-family:monospace">Error cargando spreads.json: ${esc(err.message)}<br><small>Abrí con un servidor local si fetch falla por CORS (file://).</small></p>`;
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();