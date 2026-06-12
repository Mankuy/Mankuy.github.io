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

  function initReveal() {
    const spreads = document.querySelectorAll('.spread');
    const obs = new IntersectionObserver(entries => {
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
    spreads.forEach(el => obs.observe(el));
  }

  function preparePrint() {
    document.querySelectorAll('.spread').forEach(s => s.classList.add('is-visible'));
    document.body.classList.add('printing');
  }

  function cleanupPrint() {
    document.body.classList.remove('printing');
  }

  function initPrint() {
    const btn = document.getElementById('btn-print');
    if (btn) {
      btn.addEventListener('click', () => {
        preparePrint();
        window.print();
      });
    }
    window.addEventListener('beforeprint', preparePrint);
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