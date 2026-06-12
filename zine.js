/**
 * CONSTRUÍ ESTO — Fanzine renderer
 * Lee spreads.json y monta las páginas en #zine-root
 */
(function () {
  'use strict';

  const ROOT_ID = 'zine-root';
  const DATA_URL = 'spreads.json';

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

  function renderCollagePhoto(item) {
    const tilt = item.tilt != null ? item.tilt : 0;
    const size = item.size || 'md';
    return `
      <figure class="collage-photo collage-photo--${esc(size)}" style="--photo-tilt:${tilt}deg">
        <img src="${imgSrc(item.src)}" alt="" loading="lazy" decoding="async">
      </figure>`;
  }

  function renderCollage(s) {
    if (s.image) {
      const tilt = s.imageTilt != null ? s.imageTilt : 0;
      return `
        <figure class="collage-photo collage-photo--spread" style="--photo-tilt:${tilt}deg">
          <img src="${imgSrc(s.image)}" alt="${esc(s.imageAlt || s.title)}" loading="lazy" decoding="async">
        </figure>`;
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
    return `
      <article class="spread spread--cover" id="spread-${esc(s.id)}" data-page="${s.page}">
        <h1 class="spread__masthead">${esc(s.title)}</h1>
        <p class="spread__issue">${esc(s.hook)}</p>
        <p class="spread__author">${esc(s.body)}</p>
        ${s.stamp ? `<span class="spread__stamp">${esc(s.stamp)}</span>` : ''}
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
        ${collage ? `<div class="collage-cluster" aria-hidden="true">${collage}</div>` : ''}
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
    if (!fn) {
      console.warn('Unknown layout:', s.layout);
      return renderEditorial(s, total);
    }
    return fn(s, total);
  }

  function initChrome(meta) {
    const issueEl = document.getElementById('zine-issue-label');
    const pageEl = document.getElementById('zine-page-label');
    if (issueEl && meta) {
      issueEl.textContent = `${meta.title || 'Fanzine'} #${meta.issue || 1}`;
    }
    return pageEl;
  }

  const MAGAZINE_BP = '(min-width: 900px)';

  let revealObserver = null;

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
          if (pageEl) {
            pageEl.textContent = `Pág ${e.target.dataset.page || '?'}`;
          }
        }
      });
    }, { threshold: 0.25 });
    spreads.forEach(el => revealObserver.observe(el));
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

    let spreads = [];
    let current = 0;
    let enabled = false;
    let transitioning = false;

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
    }

    function setHash(index, replace) {
      const id = spreads[index]?.id;
      if (!id) return;
      const url = `${location.pathname}${location.search}#${id}`;
      if (replace) {
        history.replaceState(null, '', url);
      } else {
        history.pushState(null, '', url);
      }
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

      transitioning = true;

      spreads.forEach((s, i) => {
        s.classList.remove('is-active', 'is-entering', 'is-leaving', 'is-entering-left', 'is-entering-right');
        if (i !== next && i !== prev) {
          s.setAttribute('aria-hidden', 'true');
        }
      });

      if (outgoing && prev !== next) {
        outgoing.classList.add('is-leaving');
        outgoing.classList.remove('is-active');
        if (direction < 0) outgoing.classList.add('is-leaving-left');
        if (direction > 0) outgoing.classList.add('is-leaving-right');
      }

      incoming.classList.add('is-visible', 'is-active');
      incoming.removeAttribute('aria-hidden');
      if (animate && direction !== 0) {
        incoming.classList.add(direction < 0 ? 'is-entering-left' : 'is-entering-right');
        incoming.classList.add('is-entering');
      }

      current = next;
      updateChrome(current);

      if (updateHash) setHash(current, replaceHash);

      window.setTimeout(() => {
        spreads.forEach(s => {
          s.classList.remove('is-entering', 'is-leaving', 'is-entering-left', 'is-entering-right');
        });
        transitioning = false;
      }, animate ? 420 : 0);
    }

    function go(delta) {
      if (transitioning) return;
      const next = current + delta;
      if (next < 0 || next >= spreads.length) return;
      showPage(next, { direction: delta });
    }

    function onWheel(e) {
      if (!enabled) return;
      if (e.target.closest('.panel')) return;
      e.preventDefault();
    }

    function onKeydown(e) {
      if (!enabled) return;
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
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
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      const idx = spreadIndexFromId(href.slice(1));
      if (idx < 0) return;
      const direction = idx > current ? 1 : idx < current ? -1 : 0;
      showPage(idx, { direction });
    }

    function onHashChange() {
      if (!enabled) return;
      const idx = spreadIndexFromHash();
      if (idx !== current) {
        const direction = idx > current ? 1 : -1;
        showPage(idx, { direction, updateHash: false });
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
    }

    function disable() {
      if (!enabled) return;
      enabled = false;
      transitioning = false;

      document.body.classList.remove('magazine-mode');
      if (nav) nav.hidden = true;
      if (edges) {
        edges.hidden = true;
        edges.setAttribute('aria-hidden', 'true');
      }

      spreads.forEach(s => {
        s.classList.remove(
          'is-active', 'is-entering', 'is-leaving',
          'is-entering-left', 'is-entering-right'
        );
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
      img.decoding = 'sync';
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  async function preparePrint() {
    document.querySelectorAll('.spread').forEach(s => {
      s.classList.add('is-visible');
    });
    document.body.classList.add('printing');
    await waitForPrintImages();
  }

  function cleanupPrint() {
    document.body.classList.remove('printing');
  }

  function initPrint() {
    const btn = document.getElementById('btn-print');
    if (btn) {
      btn.addEventListener('click', async () => {
        await preparePrint();
        window.print();
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

      root.innerHTML = spreads
        .sort((a, b) => a.page - b.page)
        .map(s => renderSpread(s, total))
        .join('');

      initReveal();
      initMagazine(total);
      initPrint();
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