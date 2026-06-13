/**
 * Plan correcciones #6 — prolijar tapa página 0 (front-cover)
 * Run: node scripts/verify-fixes-6.mjs
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

async function evaluateFrontCover(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const frontItem = visible.find(el => el.querySelector('#spread-front-cover'));
    const spread = frontItem?.querySelector('#spread-front-cover');
    if (!spread) return { ok: false, reason: 'front-cover no visible' };

    const eyebrow = spread.querySelector('.cover-eyebrow');
    const masthead = spread.querySelector('.spread__masthead--name');
    const hook = spread.querySelector('.cover-deck--front');
    const poster = spread.querySelector('.cover-poster--front');

    const hookRect = hook.getBoundingClientRect();
    const hookStyle = getComputedStyle(hook);
    const lineHeight = parseFloat(hookStyle.lineHeight) || 16;
    const hookLines = Math.max(1, Math.round(hook.offsetHeight / lineHeight));

    const mastheadRect = masthead.getBoundingClientRect();
    const eyebrowRect = eyebrow.getBoundingClientRect();
    const gapEyebrowToName = mastheadRect.top - eyebrowRect.bottom;
    const gapNameToHook = hookRect.top - mastheadRect.bottom;

    const stage = spread.querySelector('.cover-stage');
    const stageCols = getComputedStyle(stage).gridTemplateColumns;

    return {
      ok: true,
      hasFrontAlone: visible.length === 1 && !!frontItem,
      hookWidth: Math.round(hookRect.width),
      posterWidth: Math.round(poster.getBoundingClientRect().width),
      hookLines,
      hookMaxWidth: hookStyle.maxWidth,
      gapEyebrowToName: Math.round(gapEyebrowToName),
      gapNameToHook: Math.round(gapNameToHook),
      stageCols,
      hookText: hook.textContent.trim(),
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
    return { paired: !!visual && !!text && vL < tL };
  }, spreadId);
}

async function runViewport(browserName, page, vp) {
  const errors = [];
  await setViewport(page, vp);
  await waitReady(page);

  const front = await evaluateFrontCover(page);
  console.log(`[${browserName} ${vp.name}] front-cover`, front);

  if (!front.ok) errors.push(`${browserName} ${vp.name}: ${front.reason}`);
  if (!front.hasFrontAlone) errors.push(`${browserName} ${vp.name}: portada no está sola`);
  if (front.hookWidth < 240) errors.push(`${browserName} ${vp.name}: gancho angosto (${front.hookWidth}px)`);
  if (front.hookLines > 3) errors.push(`${browserName} ${vp.name}: gancho en ${front.hookLines} líneas (esperaba ≤3)`);
  if (front.gapEyebrowToName < 10) errors.push(`${browserName} ${vp.name}: poco aire eyebrow→nombre (${front.gapEyebrowToName}px)`);
  if (front.gapNameToHook < 8) errors.push(`${browserName} ${vp.name}: poco aire nombre→gancho (${front.gapNameToHook}px)`);
  if (!front.hookText.includes('audita tu mente')) errors.push(`${browserName} ${vp.name}: gancho incorrecto`);

  for (const id of ['asistente', 'supercouncil']) {
    await gotoHash(page, id);
    const pair = await evaluatePair(page, id);
    if (!pair.paired) errors.push(`${browserName} ${vp.name}: par ${id} desalineado`);
  }

  await gotoHash(page, 'back-cover');
  const back = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return {
      hasBack: visible.some(el => el.querySelector('#spread-back-cover')),
      alone: visible.length === 1,
    };
  });
  if (!back.hasBack || !back.alone) errors.push(`${browserName} ${vp.name}: contratapa rota`);

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
    console.error('\nFIXES #6 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #6 OK — tapa prolija, pares y contratapa intactos');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});