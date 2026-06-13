/**
 * FASE 5 — QA + publicación readiness
 * Run: node scripts/verify-phase-5.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080, mode: 'magazine', pages: 22 },
  { name: '1280x800', width: 1280, height: 800, mode: 'magazine', pages: 22 },
  { name: '768x1024', width: 768, height: 1024, mode: 'magazine', pages: 22 },
  { name: '375x812', width: 375, height: 812, mode: 'scroll', pages: 22 },
];

const SPREAD_IDS = [
  'front-cover', 'cover', 'intro', 'asistente', 'supercouncil', 'vincularmente',
  'gonza-discos', 'gastos', 'ninera', 'jardin', 'salones', 'colofon', 'back-cover',
];

async function setViewport(page, vp) {
  if (typeof page.setViewport === 'function') await page.setViewport(vp);
  else await page.setViewportSize({ width: vp.width, height: vp.height });
}

function collectConsole(page, bucket) {
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      bucket.push({ type, text: msg.text() });
    }
  });
  page.on('pageerror', err => bucket.push({ type: 'pageerror', text: err.message }));
  page.on('requestfailed', req => {
    bucket.push({ type: 'requestfailed', text: `${req.url()} — ${req.failure()?.errorText || 'failed'}` });
  });
  page.on('response', res => {
    if (res.status() === 404) {
      bucket.push({ type: '404', text: res.url() });
    }
  });
}

async function waitReady(page, vp) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (vp.mode === 'magazine') {
    await page.waitForFunction(() => {
      return document.body.classList.contains('magazine-mode')
        && document.querySelectorAll('.stf__item').length === 22;
    }, { timeout: 60000 });
  } else {
    await page.waitForFunction(() => {
      return document.body.classList.contains('scroll-mode')
        && document.querySelectorAll('.spread').length >= 22;
    }, { timeout: 60000 });
  }
  await new Promise(r => setTimeout(r, 500));
}

async function gotoSpread(page, id, vp) {
  await page.goto(`${URL}#spread-${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (vp.mode === 'magazine') {
    await page.waitForFunction(() => document.querySelectorAll('.stf__item').length === 22, { timeout: 60000 });
  } else {
    await page.waitForFunction(() => document.querySelectorAll('.spread').length >= 22, { timeout: 60000 });
  }
  await new Promise(r => setTimeout(r, 400));
}

async function evaluateMagazineSpread(page, id) {
  return page.evaluate((spreadId) => {
    const el = document.getElementById(`spread-${spreadId}`);
    if (!el) return { ok: false, reason: 'spread no encontrado' };
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 20 && rect.height > 20;
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    const items = [...document.querySelectorAll('.stf__item')]
      .filter(i => getComputedStyle(i).display !== 'none');
    return {
      ok: visible && (inViewport || items.some(i => i.contains(el))),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      visibleItems: items.length,
    };
  }, id);
}

async function evaluateScrollSpread(page, id) {
  return page.evaluate((spreadId) => {
    const el = document.getElementById(`spread-${spreadId}`);
    if (!el) return { ok: false, reason: 'spread no encontrado' };
    const rect = el.getBoundingClientRect();
    return {
      ok: rect.height > 40,
      height: Math.round(rect.height),
    };
  }, id);
}

async function testReducedMotion(page) {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));

  const before = await page.evaluate(() => document.getElementById('magazine-indicator')?.textContent?.trim() || '');
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById('magazine-next')?.click());
  await page.waitForFunction(prev => {
    const cur = document.getElementById('magazine-indicator')?.textContent?.trim() || '';
    return cur && cur !== prev;
  }, { timeout: 5000 }, before);
  const elapsed = Date.now() - t0;

  const cssOk = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const dur = getComputedStyle(probe).transitionDuration;
    probe.remove();
    return dur === '0s' || dur === '0ms';
  });

  return { elapsed, cssOk, instantFlip: elapsed < 350 };
}

async function checkOgMeta() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hasOgImage = /property="og:image"/.test(html);
  const hasOgUrl = /property="og:url"/.test(html);
  const hasTwitter = /name="twitter:card"/.test(html);
  const ogPath = path.join(ROOT, 'IMG', 'og-image.png');
  const ogExists = fs.existsSync(ogPath);
  return { hasOgImage, hasOgUrl, hasTwitter, ogExists };
}

async function runBrowser(browserName, launchFn) {
  const errors = [];
  const consoleIssues = [];
  const browser = await launchFn();
  try {
    const page = await browser.newPage();
    collectConsole(page, consoleIssues);

    for (const vp of VIEWPORTS) {
      await setViewport(page, vp);
      await waitReady(page, vp);

      const modeOk = await page.evaluate(expected => {
        const scroll = document.body.classList.contains('scroll-mode');
        const mag = document.body.classList.contains('magazine-mode');
        return expected === 'scroll' ? scroll && !mag : mag && !scroll;
      }, vp.mode);
      if (!modeOk) errors.push(`${browserName} ${vp.name}: modo incorrecto (esperaba ${vp.mode})`);

      const count = await page.evaluate(() => document.querySelectorAll('.flip-page').length);
      if (count !== vp.pages) errors.push(`${browserName} ${vp.name}: ${count} flip-pages (esperaba ${vp.pages})`);

      for (const id of SPREAD_IDS) {
        await gotoSpread(page, id, vp);
        const result = vp.mode === 'magazine'
          ? await evaluateMagazineSpread(page, id)
          : await evaluateScrollSpread(page, id);
        if (!result.ok) {
          errors.push(`${browserName} ${vp.name}: spread-${id} roto (${JSON.stringify(result)})`);
        }
      }
    }

    if (browserName === 'Chrome') {
      const motion = await testReducedMotion(page);
      console.log('[Chrome] reduced-motion', motion);
      if (!motion.instantFlip) errors.push(`Chrome reduced-motion: flip tardó ${motion.elapsed}ms`);
      if (!motion.cssOk) errors.push('Chrome reduced-motion: transiciones CSS no instantáneas');
    }
  } finally {
    await browser.close();
  }

  const filteredConsole = consoleIssues.filter(issue => {
    const t = issue.text || '';
    if (t.includes('favicon')) return false;
    if (t.includes('DevTools')) return false;
    return true;
  });

  if (filteredConsole.length) {
    console.log(`[${browserName}] consola (${filteredConsole.length}):`);
    filteredConsole.slice(0, 8).forEach(i => console.log(`  ${i.type}: ${i.text}`));
    filteredConsole.forEach(i => errors.push(`${browserName} consola: [${i.type}] ${i.text}`));
  }

  return errors;
}

async function main() {
  const allErrors = [];
  const og = await checkOgMeta();
  console.log('OG meta:', og);
  if (!og.hasOgImage) allErrors.push('index.html: falta og:image');
  if (!og.hasOgUrl) allErrors.push('index.html: falta og:url');
  if (!og.hasTwitter) allErrors.push('index.html: falta twitter:card');
  if (!og.ogExists) allErrors.push('IMG/og-image.png no existe');

  allErrors.push(...await runBrowser('Chrome', () => puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })));

  allErrors.push(...await runBrowser('Firefox', () => firefox.launch({ headless: true })));

  if (allErrors.length) {
    console.error('\nFASE 5 QA FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  console.log('\nFASE 5 QA OK — viewports, spreads, consola, reduced-motion');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});