/**
 * CONSTRUÍ ESTO — Fanzine renderer
 * Revista digital con volteo de página, lightbox y PDF
 */
(function () {
  'use strict';

  const ROOT_ID = 'zine-root';
  const DATA_URL = 'spreads.json';
  const MAGAZINE_BP = '(min-width: 600px)';
  const SCROLL_MAX = 599;
  const LANDSCAPE_MIN = 1024;
  const PAGE_RATIO = 10 / 14;
  const PAGE_MAX_H = 760;
  const PAGE_VH_RATIO = 0.84;

  let revealObserver = null;
  let pageFlipInstance = null;
  let spreadIds = [];
  let flipSpreadIds = [];
  let flipPageTotal = 0;
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

  function imgWebpSrc(path) {
    const src = imgSrc(path);
    return src.replace(/\.png$/i, '.webp');
  }

  function renderPicture(path, attrs = {}) {
    if (!path) return '';
    const src = imgSrc(path);
    const webp = imgWebpSrc(path);
    const attrStr = Object.entries(attrs)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
      .join('');
    return `<picture><source srcset="${webp}" type="image/webp"><img src="${src}"${attrStr}></picture>`;
  }

  function bodyHtml(text) {
    if (!text) return '';
    return text.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
  }

  function spreadImages(s) {
    if (s.images && s.images.length) return s.images;
    if (s.collage && s.collage.length) {
      return s.collage.map(c => ({ src: c.src, alt: c.alt || '', tilt: c.tilt }));
    }
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
        <button type="button" class="collage-photo__btn" data-lightbox-src="${imgWebpSrc(img.src)}" data-lightbox-alt="${esc(alt)}"${gallery} aria-label="Ver imagen en grande">
          ${renderPicture(img.src, { alt, loading, decoding: 'async' })}
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
          : imgs.length >= 4
            ? 'collage-stack--mosaic'
            : 'collage-stack--multi';
      return `<div class="collage-stack ${stackClass}" data-gallery="${gallery}">${
        imgs.map((img, i) => renderPhoto(img, { gallery, loading: 'eager', index: i })).join('')
      }</div>`;
    }
    if (s.imagePlaceholder) return renderWipStamp(s);
    return '';
  }

  function abbreviateTier(tier) {
    const map = {
      'público': 'PÚBLICO',
      publico: 'PÚBLICO',
      web: 'WEB',
      personal: 'PERSONAL',
      'en desarrollo': 'WIP'
    };
    const key = String(tier || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return map[key] || String(tier || '').toUpperCase();
  }

  function tierClass(tier) {
    const key = String(tier || '').toLowerCase().replace(/\s+/g, '-');
    if (key === 'público' || key === 'publico') return 'público';
    return key;
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
              <span class="index-list__tier index-list__tier--${esc(tierClass(it.tier))}">${esc(abbreviateTier(it.tier))}</span>
            </a>
          </li>`).join('')}
      </ol>`;
  }

  function renderCover(s, total) {
    const leadHtml = s.lead ? `<p class="cover-lead">${esc(s.lead)}</p>` : '';

    return `
      <article class="spread spread--cover spread--cover--type" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="cover-spine" aria-hidden="true">
          <span class="cover-barcode">FG·001·2026</span>
        </div>
        <div class="cover-inner cover-inner--composed">
          <header class="cover-zone cover-zone--top cover-mast">
            <span class="cover-kicker">Fanzine · Facundo Galetta</span>
            <span class="cover-price">${esc(s.stamp || '')}</span>
          </header>
          <div class="cover-zone cover-zone--center cover-stage">
            <div class="cover-poster cover-poster--core">
              <h1 class="spread__masthead">${esc(s.title)}</h1>
              <p class="cover-deck">${esc(s.hook)}</p>
              ${leadHtml}
            </div>
          </div>
          <footer class="cover-zone cover-zone--bottom cover-footer">
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
        ${renderCollage(s)}
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

  function featureKicker(tier) {
    const map = {
      public: 'USAR HOY',
      web: 'EN LA WEB',
      personal: 'DE MI CASA'
    };
    return map[tier] || 'EN EL TALLER';
  }

  function isPhoneSrc(src) {
    return /telegram/i.test(src || '');
  }

  function renderBrowserFrame(hero, opts = {}) {
    const alt = hero.alt || '';
    const phone = hero.frame === 'phone' || isPhoneSrc(hero.src);
    const gallery = opts.gallery ? ` data-lightbox-gallery="${esc(opts.gallery)}"` : '';
    const frameClass = phone ? 'phone-frame' : 'browser-frame';
    const chrome = phone ? '' : `
        <div class="browser-frame__chrome" aria-hidden="true">
          <span></span><span></span><span></span>
          <span class="browser-frame__url">${esc(hero.url || 'localhost')}</span>
        </div>`;
    return `
      <figure class="feature-hero">
        <div class="${frameClass}">
          ${chrome}
          <button type="button" class="feature-hero__btn collage-photo__btn" data-lightbox-src="${imgWebpSrc(hero.src)}" data-lightbox-alt="${esc(alt)}"${gallery} aria-label="Ver imagen en grande">
            ${renderPicture(hero.src, { alt, loading: opts.loading || 'lazy', decoding: 'async' })}
          </button>
        </div>
        ${hero.caption ? `<figcaption class="feature-hero__caption">${esc(hero.caption)}</figcaption>` : ''}
      </figure>`;
  }

  function renderFeaturePolaroid(img, gallery, variant = 'text') {
    const tilt = img.tilt != null ? img.tilt : -5;
    const cls = variant === 'visual' ? 'feature-polaroid feature-polaroid--visual' : 'feature-polaroid';
    return `
      <figure class="${cls}" style="--photo-tilt:${tilt}deg">
        <button type="button" class="collage-photo__btn" data-lightbox-src="${imgWebpSrc(img.src)}" data-lightbox-alt="${esc(img.alt || '')}" data-lightbox-gallery="${esc(gallery)}" aria-label="Ver imagen en grande">
          ${renderPicture(img.src, { alt: img.alt || '', loading: 'lazy', decoding: 'async' })}
        </button>
      </figure>`;
  }

  function renderProjectLogo(logo) {
    if (!logo?.src) return '';
    return `
      <img class="feature-logo" src="${imgWebpSrc(logo.src)}" alt="" width="52" height="52" decoding="async" loading="lazy"
        onerror="this.onerror=null;this.src='${imgSrc(logo.src)}'">`;
  }

  function renderFeatureVisual(s, total) {
    const gallery = `spread-${s.id}`;
    const hero = s.hero || (s.images && s.images[0]
      ? { src: s.images[0].src, alt: s.images[0].alt || s.title, caption: s.title }
      : null);
    const secondary = s.secondaryImage || (s.images && s.images[1] ? s.images[1] : null);
    let visual = '';
    if (hero) visual = renderBrowserFrame(hero, { gallery, loading: 'eager' });
    else if (s.imagePlaceholder) visual = renderWipStamp(s);

    return `
      <article class="spread spread--feature spread--feature-visual" id="spread-${esc(s.id)}" data-page="${s.page}">
        <div class="feature-visual-stage">
          ${visual}
          ${secondary ? renderFeaturePolaroid(secondary, gallery, 'visual') : ''}
        </div>
        ${pageNum(s.page, total)}
      </article>`;
  }

  function renderFeatureText(s, total) {
    const textPage = s.page + 1;
    const cut = s.tier === 'public' ? '<div class="collage-cut">USAR<br>HOY</div>' : '';
    const logo = renderProjectLogo(s.logo);

    return `
      <article class="spread spread--feature spread--feature-text" data-page="${textPage}">
        ${cut}
        <div class="panel">
          <div class="feature-brand">
            ${logo}
            <p class="feature-kicker">${esc(featureKicker(s.tier))}</p>
          </div>
          <h2 class="panel__title">${esc(s.title)}</h2>
          <p class="panel__hook">${esc(s.hook)}</p>
          <div class="panel__body">${bodyHtml(s.body)}</div>
          ${renderFeatures(s.features)}
          ${renderTags(s.tags)}
          ${renderCta(s.cta)}
          ${renderStamp(s.stamp)}
        </div>
        ${pageNum(textPage, total)}
      </article>`;
  }

  function renderFeature(s, total) {
    return [renderFeatureVisual(s, total), renderFeatureText(s, total)];
  }

  function renderBackCover(s, total) {
    const gallery = `spread-${s.id}`;
    const collage = (s.collage || []).map(item => renderCollagePhoto(item, gallery)).join('');
    const links = (s.links || []).map(l =>
      `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`
    ).join('');
    return `
      <article class="spread spread--back" id="spread-${esc(s.id)}" data-page="${s.page}">
        ${collage ? `<div class="collage-cluster collage-cluster--back" data-gallery="${gallery}">${collage}</div>` : ''}
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
    feature: renderFeature,
    'back-cover': renderBackCover
  };

  function renderSpreadPages(s, total) {
    const fn = RENDERERS[s.layout];
    if (!fn) return [renderEditorial(s, total)];
    const result = fn(s, total);
    return Array.isArray(result) ? result : [result];
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
    const parity = index % 2 === 0 ? 'even' : 'odd';
    return `<div class="flip-page" data-density="soft" data-spread-id="${esc(s.id)}" data-page-parity="${parity}">${html}</div>`;
  }

  function preloadFlipImages(root) {
    if (!root) return;
    root.querySelectorAll('img').forEach(img => {
      img.loading = 'eager';
      if (!img.complete && img.decode) img.decode().catch(() => {});
    });
  }

  function auditImages(root) {
    if (!root) return;
    root.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src') || '';
      const warn = () => console.warn('[zine] Imagen 404 o inválida:', src);
      if (img.complete) {
        if (img.naturalWidth === 0) warn();
      } else {
        img.addEventListener('error', warn, { once: true });
      }
    });
  }

  function spreadIndexFromId(id) {
    if (!id) return -1;
    return flipSpreadIds.indexOf(id);
  }

  function spreadIndexFromHash() {
    const hash = location.hash.replace(/^#/, '').replace(/^spread-/, '');
    if (!hash) return 0;
    const idx = spreadIndexFromId(hash);
    return idx >= 0 ? idx : 0;
  }

  function spreadIdFromHash() {
    const hash = location.hash.replace(/^#/, '').replace(/^spread-/, '');
    return hash || null;
  }

  function scrollToSpreadId(id, behavior = 'smooth') {
    if (!id) return false;
    const el = document.getElementById(`spread-${id}`);
    if (!el) return false;
    el.scrollIntoView({ behavior, block: 'start' });
    const url = `${location.pathname}${location.search}#spread-${id}`;
    history.replaceState(null, '', url);
    return true;
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

  function getViewBucket() {
    const w = window.innerWidth;
    if (w <= SCROLL_MAX) return 'scroll';
    if (w < LANDSCAPE_MIN) return 'portrait';
    return 'landscape';
  }

  function computePageDimensions() {
    const pageH = Math.min(window.innerHeight * PAGE_VH_RATIO, PAGE_MAX_H);
    const pageW = pageH * PAGE_RATIO;
    return { pageW, pageH };
  }

  function applyFlipBookDimensions(book, bucket, dims) {
    const bookW = bucket === 'landscape' ? dims.pageW * 2 : dims.pageW;
    book.style.width = `${Math.round(bookW)}px`;
    book.style.height = `${Math.round(dims.pageH)}px`;
    book.style.maxWidth = 'none';
    book.style.minWidth = '0';
  }

  function clearFlipBookDimensions(book) {
    if (!book) return;
    book.style.width = '';
    book.style.height = '';
    book.style.maxWidth = '';
    book.style.minWidth = '';
  }

  function setMagazineBucketClass(bucket) {
    document.body.classList.remove('magazine-mode--portrait', 'magazine-mode--landscape');
    if (bucket === 'portrait') document.body.classList.add('magazine-mode--portrait');
    if (bucket === 'landscape') document.body.classList.add('magazine-mode--landscape');
  }

  function destroyPageFlip() {
    if (!pageFlipInstance) return;
    pageFlipInstance.destroy();
    pageFlipInstance = null;
    restoreFlipBook();
  }

  const FLIP_HINT_KEY = 'zine-flip-hint-seen';
  const FLIP_SOUND_KEY = 'zine-flip-sound';

  function initFlipUx() {
    const hint = document.getElementById('flip-hint');
    const soundBtn = document.getElementById('btn-flip-sound');
    let soundOn = localStorage.getItem(FLIP_SOUND_KEY) === '1';

    function dismissHint() {
      if (!hint || hint.hidden) return;
      hint.hidden = true;
      localStorage.setItem(FLIP_HINT_KEY, '1');
    }

    function showHintIfNeeded() {
      if (!hint || !window.matchMedia(MAGAZINE_BP).matches) return;
      if (localStorage.getItem(FLIP_HINT_KEY)) return;
      hint.hidden = false;
    }

    function playFlipSound() {
      if (!soundOn) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = 0.07;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
        setTimeout(() => ctx.close(), 180);
      } catch (_) { /* noop */ }
    }

    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        localStorage.setItem(FLIP_SOUND_KEY, soundOn ? '1' : '0');
        soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
        soundBtn.textContent = soundOn ? '🔊' : '🔇';
      });
    }

    return { dismissHint, showHintIfNeeded, playFlipSound };
  }

  function initMagazine(total) {
    const mq = window.matchMedia(MAGAZINE_BP);
    const flipUx = initFlipUx();
    let scrollModeActive = false;
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
    let lastBucket = null;
    let lastDimsKey = null;
    let resizeTimer = null;
    let skipInitialHashSync = !location.hash;
    let listeningFlip = false;
    let settling = true;
    let settleTimer = null;

    function updateChrome(index) {
      const flipPage = document.querySelectorAll('.flip-page')[index];
      const spreadEl = flipPage?.querySelector('.spread');
      const page = spreadEl?.dataset.page || index + 1;
      if (indicator) indicator.textContent = `${index + 1} / ${flipPageTotal}`;
      if (pageChrome) pageChrome.textContent = `Pág ${page}`;
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= flipPageTotal - 1;
      if (flipBook) flipBook.dataset.page = String(index + 1);
    }

    function setHash(index) {
      if (!listeningFlip) return;
      const id = flipSpreadIds[index];
      if (!id) return;
      const url = `${location.pathname}${location.search}#spread-${id}`;
      history.replaceState(null, '', url);
    }

    function goTo(index, animate = true) {
      if (!pageFlipInstance) return;
      const next = Math.max(0, Math.min(index, flipPageTotal - 1));
      if (animate) pageFlipInstance.flip(next);
      else {
        pageFlipInstance.turnToPage(next);
        current = next;
        updateChrome(current);
        setHash(current);
      }
    }

    function go(delta) {
      if (!pageFlipInstance) return;
      if (delta > 0) pageFlipInstance.flipNext();
      else pageFlipInstance.flipPrev();
    }

    function onFlip(e) {
      if (!listeningFlip || settling) return;
      current = e.data;
      updateChrome(current);
      if (flipUx) {
        flipUx.dismissHint();
        flipUx.playFlipSound();
      }
      if (skipInitialHashSync) {
        skipInitialHashSync = false;
        return;
      }
      setHash(current);
    }

    function armHashSync(startPage) {
      skipInitialHashSync = !location.hash;
      if (pageFlipInstance && startPage != null) {
        const idx = pageFlipInstance.getCurrentPageIndex();
        if (idx !== startPage) {
          pageFlipInstance.turnToPage(startPage);
        }
        current = startPage;
        updateChrome(current);
      }
      settling = false;
      listeningFlip = true;
      if (startPage === 0) flipUx.showHintIfNeeded();
    }

    function bindFlipHandler(instance) {
      instance.on('flip', onFlip);
    }

    function settlePageFlip(instance, startPage) {
      clearTimeout(settleTimer);
      settling = true;
      listeningFlip = false;
      const delay = startPage > 0 ? 250 : 500;
      settleTimer = setTimeout(() => {
        settleTimer = null;
        armHashSync(startPage);
        bindFlipHandler(instance);
      }, delay);
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
        goTo(flipPageTotal - 1);
      }
    }

    function onIndexClick(e) {
      const link = e.target.closest('.index-list__link');
      if (!link) return;
      e.preventDefault();
      const href = link.getAttribute('href') || '';
      const id = href.replace(/^#spread-/, '');
      if (!id) return;
      if (scrollModeActive) {
        scrollToSpreadId(id);
        return;
      }
      if (!enabled) return;
      const idx = spreadIndexFromId(id);
      if (idx < 0) return;
      goTo(idx);
    }

    function onHashChange() {
      const id = spreadIdFromHash();
      if (scrollModeActive) {
        if (id) scrollToSpreadId(id, 'auto');
        return;
      }
      if (!enabled || !pageFlipInstance || !listeningFlip) return;
      const idx = spreadIndexFromHash();
      if (idx !== current) goTo(idx, false);
    }

    function mountPageFlip(book, startPage) {
      const bucket = getViewBucket();
      const dims = computePageDimensions();
      const pageW = Math.round(dims.pageW);
      const pageH = Math.round(dims.pageH);

      applyFlipBookDimensions(book, bucket, dims);
      setMagazineBucketClass(bucket);

      const pages = book.querySelectorAll('.flip-page');
      const instance = new St.PageFlip(book, {
        width: pageW,
        height: pageH,
        size: 'fixed',
        minWidth: pageW,
        maxWidth: pageW,
        minHeight: pageH,
        maxHeight: pageH,
        maxShadowOpacity: 0.4,
        showCover: false,
        mobileScrollSupport: false,
        usePortrait: true,
        useMouseEvents: true,
        clickEventForward: true,
        swipeDistance: 30,
        startZIndex: 0,
        autoSize: false,
        drawShadow: true,
        flippingTime: 700,
        startPage
      });

      instance.loadFromHTML(pages);
      requestAnimationFrame(() => instance.update());
      settlePageFlip(instance, startPage);

      return {
        instance,
        bucket,
        dimsKey: `${pageW}x${pageH}`
      };
    }

    function reinitPageFlip(startPage) {
      const book = restoreFlipBook() || document.getElementById('flip-book');
      if (!book || typeof St === 'undefined' || !St.PageFlip) return;

      listeningFlip = false;
      settling = true;
      destroyPageFlip();
      preloadFlipImages(book);
      book.querySelectorAll('.spread').forEach(s => s.classList.add('is-visible'));

      const mounted = mountPageFlip(book, startPage);
      pageFlipInstance = mounted.instance;
      lastBucket = mounted.bucket;
      lastDimsKey = mounted.dimsKey;

      current = pageFlipInstance.getCurrentPageIndex();
      updateChrome(current);
    }

    function enable(startPageOverride) {
      const book = restoreFlipBook() || document.getElementById('flip-book');
      if (enabled || !book || typeof St === 'undefined' || !St.PageFlip) return;
      enabled = true;
      skipInitialHashSync = !location.hash;

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

      const startPage = startPageOverride ?? spreadIndexFromHash();
      listeningFlip = false;
      settling = true;
      const mounted = mountPageFlip(book, startPage);
      pageFlipInstance = mounted.instance;
      lastBucket = mounted.bucket;
      lastDimsKey = mounted.dimsKey;

      current = pageFlipInstance.getCurrentPageIndex();
      updateChrome(current);

      teardownScrollMode();

      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onIndexClick);
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('resize', onResize);
    }

    function setScrollChrome(hidden) {
      const hint = document.getElementById('flip-hint');
      const soundBtn = document.getElementById('btn-flip-sound');
      if (hint) hint.hidden = true;
      if (soundBtn) soundBtn.hidden = hidden;
    }

    function enableScrollMode() {
      if (scrollModeActive) return;
      scrollModeActive = true;
      document.body.classList.add('scroll-mode');
      setScrollChrome(true);
      document.addEventListener('click', onIndexClick);
      window.addEventListener('hashchange', onHashChange);
      const id = spreadIdFromHash();
      if (id) requestAnimationFrame(() => scrollToSpreadId(id, 'auto'));
    }

    function teardownScrollMode() {
      if (!scrollModeActive) return;
      scrollModeActive = false;
      document.body.classList.remove('scroll-mode');
      setScrollChrome(false);
      document.removeEventListener('click', onIndexClick);
      window.removeEventListener('hashchange', onHashChange);
    }

    magazineDisable = disable;
    reenableMagazine = () => {
      if (mq.matches) enable();
      else enableScrollMode();
    };

    function onResize() {
      if (!enabled || !pageFlipInstance) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!enabled || !pageFlipInstance) return;
        const bucket = getViewBucket();
        const dims = computePageDimensions();
        const dimsKey = `${Math.round(dims.pageW)}x${Math.round(dims.pageH)}`;
        if (bucket === lastBucket && dimsKey === lastDimsKey) {
          pageFlipInstance.update();
          return;
        }
        reinitPageFlip(pageFlipInstance.getCurrentPageIndex());
      }, 200);
    }

    function disable() {
      if (!enabled) return;
      enabled = false;

      clearTimeout(resizeTimer);
      clearTimeout(settleTimer);
      resizeTimer = null;
      settleTimer = null;
      lastBucket = null;
      lastDimsKey = null;

      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onIndexClick);
      window.removeEventListener('hashchange', onHashChange);

      const book = document.getElementById('flip-book');
      listeningFlip = false;
      settling = true;
      destroyPageFlip();
      clearFlipBookDimensions(book);

      document.body.classList.remove('magazine-mode');
      document.body.classList.remove('magazine-mode--portrait', 'magazine-mode--landscape');
      if (nav) nav.hidden = true;
      if (edges) {
        edges.hidden = true;
        edges.setAttribute('aria-hidden', 'true');
      }

      enableScrollMode();
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
    else enableScrollMode();
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
    document.body.classList.remove('magazine-mode', 'magazine-mode--portrait', 'magazine-mode--landscape');
    document.body.classList.remove('scroll-mode');
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
    window.zinePreparePrintDOM = preparePrintDOM;
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
      const sorted = [...spreads].sort((a, b) => a.page - b.page);
      flipPageTotal = sorted.reduce((n, s) => n + (s.layout === 'feature' ? 2 : 1), 0);

      initChrome(data.meta);
      document.title = `${data.meta?.author || 'Facundo Galetta'} — ${data.meta?.title || 'Fanzine'}`;

      spreadIds = sorted.map(s => s.id);
      let flipIndex = 0;
      flipSpreadIds = [];
      const bookHtml = sorted.map(s => {
        const pages = renderSpreadPages(s, flipPageTotal);
        return pages.map(html => {
          flipSpreadIds.push(s.id);
          const wrapped = wrapFlipPage(html, s, flipIndex);
          flipIndex += 1;
          return wrapped;
        }).join('');
      }).join('');
      pristineFlipBookHtml = bookHtml;
      flipBookHtml = bookHtml;
      root.innerHTML = `<div class="flip-book" id="flip-book">${bookHtml}</div>`;
      preloadFlipImages(root);
      auditImages(root);

      initReveal();
      initLightbox();
      initMagazine(flipPageTotal);
      initPrint();

      document.getElementById('cover-open-btn')?.addEventListener('click', () => {
        document.getElementById('flip-hint')?.setAttribute('hidden', '');
        localStorage.setItem(FLIP_HINT_KEY, '1');
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