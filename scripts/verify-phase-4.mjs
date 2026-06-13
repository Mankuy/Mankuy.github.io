/**
 * FASE 4 acceptance — mobile scroll + PDF prep
 * Run: node scripts/verify-phase-4.mjs
 */
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';

async function evaluateMobile(page) {
  return page.evaluate(() => {
    const spreads = [...document.querySelectorAll('.spread')];
    const flipPages = [...document.querySelectorAll('.flip-page')];
    const stfItems = [...document.querySelectorAll('.stf__item')];
    const featurePairs = flipPages.filter((fp, i) => {
      const visual = fp.querySelector('.spread--feature-visual');
      const next = flipPages[i + 1];
      const text = next?.querySelector('.spread--feature-text');
      return visual && text;
    }).length;
    const heroHeights = spreads
      .filter(s => s.classList.contains('spread--feature-visual'))
      .flatMap(s => [...s.querySelectorAll('img')].map(img => img.getBoundingClientRect().height))
      .filter(h => h > 0);
    const minHeroH = heroHeights.length ? Math.min(...heroHeights) : 0;
    const coverMasthead = document.querySelector('.spread--cover .spread__masthead');
    return {
      scrollMode: document.body.classList.contains('scroll-mode'),
      magazineMode: document.body.classList.contains('magazine-mode'),
      spreadCount: spreads.length,
      flipPageCount: flipPages.length,
      stfItemCount: stfItems.length,
      featurePairs,
      minHeroH: Math.round(minHeroH),
      coverVisible: !!coverMasthead && coverMasthead.getBoundingClientRect().height > 20,
      flipPageAutoHeight: flipPages.every(fp => getComputedStyle(fp).height === 'auto' || fp.offsetHeight > 40),
    };
  });
}

async function evaluatePrintPrep(page) {
  return page.evaluate(async () => {
    if (typeof window.zinePreparePrintDOM === 'function') {
      window.zinePreparePrintDOM();
    } else {
      document.body.classList.add('print-prep');
      document.querySelectorAll('.flip-page').forEach(p => {
        p.style.display = 'block';
        p.style.position = 'static';
      });
    }
    await new Promise(r => setTimeout(r, 80));
    const flipPages = [...document.querySelectorAll('.flip-page')];
    const spreads = [...document.querySelectorAll('.flip-page .spread')];
    const images = [...document.querySelectorAll('.flip-page img')];
    const loadedImages = images.filter(img => img.complete && img.naturalWidth > 0);
    const visibleSpreads = spreads.filter(s => {
      const st = getComputedStyle(s);
      return st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
    });
    return {
      flipPageCount: flipPages.length,
      spreadCount: spreads.length,
      visibleSpreadCount: visibleSpreads.length,
      imageCount: images.length,
      loadedImageCount: loadedImages.length,
      allFlipPagesBlock: flipPages.every(fp => getComputedStyle(fp).display === 'block'),
    };
  });
}

async function testIndexScroll(page) {
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${URL}#spread-intro`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.spread').length >= 21, { timeout: 60000 });

  const before = await page.evaluate(() => {
    const index = document.getElementById('spread-intro');
    return index ? index.getBoundingClientRect().top : null;
  });

  await page.click('.index-list__link[href="#spread-supercouncil"]');
  await new Promise(r => setTimeout(r, 600));

  return page.evaluate(beforeTop => {
    const el = document.getElementById('spread-supercouncil');
    if (!el) return { ok: false, reason: 'spread-supercouncil no encontrado' };
    const top = el.getBoundingClientRect().top;
    const hash = location.hash;
    return {
      ok: Math.abs(top) < 120 && hash === '#spread-supercouncil',
      top: Math.round(top),
      hash,
      beforeTop,
    };
  }, before);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const errors = [];
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('.spread').length >= 21, { timeout: 60000 });

    const mobile = await evaluateMobile(page);
    console.log('Mobile 375×812:', mobile);

    if (!mobile.scrollMode) errors.push('mobile: falta body.scroll-mode');
    if (mobile.magazineMode) errors.push('mobile: magazine-mode activo en <600px');
    if (mobile.spreadCount !== 21) errors.push(`mobile: esperaba 21 spreads, hay ${mobile.spreadCount}`);
    if (mobile.flipPageCount !== 21) errors.push(`mobile: esperaba 21 flip-pages, hay ${mobile.flipPageCount}`);
    if (mobile.stfItemCount > 0) errors.push('mobile: PageFlip no destruido (.stf__item presente)');
    if (mobile.featurePairs < 7) errors.push(`mobile: pocos pares feature (${mobile.featurePairs})`);
    if (mobile.minHeroH > 0 && mobile.minHeroH < 80) errors.push(`mobile: hero colapsada (${mobile.minHeroH}px)`);
    if (!mobile.coverVisible) errors.push('mobile: tapa no visible');

    const scroll = await testIndexScroll(page);
    console.log('Index scroll:', scroll);
    if (!scroll.ok) errors.push(`mobile: índice no scrollea (${scroll.reason || `top=${scroll.top}, hash=${scroll.hash}`})`);

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('.stf__item').length >= 21, { timeout: 60000 });

    const print = await evaluatePrintPrep(page);
    console.log('Print prep:', print);

    if (print.flipPageCount !== 21) errors.push(`print: esperaba 21 flip-pages, hay ${print.flipPageCount}`);
    if (print.visibleSpreadCount !== 21) errors.push(`print: spreads visibles ${print.visibleSpreadCount}/21`);
    if (!print.allFlipPagesBlock) errors.push('print: flip-pages no en display:block');
    if (print.loadedImageCount < print.imageCount * 0.9) {
      errors.push(`print: imágenes cargadas ${print.loadedImageCount}/${print.imageCount}`);
    }
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error('\nFASE 4 FAIL:');
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  console.log('\nFASE 4 OK — mobile scroll + PDF prep');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});