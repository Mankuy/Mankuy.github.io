/**
 * Plan correcciones #5 — portada pág 0 + colofón
 * Run: node scripts/verify-fixes-5.mjs
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

async function waitReady(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));
}

async function gotoHash(page, id) {
  await page.goto(`${URL}#spread-${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.stf__item').length === 22, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));
}

async function evaluateStart(page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('.stf__item')];
    const visible = items.filter(el => getComputedStyle(el).display !== 'none');
    const front = visible.find(el => el.querySelector('#spread-front-cover'));
    const cover = visible.find(el => el.querySelector('#spread-cover'));
    const intro = visible.find(el => el.querySelector('#spread-intro'));
    return {
      total: items.length,
      visible: visible.length,
      hasFrontAlone: !!front && !cover && !intro,
      frontName: front?.querySelector('.spread__masthead--name')?.textContent?.trim() || '',
      frontHook: front?.querySelector('.cover-deck--front')?.textContent?.trim() || '',
      frontEyebrow: front?.querySelector('.cover-eyebrow')?.textContent?.trim() || '',
    };
  });
}

async function evaluatePair(page, spreadId) {
  return page.evaluate((id) => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const visual = visible.find(el => el.querySelector(`#spread-${id}.spread--feature-visual`));
    const text = visible.find(el => el.querySelector('.spread--feature-text'));
    const vL = visual?.getBoundingClientRect().left ?? 0;
    const tL = text?.getBoundingClientRect().left ?? 0;
    return {
      hasVisual: !!visual,
      hasText: !!text,
      paired: !!visual && !!text && vL < tL,
      visualLeft: Math.round(vL),
      textLeft: Math.round(tL),
    };
  }, spreadId);
}

async function evaluateBack(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return {
      visibleCount: visible.length,
      hasBack: visible.some(el => el.querySelector('#spread-back-cover')),
      hasColofon: visible.some(el => el.querySelector('#spread-colofon')),
      colofonTitle: visible.find(el => el.querySelector('#spread-colofon'))
        ?.querySelector('.panel__title')?.textContent?.trim() || '',
    };
  });
}

async function runViewport(browserName, page, vp) {
  const errors = [];
  await setViewport(page, vp);
  await waitReady(page);

  const start = await evaluateStart(page);
  console.log(`[${browserName} ${vp.name}] start`, start);
  if (start.total !== 22) errors.push(`${browserName} ${vp.name}: esperaba 22 páginas, hay ${start.total}`);
  if (!start.hasFrontAlone) errors.push(`${browserName} ${vp.name}: portada no está sola al inicio`);
  if (!start.frontName.includes('Facundo Galetta')) errors.push(`${browserName} ${vp.name}: masthead portada incorrecto`);
  if (!start.frontHook.includes('audita tu mente')) errors.push(`${browserName} ${vp.name}: gancho portada incorrecto`);
  if (!start.frontEyebrow.includes('solución a tu medida')) errors.push(`${browserName} ${vp.name}: eyebrow ausente`);

  for (const id of ['asistente', 'supercouncil']) {
    await gotoHash(page, id);
    const pair = await evaluatePair(page, id);
    console.log(`[${browserName} ${vp.name}] pair ${id}`, pair);
    if (!pair.paired) errors.push(`${browserName} ${vp.name}: par ${id} desalineado`);
  }

  await gotoHash(page, 'back-cover');
  const back = await evaluateBack(page);
  console.log(`[${browserName} ${vp.name}] back`, back);
  if (!back.hasBack) errors.push(`${browserName} ${vp.name}: contratapa no visible`);
  if (back.visibleCount > 1) errors.push(`${browserName} ${vp.name}: contratapa no está sola (visible=${back.visibleCount})`);

  await gotoHash(page, 'colofon');
  const colofon = await evaluateBack(page);
  console.log(`[${browserName} ${vp.name}] colofon`, colofon);
  if (colofon.colofonTitle !== 'Cómo se hizo este fanzine') {
    errors.push(`${browserName} ${vp.name}: colofón "${colofon.colofonTitle}"`);
  }

  await gotoHash(page, 'cover');
  const interior = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return {
      hasCover: visible.some(el => el.querySelector('#spread-cover')),
      hasIntro: visible.some(el => el.querySelector('#spread-intro')),
      coverLeft: Math.round(visible.find(el => el.querySelector('#spread-cover'))?.getBoundingClientRect().left ?? 0),
      introLeft: Math.round(visible.find(el => el.querySelector('#spread-intro'))?.getBoundingClientRect().left ?? 0),
    };
  });
  console.log(`[${browserName} ${vp.name}] interior`, interior);
  if (!interior.hasCover || !interior.hasIntro) errors.push(`${browserName} ${vp.name}: spread interior cover|intro roto`);
  if (interior.coverLeft >= interior.introLeft) errors.push(`${browserName} ${vp.name}: cover no está a la izq del índice`);

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
    for (const vp of VIEWPORTS) allErrors.push(...await runViewport('Chrome', page, vp));
  } finally {
    await chrome.close();
  }

  const ff = await firefox.launch({ headless: true });
  try {
    const page = await ff.newPage();
    for (const vp of VIEWPORTS) allErrors.push(...await runViewport('Firefox', page, vp));
  } finally {
    await ff.close();
  }

  if (allErrors.length) {
    console.error('\nFIXES #5 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #5 OK — portada pág 0 + colofón, Chrome + Firefox');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});