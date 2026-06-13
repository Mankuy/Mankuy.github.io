/**
 * Plan correcciones #4 — tapa compuesta + título índice
 * Run: node scripts/verify-fixes-4.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';
const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
];

async function setViewport(page, vp) {
  if (typeof page.setViewport === 'function') await page.setViewport(vp);
  else await page.setViewportSize({ width: vp.width, height: vp.height });
}

async function waitMagazine(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.querySelectorAll('.stf__item').length === 21;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));
}

async function evaluate(page) {
  return page.evaluate(() => {
    const overlap = (a, b, pad = 2) => {
      if (!a || !b) return false;
      return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
    };
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const cover = visible.find(el => el.querySelector('.spread--cover'))?.querySelector('.spread--cover');
    const index = visible.find(el => el.querySelector('.spread--index'))?.querySelector('.spread--index');

    const teasers = cover ? cover.querySelectorAll('.cover-teaser, .cover-teasers').length : 0;
    const deck = cover?.querySelector('.cover-deck');
    const lead = cover?.querySelector('.cover-lead');
    const mast = cover?.querySelector('.spread__masthead');
    const stamp = cover?.querySelector('.cover-price');
    const barcode = cover?.querySelector('.cover-barcode');
    const footer = cover?.querySelector('.cover-footer');
    const center = cover?.querySelector('.cover-zone--center');
    const inner = cover?.querySelector('.cover-inner--composed');

    const deckSize = deck ? parseFloat(getComputedStyle(deck).fontSize) : 0;
    const leadSize = lead ? parseFloat(getComputedStyle(lead).fontSize) : 0;

    const coverRect = cover?.getBoundingClientRect();
    const centerRect = center?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const mastRect = mast?.getBoundingClientRect();

    const coverMidY = coverRect ? coverRect.top + coverRect.height / 2 : 0;
    const centerMidY = centerRect ? centerRect.top + centerRect.height / 2 : 0;
    const centerOffset = coverRect ? Math.abs(centerMidY - coverMidY) / coverRect.height : 1;

    const footerNearBottom = coverRect && footerRect
      ? (coverRect.bottom - footerRect.bottom) < coverRect.height * 0.22
      : false;

    const mastNearTop = coverRect && mastRect
      ? (mastRect.top - coverRect.top) < coverRect.height * 0.45
      : false;

    return {
      teasers,
      deckBiggerThanLead: deckSize > leadSize + 2,
      deckSize: Math.round(deckSize),
      leadSize: Math.round(leadSize),
      barcodeStampOverlap: overlap(stamp?.getBoundingClientRect(), barcode?.getBoundingClientRect()),
      coverOverflow: cover ? cover.scrollHeight > cover.clientHeight + 3 : true,
      centerOffset: Math.round(centerOffset * 100) / 100,
      footerNearBottom,
      mastInUpperHalf: mastNearTop,
      indexTitle: index?.querySelector('.panel__title')?.textContent?.trim() || '',
      hasComposed: !!inner,
    };
  });
}

async function runViewport(browserName, page, vp) {
  const errors = [];
  await setViewport(page, vp);
  await waitMagazine(page);
  const data = await evaluate(page);
  console.log(`[${browserName} ${vp.name}]`, data);

  if (data.teasers > 0) errors.push(`${browserName} ${vp.name}: tapa tiene teasers`);
  if (!data.hasComposed) errors.push(`${browserName} ${vp.name}: falta layout compuesto`);
  if (!data.deckBiggerThanLead) errors.push(`${browserName} ${vp.name}: gancho no destaca (${data.deckSize}px vs ${data.leadSize}px)`);
  if (data.barcodeStampOverlap) errors.push(`${browserName} ${vp.name}: barcode solapa sello`);
  if (data.coverOverflow) errors.push(`${browserName} ${vp.name}: scroll interno en tapa`);
  if (data.centerOffset > 0.28) errors.push(`${browserName} ${vp.name}: bloque central muy descentrado (${data.centerOffset})`);
  if (!data.footerNearBottom) errors.push(`${browserName} ${vp.name}: firma/CTA no pinados abajo`);
  if (data.indexTitle !== 'De qué va') errors.push(`${browserName} ${vp.name}: índice título "${data.indexTitle}"`);

  return errors;
}

async function main() {
  const allErrors = [];

  const chrome = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await chrome.newPage();
    for (const vp of VIEWPORTS) {
      allErrors.push(...await runViewport('Chrome', page, vp));
    }
  } finally {
    await chrome.close();
  }

  const ff = await firefox.launch({ headless: true });
  try {
    const page = await ff.newPage();
    for (const vp of VIEWPORTS) {
      allErrors.push(...await runViewport('Firefox', page, vp));
    }
  } finally {
    await ff.close();
  }

  if (allErrors.length) {
    console.error('\nFIXES #4 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #4 OK — tapa compuesta, Chrome + Firefox @ 1280×800 y 1440×900');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});