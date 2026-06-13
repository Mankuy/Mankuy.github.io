/**
 * Plan correcciones #3 — tapa tipográfica
 * Run: node scripts/verify-fixes-3.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';
const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
];

const HOOK = 'Un psicólogo que programa. Mirá lo que le sale.';
const LEAD_SNIP = 'Ocho herramientas, cada una nacida';

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

async function evaluateCover(page) {
  return page.evaluate(({ hook, leadSnip }) => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const coverItem = visible.find(el => el.querySelector('.spread--cover'));
    const indexItem = visible.find(el => el.querySelector('.spread--index'));
    const cover = coverItem?.querySelector('.spread--cover');
    const index = indexItem?.querySelector('.spread--index');

    const imgs = cover ? cover.querySelectorAll('img, picture').length : 0;
    const deck = cover?.querySelector('.cover-deck')?.textContent?.trim() || '';
    const lead = cover?.querySelector('.cover-lead')?.textContent?.trim() || '';
    const teasers = cover ? [...cover.querySelectorAll('.cover-teaser')] : [];
    const masthead = cover?.querySelector('.spread__masthead');
    const author = cover?.querySelector('.spread__author')?.textContent?.trim() || '';
    const cta = cover?.querySelector('.cover-cta')?.textContent?.trim() || '';
    const barcode = !!cover?.querySelector('.cover-barcode');
    const kicker = cover?.querySelector('.cover-kicker')?.textContent?.trim() || '';

    const coverRect = cover?.getBoundingClientRect();
    const coverOverflow = cover ? cover.scrollHeight > cover.clientHeight + 3 : true;

    const deckRect = cover?.querySelector('.cover-deck')?.getBoundingClientRect();
    const mastRect = masthead?.getBoundingClientRect();
    const overlap = deckRect && mastRect ? deckRect.top < mastRect.bottom - 2 : false;

    const indexList = index?.querySelector('.index-list');
    const indexCols = indexList ? getComputedStyle(indexList).columnCount : '0';
    const indexItems = index ? index.querySelectorAll('.index-list__item').length : 0;
    const indexNotes = index ? index.querySelectorAll('.index-list__note').length : 0;

    const order = cover ? [...cover.querySelectorAll('.cover-mast, .spread__masthead, .cover-deck, .cover-lead, .cover-teasers, .cover-footer')].map(el => el.className) : [];

    return {
      hasCover: !!cover,
      hasIndex: !!index,
      imgs,
      isTypeCover: cover?.classList.contains('spread--cover--type') ?? false,
      deck,
      leadOk: lead.includes(leadSnip),
      teaserCount: teasers.length,
      author,
      cta,
      barcode,
      kicker,
      coverOverflow,
      overlap,
      indexCols,
      indexItems,
      indexNotes,
      coverHeight: coverRect ? Math.round(coverRect.height) : 0,
      order: order.join('|'),
    };
  }, { hook: HOOK, leadSnip: LEAD_SNIP });
}

async function runViewport(browserName, page, vp) {
  const errors = [];
  await setViewport(page, vp);
  await waitMagazine(page);
  const data = await evaluateCover(page);
  console.log(`[${browserName} ${vp.name}]`, data);

  if (!data.hasCover) errors.push(`${browserName} ${vp.name}: tapa no visible`);
  if (!data.hasIndex) errors.push(`${browserName} ${vp.name}: índice no visible a la derecha`);
  if (data.imgs > 0) errors.push(`${browserName} ${vp.name}: tapa tiene ${data.imgs} imagen(es)`);
  if (!data.isTypeCover) errors.push(`${browserName} ${vp.name}: falta clase spread--cover--type`);
  if (data.deck !== HOOK) errors.push(`${browserName} ${vp.name}: gancho incorrecto`);
  if (!data.leadOk) errors.push(`${browserName} ${vp.name}: copete ausente o incorrecto`);
    if (data.teaserCount > 0) errors.push(`${browserName} ${vp.name}: tapa no debe tener teasers (${data.teaserCount})`);
  if (!data.barcode) errors.push(`${browserName} ${vp.name}: falta barcode`);
  if (!data.cta.includes('Pasá la página')) errors.push(`${browserName} ${vp.name}: falta CTA`);
  if (!data.author.includes('Montevideo')) errors.push(`${browserName} ${vp.name}: falta autor`);
  if (data.coverOverflow) errors.push(`${browserName} ${vp.name}: tapa con scroll interno`);
  if (data.overlap) errors.push(`${browserName} ${vp.name}: texto tapado/overlap`);
  if (Number(data.indexCols) > 1) errors.push(`${browserName} ${vp.name}: índice roto (${data.indexCols} cols)`);
  if (data.indexItems !== 8) errors.push(`${browserName} ${vp.name}: índice con ${data.indexItems} ítems`);
  if (data.indexNotes > 0) errors.push(`${browserName} ${vp.name}: índice muestra notes`);

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
    console.error('\nFIXES #3 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #3 OK — tapa tipográfica, Chrome + Firefox @ 1280×800 y 1440×900');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});