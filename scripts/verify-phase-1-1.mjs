/**
 * FASE 1.1 acceptance checks — Chrome + Firefox
 * Run: node scripts/verify-phase-1-1.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800, expectLandscape: true, minVisible: 2 },
  { name: '1920x1080', width: 1920, height: 1080, expectLandscape: true, minVisible: 2 },
  { name: '768x1024', width: 768, height: 1024, expectLandscape: false, minVisible: 1 },
];

async function evaluatePage(page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector('.stf__wrapper');
    const items = [...document.querySelectorAll('.stf__item')];
    const visible = items.filter(el => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    });
    const visibleText = visible
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ');
    const book = document.getElementById('flip-book');
    const bookRect = book?.getBoundingClientRect();
    const heroImg = visible
      .flatMap(el => [...el.querySelectorAll('.spread--feature-visual img')])
      .map(img => img.getBoundingClientRect().height)
      .filter(h => h > 0);
    const minHeroH = heroImg.length ? Math.min(...heroImg) : 0;
    const featurePair = visible.length === 2
      && visible.some(el => el.querySelector('.spread--feature-visual'))
      && visible.some(el => el.querySelector('.spread--feature-text'));
    return {
      magazineMode: document.body.classList.contains('magazine-mode'),
      bucketLandscape: document.body.classList.contains('magazine-mode--landscape'),
      bucketPortrait: document.body.classList.contains('magazine-mode--portrait'),
      wrapperLandscape: wrapper?.classList.contains('--landscape') ?? false,
      wrapperPortrait: wrapper?.classList.contains('--portrait') ?? false,
      totalItems: items.length,
      visibleCount: visible.length,
      hasText: visibleText.length > 80,
      bookWidth: bookRect ? Math.round(bookRect.width) : 0,
      bookHeight: bookRect ? Math.round(bookRect.height) : 0,
      sizeFixed: book?.style?.width?.endsWith('px') && book?.style?.height?.endsWith('px'),
      flipPageTotal: items.length,
      minHeroH: Math.round(minHeroH),
      featurePair,
    };
  });
}

function checkResult(browser, vp, data) {
  const errors = [];
  if (!data.magazineMode) errors.push('body sin magazine-mode');
  if (vp.expectLandscape) {
    if (!data.bucketLandscape) errors.push('falta magazine-mode--landscape');
    if (!data.wrapperLandscape) errors.push('StPageFlip no está en --landscape');
    if (data.visibleCount < vp.minVisible) errors.push(`solo ${data.visibleCount} páginas visibles (min ${vp.minVisible})`);
  } else {
    if (!data.bucketPortrait) errors.push('falta magazine-mode--portrait');
    if (data.wrapperLandscape) errors.push('StPageFlip en landscape cuando debería ser portrait');
  }
  if (!data.hasText) errors.push('libro en blanco o sin texto visible');
  if (!data.sizeFixed) errors.push('#flip-book sin dimensiones inline px (size:fixed)');
  if (data.totalItems === 0) errors.push('sin .stf__item en DOM');
  if (data.flipPageTotal !== 22) errors.push(`esperaba 22 flip-pages, hay ${data.flipPageTotal}`);
  if (vp.expectLandscape && data.minHeroH > 0 && data.minHeroH < 120) {
    errors.push(`hero colapsada (${data.minHeroH}px alto)`);
  }
  return errors;
}

async function evaluateFeatureSpread(page, spreadId) {
  await page.goto(`${URL}#spread-${spreadId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return visible.some(el => el.querySelector('.spread--feature-visual'));
  }, { timeout: 45000 });
  await new Promise(r => setTimeout(r, 600));
  return page.evaluate((id) => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const visual = visible.find(el => el.querySelector(`#spread-${id}.spread--feature-visual`));
    const text = visible.find(el => el.querySelector('.spread--feature-text'));
    const heroH = visual?.querySelector('img')?.getBoundingClientRect().height || 0;
    const visualLeft = visual?.getBoundingClientRect().left ?? 0;
    const textLeft = text?.getBoundingClientRect().left ?? 0;
    return {
      hasVisual: !!visual,
      hasText: !!text,
      heroH: Math.round(heroH),
      visualLeft: Math.round(visualLeft),
      textLeft: Math.round(textLeft),
      paired: !!visual && !!text && visualLeft < textLeft,
    };
  }, spreadId);
}

async function checkNoInternalScroll(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    if (!document.body.classList.contains('magazine-mode')) return false;
    return document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 45000 });
  await new Promise(r => setTimeout(r, 600));

  const total = await page.evaluate(() => document.querySelectorAll('.stf__item').length);
  const issues = [];

  for (let i = 0; i < total; i += 1) {
    const result = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('.stf__item')]
        .filter(el => getComputedStyle(el).display !== 'none');
      return visible.flatMap(el => {
        const spread = el.querySelector('.spread');
        if (!spread) return [];
        const checks = [spread, spread.querySelector('.panel')].filter(Boolean);
        return checks.map(node => ({
          page: spread.dataset.page || '?',
          cls: node.className.split(' ').slice(0, 2).join(' '),
          overflowY: getComputedStyle(node).overflowY,
          delta: node.scrollHeight - node.clientHeight,
        }));
      });
    });

    for (const row of result) {
      if (row.overflowY === 'auto' || row.overflowY === 'scroll') {
        issues.push(`pág ${row.page}: ${row.cls} overflow-y=${row.overflowY}`);
      }
      if (row.delta > 4) {
        issues.push(`pág ${row.page}: ${row.cls} desborda ${row.delta}px`);
      }
    }

    if (i < total - 1) {
      await page.keyboard.press('ArrowRight');
      await new Promise(r => setTimeout(r, 450));
    }
  }

  return issues;
}

async function checkHashBehavior(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('magazine-mode'), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 600));

  const fresh = await page.evaluate(() => ({
    hash: location.hash,
    index: [...document.querySelectorAll('.stf__item')].findIndex(el => getComputedStyle(el).display !== 'none'),
    spreadId: document.querySelector('.flip-page[data-spread-id]')?.dataset?.spreadId,
  }));

  const historyBefore = await page.evaluate(() => history.length);

  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 500));
  }

  const afterFlips = await page.evaluate(() => ({
    hash: location.hash,
    historyLength: history.length,
    hasPushState: typeof window.__zineUsedPushState === 'boolean' ? window.__zineUsedPushState : null,
  }));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('magazine-mode'), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));

  await page.goto(`${URL}#spread-supercouncil`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('magazine-mode'), { timeout: 60000 });
  await page.waitForFunction(() => {
    const indicator = document.getElementById('magazine-indicator')?.textContent || '';
    const pageNum = parseInt(indicator, 10);
    const el = document.querySelector('#spread-supercouncil');
    if (!el || pageNum < 5 || pageNum > 6) return false;
    const item = el.closest('.stf__item');
    return item && getComputedStyle(item).display !== 'none';
  }, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 400));

  const deepLink = await page.evaluate(() => {
    const indicator = document.getElementById('magazine-indicator')?.textContent || '';
    const pageNum = parseInt(indicator, 10);
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    return {
      hash: location.hash,
      pageNum,
      visibleHasSupercouncil: visible.some(el => el.querySelector('#spread-supercouncil')),
      visibleHasSupercouncilText: visible.some(el => el.textContent?.includes('SuperCouncil')),
    };
  });

  const errors = [];
  if (fresh.hash) errors.push(`carga sin hash dejó hash=${fresh.hash}`);
  if (fresh.index !== 0) errors.push(`carga sin hash no arranca en tapa (index ${fresh.index})`);
  if (afterFlips.historyLength !== historyBefore) {
    errors.push(`history.length creció (${historyBefore} → ${afterFlips.historyLength}) — pushState?`);
  }
  if (!afterFlips.hash.startsWith('#spread-')) errors.push('flips no actualizan hash');
  if (deepLink.pageNum < 5 || deepLink.pageNum > 6) {
    errors.push(`deep-link aterrizó en página ${deepLink.pageNum} (esperaba 5–6)`);
  }
  if (!deepLink.visibleHasSupercouncil && !deepLink.visibleHasSupercouncilText) {
    errors.push('deep-link #spread-supercouncil no muestra el spread');
  }

  return { fresh, afterFlips, deepLink, ok: errors.length === 0, errors };
}

async function runHashChecks(browserName, pageFactory, playwrightContext = null) {
  let page;
  try {
    const hookPushState = `(() => {
      const push = history.pushState.bind(history);
      history.pushState = (...args) => {
        window.__zineUsedPushState = true;
        return push(...args);
      };
    })();`;
    if (playwrightContext) {
      await playwrightContext.addInitScript(hookPushState);
    }
    page = await pageFactory(1280, 800);
    if (!playwrightContext && typeof page.evaluateOnNewDocument === 'function') {
      await page.evaluateOnNewDocument(hookPushState);
    }
    const result = await checkHashBehavior(page);
    return {
      browser: browserName,
      viewport: 'hash-behavior',
      data: { historyLen: result.afterFlips.historyLength, hash: result.afterFlips.hash },
      ok: result.ok,
      errors: result.errors,
    };
  } catch (err) {
    return {
      browser: browserName,
      viewport: 'hash-behavior',
      data: null,
      ok: false,
      errors: [err.message],
    };
  } finally {
    if (page) await page.close();
  }
}

async function runScrollChecks(browserName, pageFactory) {
  const page = await pageFactory(1280, 800);
  try {
    const issues = await checkNoInternalScroll(page);
    return {
      browser: browserName,
      viewport: 'scroll-audit',
      data: { issueCount: issues.length },
      ok: issues.length === 0,
      errors: issues.slice(0, 8),
    };
  } finally {
    await page.close();
  }
}

async function runFeatureChecks(browserName, pageFactory) {
  const results = [];
  for (const spreadId of ['asistente', 'supercouncil', 'gastos']) {
    const page = await pageFactory(1280, 800);
    try {
      const data = await evaluateFeatureSpread(page, spreadId);
      const errors = [];
      if (!data.hasVisual) errors.push('sin página visual');
      if (!data.hasText) errors.push('sin página de texto');
      if (!data.paired) errors.push('visual no está a la izquierda del texto');
      if (data.heroH < 120) errors.push(`hero ${data.heroH}px (tirita)`);
      results.push({
        browser: browserName,
        viewport: `feature:${spreadId}`,
        data,
        ok: errors.length === 0,
        errors,
      });
    } finally {
      await page.close();
    }
  }
  return results;
}

async function runChrome() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => {
        if (!document.body.classList.contains('magazine-mode')) return false;
        const visible = [...document.querySelectorAll('.stf__item')]
          .filter(el => getComputedStyle(el).display !== 'none');
        return visible.length > 0 && visible.some(el => el.getBoundingClientRect().height > 100);
      }, { timeout: 45000 });
      await new Promise(r => setTimeout(r, 500));
      const data = await evaluatePage(page);
      const errors = checkResult('Chrome', vp, data);
      results.push({ browser: 'Chrome', viewport: vp.name, data, ok: errors.length === 0, errors });
      await page.close();
    }
    results.push(...await runFeatureChecks('Chrome', async (w, h) => {
      const p = await browser.newPage();
      await p.setViewport({ width: w, height: h });
      return p;
    }));
    results.push(await runHashChecks('Chrome', async () => {
      const p = await browser.newPage();
      await p.setViewport({ width: 1280, height: 800 });
      return p;
    }));
    results.push(await runScrollChecks('Chrome', async () => {
      const p = await browser.newPage();
      await p.setViewport({ width: 1280, height: 800 });
      return p;
    }));
  } finally {
    await browser.close();
  }
  return results;
}

async function runFirefox() {
  const browser = await firefox.launch({ headless: true });
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => {
        if (!document.body.classList.contains('magazine-mode')) return false;
        const visible = [...document.querySelectorAll('.stf__item')]
          .filter(el => getComputedStyle(el).display !== 'none');
        return visible.length > 0 && visible.some(el => el.getBoundingClientRect().height > 100);
      }, { timeout: 45000 });
      await page.waitForTimeout(500);
      const data = await evaluatePage(page);
      const errors = checkResult('Firefox', vp, data);
      results.push({ browser: 'Firefox', viewport: vp.name, data, ok: errors.length === 0, errors });
      await context.close();
    }
    results.push(...await runFeatureChecks('Firefox', async (w, h) => {
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      return context.newPage();
    }));
    const ffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    results.push(await runHashChecks('Firefox', async () => ffContext.newPage(), ffContext));
    results.push(await runScrollChecks('Firefox', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      return context.newPage();
    }));
  } finally {
    await browser.close();
  }
  return results;
}

async function main() {
  const all = [];
  try {
    all.push(...await runChrome());
  } catch (err) {
    all.push({ browser: 'Chrome', viewport: 'ALL', ok: false, errors: [err.message], data: null });
  }
  try {
    all.push(...await runFirefox());
  } catch (err) {
    all.push({ browser: 'Firefox', viewport: 'ALL', ok: false, errors: [err.message], data: null });
  }

  let failed = 0;
  for (const r of all) {
    const status = r.ok ? 'PASS' : 'FAIL';
    if (!r.ok) failed++;
    console.log(`[${status}] ${r.browser} @ ${r.viewport}`);
    if (r.data) {
      const extra = r.data.issueCount != null
        ? `overflow issues=${r.data.issueCount}`
        : r.data.heroH != null
          ? `hero=${r.data.heroH}px paired=${r.data.paired}`
          : `visible=${r.data.visibleCount}/${r.data.totalItems} landscape=${r.data.wrapperLandscape} book=${r.data.bookWidth}x${r.data.bookHeight} pages=${r.data.flipPageTotal}`;
      console.log(`       ${extra}`);
    }
    if (r.errors?.length) r.errors.forEach(e => console.log(`       ✗ ${e}`));
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll FASE 1.1–1.4 checks passed');
  process.exit(failed ? 1 : 0);
}

main();