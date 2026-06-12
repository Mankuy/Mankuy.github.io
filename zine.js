/**
 * CONSTRUÍ ESTO — Fanzine renderer
 * Revista digital con volteo de página, lightbox y PDF
 */
(function () {
  'use strict';

  const ROOT_ID = 'zine-root';
  const DATA_URL = 'spreads.json';
  const MAGAZINE_BP = '(min-width: 900px)';
  const FLIP_MS = 720;

  let revealObserver = null;

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
    return `
      <figure class="collage-photo collage-photo--${esc(size)} collage-photo--zoomable" style="--photo-tilt:${tilt}deg">
        <button type="button" class="collage-photo__btn" data-lightbox-src="${imgSrc(img.src)}" data-lightbox-alt="${esc(alt)}" aria-label="Ver imagen en grande">
          <img src="${imgSrc(img.src)}" alt="${esc(alt)}" loading="lazy" decoding="async">
        </button>
      </figure>`;
  }

  function renderCollagePhoto(item) {
    return renderPhoto({ src: item.src, alt: '', tilt: item.tilt }, { size: item.size || 'md' });
  }

  function renderCollage(s) {
    const imgs = spreadImages(s);
    if (imgs.length) {
      return `<div class="collage-stack">${imgs.map(img => renderPhoto(img)).join('')}</div>`;
    }
    if (s.imagePlaceholder) {
      return `
        <figure class="collage-placeholder" style="--photo-tilt:${s.imageTilt || -3}deg">
          <span class="collage-placeholder__label">${esc(s.imagePlaceholder)}</span>
          <span class="collage-placeholder__sub">captura próximamente</span>
        </figure>`;
    }
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
    const collage = (s.coverCollage || []).map((item, i) => {
      const src = typeof item === 'string' ? item : item.src;
      const tilt = typeof item === 'object' && item.tilt != null ? item.tilt : (i % 2 ? 5 : -4);
      return renderPhoto({ src, alt: '', tilt }, { size: 'cover' });
    }).join('');

    return `
      <article class="spread spread--cover" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="cover-spine" aria-hidden="true"></div>
        <div class="cover-inner">
          <header class="cover-top">
            <span class="cover-kicker">Fanzine · Facundo Galetta</span>
            <span class="cover-price">${esc(s.stamp || '')}</span>
          </header>
          <h1 class="spread__masthead">${esc(s.title)}</h1>
          <p class="spread__issue">${esc(s.hook)}</p>
          ${lines ? `<ul class="cover-lines">${lines}</ul>` : ''}
          <p class="spread__author">${esc(s.body)}</p>
          ${collage ? `<div class="cover-collage">${collage}</div>` : ''}
          <button type="button" class="cover-cta" id="cover-open-btn">${esc(s.ctaCover || 'Pasá la página →')}</button>
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderIndex(s, total) {
    const collage = (s.collage || []).map(renderCollagePhoto).join('');
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
        ${collage ? `<div class="collage-cluster">${collage}</div>` : ''}
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

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbClose = document.getElementById('lightbox-close');
    if (!lb || !lbImg) return;

    function open(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lb.hidden = false;
      document.body.classList.add('lightbox-open');
      lbClose?.focus();
    }

    function close() {
      lb.hidden = true;
      lbImg.src = '';
      document.body.classList.remove('lightbox-open');
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-lightbox-src]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      open(btn.getAttribute('data-lightbox-src'), btn.getAttribute('data-lightbox-alt'));
    });

    lbClose?.addEventListener('click', close);
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.classList.contains('lightbox__backdrop')) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !lb.hidden) close();
    });
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
    const book = document.getElementById('magazine-book');

    let spreads = [];
    let current = 0;
    let enabled = false;
    let transitioning = false;
    let goRef = null;

    function spreadIndexFromId(id) {
      if (!id) return -1;
      return spreads.findIndex(s => s.id === id);
    }

    function spreadIndexFromHash() {
      const hash = location.hash.replace(/^#/, '');
      if (!hash) return 0;
      const idx = spreadIndexFromId(hash);
      return idx >= 0 ? idx : 0;
    }

    function updateChrome(index) {
      const page = spreads[index]?.dataset.page || index + 1;
      if (indicator) indicator.textContent = `${index + 1} / ${total}`;
      if (pageChrome) pageChrome.textContent = `Pág ${page}`;
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= spreads.length - 1;
      if (book) book.dataset.page = String(index + 1);
    }

    function setHash(index, replace) {
      const id = spreads[index]?.id;
      if (!id) return;
      const url = `${location.pathname}${location.search}#${id}`;
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
    }

    function clearFlipClasses() {
      spreads.forEach(s => {
        s.classList.remove(
          'is-flip-out-forward', 'is-flip-out-back',
          'is-flip-under', 'is-entering', 'is-leaving',
          'is-entering-left', 'is-entering-right'
        );
      });
    }

    function showPage(index, opts = {}) {
      const { animate = true, direction = 0, updateHash = true, replaceHash = false } = opts;
      if (!spreads.length) return;

      const next = Math.max(0, Math.min(index, spreads.length - 1));
      if (next === current && enabled && spreads[current]?.classList.contains('is-active')) {
        updateChrome(current);
        return;
      }

      const prev = current;
      const outgoing = spreads[prev];
      const incoming = spreads[next];

      if (transitioning) return;
      transitioning = true;

      clearFlipClasses();

      spreads.forEach((s, i) => {
        s.classList.remove('is-active');
        if (i !== next) s.setAttribute('aria-hidden', 'true');
      });

      if (animate && direction !== 0 && outgoing && prev !== next) {
        incoming.classList.add('is-flip-under', 'is-visible');
        incoming.removeAttribute('aria-hidden');
        outgoing.classList.add(direction > 0 ? 'is-flip-out-forward' : 'is-flip-out-back');
        incoming.classList.add('is-active');

        window.setTimeout(() => {
          clearFlipClasses();
          spreads.forEach((s, i) => {
            if (i === next) {
              s.classList.add('is-active', 'is-visible');
              s.removeAttribute('aria-hidden');
            } else {
              s.setAttribute('aria-hidden', 'true');
            }
          });
          current = next;
          updateChrome(current);
          if (updateHash) setHash(current, replaceHash);
          transitioning = false;
        }, FLIP_MS);
      } else {
        spreads.forEach((s, i) => {
          if (i === next) {
            s.classList.add('is-active', 'is-visible');
            s.removeAttribute('aria-hidden');
          }
        });
        current = next;
        updateChrome(current);
        if (updateHash) setHash(current, replaceHash);
        transitioning = false;
      }
    }

    function go(delta) {
      if (transitioning) return;
      const next = current + delta;
      if (next < 0 || next >= spreads.length) return;
      showPage(next, { direction: delta });
    }

    goRef = go;

    function onWheel(e) {
      if (!enabled) return;
      if (e.target.closest('.panel, .collage-stack, .cover-inner')) return;
      e.preventDefault();
    }

    function onKeydown(e) {
      if (!enabled) return;
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
        showPage(0, { direction: -1 });
      } else if (e.key === 'End') {
        e.preventDefault();
        showPage(spreads.length - 1, { direction: 1 });
      }
    }

    function onIndexClick(e) {
      if (!enabled) return;
      const link = e.target.closest('.index-list__link');
      if (!link) return;
      e.preventDefault();
      const idx = spreadIndexFromId(link.getAttribute('href')?.slice(1));
      if (idx < 0) return;
      showPage(idx, { direction: idx > current ? 1 : idx < current ? -1 : 0 });
    }

    function onHashChange() {
      if (!enabled) return;
      const idx = spreadIndexFromHash();
      if (idx !== current) {
        showPage(idx, { direction: idx > current ? 1 : -1, updateHash: false });
      }
    }

    function enable() {
      if (enabled) return;
      enabled = true;
      spreads = Array.from(document.querySelectorAll('.spread'));
      if (!spreads.length) return;

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

      spreads.forEach(s => s.classList.add('is-visible'));

      const start = spreadIndexFromHash();
      current = -1;
      showPage(start, { animate: false, direction: 0, replaceHash: !location.hash });

      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onIndexClick);
      document.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('hashchange', onHashChange);

      const coverBtn = document.getElementById('cover-open-btn');
      if (coverBtn) {
        coverBtn.addEventListener('click', () => go(1));
      }
    }

    function disable() {
      if (!enabled) return;
      enabled = false;
      transitioning = false;
      clearFlipClasses();

      document.body.classList.remove('magazine-mode');
      if (nav) nav.hidden = true;
      if (edges) {
        edges.hidden = true;
        edges.setAttribute('aria-hidden', 'true');
      }

      spreads.forEach(s => {
        s.classList.remove('is-active', 'is-flip-under', 'is-flip-out-forward', 'is-flip-out-back');
        s.removeAttribute('aria-hidden');
      });

      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onIndexClick);
      document.removeEventListener('wheel', onWheel);
      window.removeEventListener('hashchange', onHashChange);

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
    document.querySelectorAll('.spread').forEach(s => {
      s.classList.add('is-visible');
      s.classList.remove('is-active', 'is-flip-under', 'is-flip-out-forward', 'is-flip-out-back');
      s.removeAttribute('aria-hidden');
      s.style.visibility = '';
      s.style.opacity = '';
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

      root.innerHTML = `<div class="magazine-book" id="magazine-book">${
        spreads.sort((a, b) => a.page - b.page).map(s => renderSpread(s, total)).join('')
      }</div>`;

      initReveal();
      initLightbox();
      initMagazine(total);
      initPrint();

      document.getElementById('cover-open-btn')?.addEventListener('click', () => {
        if (!window.matchMedia(MAGAZINE_BP).matches) {
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