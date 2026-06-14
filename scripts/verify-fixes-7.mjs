/**
 * Plan correcciones #7 — flip animado en móvil (portrait)
 * Run: node scripts/verify-fixes-7.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';

const MOBILE_VIEWPORTS = [
  { name: '375x812', width: 375, height: 812 },
  { name: '360x800', width: 360, height: 800 },
  { name: '414x896', width: 414, height: 896 },
  { name: '740x360-landscape', width: 740, height: 360 },
];

const EDGE_VIEWPORTS = [
  { name: '599x800', width: 599, height: 800 },
  { name: '600x800', width: 600, height: 800 },
];

const DESKTOP_CHECK = { name: '1280x800', width: 1280, height: 800 };

function isPuppeteerPage(page) {
  return typeof page.setViewport === 'function';
}

async function setViewport(page, vp) {
  if (isPuppeteerPage(page)) await page.setViewport(vp);
  else await page.setViewportSize({ width: vp.width, height: vp.height });
}

async function waitForFn(page, fn, options = {}, ...args) {
  if (isPuppeteerPage(page)) await page.waitForFunction(fn, options, ...args);
  else await page.waitForFunction(fn, ...args, options);
}

async function setReducedMotion(page, value) {
  if (typeof page.emulateMediaFeatures === 'function') {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value }]);
  } else if (typeof page.emulateMedia === 'function') {
    await page.emulateMedia({ reducedMotion: value });
  }
}

async function waitMagazine(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.body.classList.contains('magazine-mode--portrait')
      && document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));
}

async function evaluatePortrait(page, vp) {
  return page.evaluate((vw) => {
    const book = document.getElementById('flip-book');
    const bookRect = book?.getBoundingClientRect();
    const spread = document.querySelector('.stf__item:not([style*="display: none"]) .spread')
      || document.querySelector('#spread-front-cover');
    const spreadRect = spread?.getBoundingClientRect();
    const navBtn = document.querySelector('.magazine-nav__btn');
    const navStyle = navBtn ? getComputedStyle(navBtn) : null;
    const edges = document.querySelector('.magazine-edges');
    const overflowX = document.documentElement.scrollWidth > vw + 2;
    return {
      magazine: document.body.classList.contains('magazine-mode'),
      portrait: document.body.classList.contains('magazine-mode--portrait'),
      landscape: document.body.classList.contains('magazine-mode--landscape'),
      scroll: document.body.classList.contains('scroll-mode'),
      stf: document.querySelectorAll('.stf__item').length,
      bookW: bookRect ? Math.round(bookRect.width) : 0,
      bookH: bookRect ? Math.round(bookRect.height) : 0,
      spreadW: spreadRect ? Math.round(spreadRect.width) : 0,
      fitsWidth: bookRect ? bookRect.width <= vw + 2 : false,
      navW: navBtn ? Math.round(navBtn.getBoundingClientRect().width) : 0,
      navVisible: navBtn ? getComputedStyle(document.querySelector('.magazine-nav')).display !== 'none' : false,
      edgesHidden: edges ? getComputedStyle(edges).display === 'none' : true,
      overflowX,
      indicator: document.getElementById('magazine-indicator')?.textContent?.trim() || '',
    };
  }, vp.width);
}

async function testFlip(page) {
  const before = await page.evaluate(() => document.getElementById('magazine-indicator')?.textContent?.trim() || '');
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById('magazine-next')?.click());
  await waitForFn(page, prev => {
    const cur = document.getElementById('magazine-indicator')?.textContent?.trim() || '';
    return cur !== prev && parseInt(cur, 10) > parseInt(prev, 10);
  }, { timeout: 8000 }, before);
  return { elapsed: Date.now() - t0, after: await page.evaluate(() => document.getElementById('magazine-indicator')?.textContent?.trim()) };
}

async function testDeepLink(page) {
  await page.goto(`${URL}#spread-supercouncil`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.stf__item').length === 22, { timeout: 60000 });
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return visible.some(el => el.querySelector('#spread-supercouncil'));
  }, { timeout: 10000 });
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const hasSc = visible.some(el => el.querySelector('#spread-supercouncil'));
    return { hash: location.hash, hasSc, visible: visible.length };
  });
}

async function testReducedMotionScroll(page, vp) {
  await setReducedMotion(page, 'reduce');
  await setViewport(page, vp);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.spread').length >= 22, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 500));
  return page.evaluate(() => ({
    scroll: document.body.classList.contains('scroll-mode'),
    magazine: document.body.classList.contains('magazine-mode'),
    stf: document.querySelectorAll('.stf__item').length,
  }));
}

async function testDesktopUnchanged(page) {
  await setReducedMotion(page, 'no-preference');
  await setViewport(page, DESKTOP_CHECK);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode--landscape')
      && document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 60000 });
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const front = visible.find(el => el.querySelector('#spread-front-cover'));
    const cover = visible.find(el => el.querySelector('#spread-cover'));
    const intro = visible.find(el => el.querySelector('#spread-intro'));
    return {
      landscape: document.body.classList.contains('magazine-mode--landscape'),
      visible: visible.length,
      hasFrontAlone: !!front && !cover && !intro,
      bookW: Math.round(document.getElementById('flip-book')?.getBoundingClientRect().width ?? 0),
    };
  });
}

async function runMobile(browserName, page, vp) {
  const errors = [];
  await setReducedMotion(page, 'no-preference');
  await setViewport(page, vp);
  await waitMagazine(page);

  const state = await evaluatePortrait(page, vp);
  console.log(`[${browserName} ${vp.name}]`, state);

  if (!state.magazine) errors.push(`${browserName} ${vp.name}: falta magazine-mode`);
  if (!state.portrait) errors.push(`${browserName} ${vp.name}: falta magazine-mode--portrait`);
  if (state.landscape) errors.push(`${browserName} ${vp.name}: landscape activo en móvil`);
  if (state.scroll) errors.push(`${browserName} ${vp.name}: scroll-mode en móvil sin reduced-motion`);
  if (state.stf !== 22) errors.push(`${browserName} ${vp.name}: ${state.stf} stf items`);
  if (!state.fitsWidth) errors.push(`${browserName} ${vp.name}: libro desborda (${state.bookW}px > ${vp.width})`);
  if (state.overflowX) errors.push(`${browserName} ${vp.name}: overflow horizontal`);
  if (!state.navVisible) errors.push(`${browserName} ${vp.name}: nav oculta`);
  if (state.navW < 44) errors.push(`${browserName} ${vp.name}: botón nav ${state.navW}px (<44)`);
  if (vp.width < 1024 && !state.edgesHidden) errors.push(`${browserName} ${vp.name}: edges visibles en portrait`);

  const flip = await testFlip(page);
  console.log(`[${browserName} ${vp.name}] flip`, flip);
  if (flip.elapsed > 2800) errors.push(`${browserName} ${vp.name}: flip lento (${flip.elapsed}ms)`);

  if (vp.name === '375x812') {
    const link = await testDeepLink(page);
    console.log(`[${browserName} ${vp.name}] deeplink`, link);
    if (!link.hasSc || link.hash !== '#spread-supercouncil') {
      errors.push(`${browserName} ${vp.name}: deep-link roto`);
    }
  }

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
    for (const vp of MOBILE_VIEWPORTS) allErrors.push(...await runMobile('Chrome', page, vp));
    for (const vp of EDGE_VIEWPORTS) allErrors.push(...await runMobile('Chrome', page, vp));

    const rm = await testReducedMotionScroll(page, MOBILE_VIEWPORTS[0]);
    console.log('[Chrome] reduced-motion 375', rm);
    if (!rm.scroll || rm.magazine || rm.stf > 0) {
      allErrors.push('Chrome reduced-motion: debe usar scroll-mode sin flip');
    }

    const desktop = await testDesktopUnchanged(page);
    console.log('[Chrome] desktop 1280', desktop);
    if (!desktop.landscape || !desktop.hasFrontAlone || desktop.visible !== 1) {
      allErrors.push('Chrome desktop: landscape/front-cover roto');
    }
    if (desktop.bookW < 900) allErrors.push(`Chrome desktop: libro angosto (${desktop.bookW}px)`);
  } finally {
    await chrome.close();
  }

  const ff = await firefox.launch({ headless: true });
  try {
    const page = await ff.newPage();
    for (const vp of [MOBILE_VIEWPORTS[0], EDGE_VIEWPORTS[1]]) {
      allErrors.push(...await runMobile('Firefox', page, vp));
    }
  } finally {
    await ff.close();
  }

  if (allErrors.length) {
    console.error('\nFIXES #7 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #7 OK — flip móvil portrait, desktop intacto');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});