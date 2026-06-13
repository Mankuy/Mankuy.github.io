/**
 * Plan correcciones #2 — Chrome + Firefox @ 1280×800 y 1440×900
 * Run: node scripts/verify-fixes-2.mjs
 */
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';
const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
];

async function waitMagazine(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.querySelectorAll('.stf__item').length === 21;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));
}

async function flipToSpread(page, spreadId) {
  await page.goto(`${URL}#spread-${spreadId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.stf__item').length === 21, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));
}

async function evaluateCoverIndex(page) {
  return page.evaluate(() => {
    const visibleItems = [...document.querySelectorAll('.stf__item')]
      .filter(el => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      });

    const cover = document.querySelector('.spread--cover');
    const issue = cover?.querySelector('.spread__issue');
    const hero = cover?.querySelector('.cover-hero');
    const issueRect = issue?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    const coverOverlap = !!(issueRect && heroRect && heroRect.top < issueRect.bottom - 2);
    const coverImages = cover ? cover.querySelectorAll('img, picture').length : 0;

    const indexSpread = visibleItems.find(el => el.querySelector('.spread--index'));
    const indexList = indexSpread?.querySelector('.index-list');
    const indexStyle = indexList ? getComputedStyle(indexList) : null;
    const indexNotes = indexSpread ? indexSpread.querySelectorAll('.index-list__note').length : 0;
    const tierEls = indexSpread ? [...indexSpread.querySelectorAll('.index-list__tier')] : [];
    const tierClipped = tierEls.filter(el => el.scrollWidth > el.clientWidth + 1);

    return {
      coverOverlap,
      coverImages,
      coverTypographic: !!cover?.classList.contains('spread--cover--type'),
      indexColumns: indexStyle?.columnCount || indexStyle?.columns || '1',
      indexNotes,
      tierClipped: tierClipped.length,
      tierTexts: tierEls.map(el => el.textContent.trim()),
      visibleCount: visibleItems.length,
    };
  });
}

async function evaluateSpreadPage(page, spreadId) {
  return page.evaluate((id) => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const visualItem = visible.find(el => el.querySelector(`#spread-${id}.spread--feature-visual`));
    const textItem = visible.find(el => el.querySelector('.spread--feature-text'));
    const textSpread = textItem?.querySelector('.spread--feature-text');
    const visualPolaroid = visualItem?.querySelector('.feature-polaroid--visual');
    const textPolaroid = textSpread?.querySelector('.feature-polaroid:not(.feature-polaroid--visual)');
    const logo = textSpread?.querySelector('.feature-logo');
    const tags = [...(textSpread?.querySelectorAll('.tag') || [])];
    const tagClipped = tags.filter(t => t.scrollWidth > t.clientWidth + 1);
    const panel = textSpread?.querySelector('.panel');
    const panelOverflow = panel ? panel.scrollHeight > panel.clientHeight + 2 : false;
    return {
      hasVisual: !!visualItem,
      hasText: !!textSpread,
      visualPolaroid: !!visualPolaroid,
      textPolaroid: !!textPolaroid,
      logo: !!logo,
      tagClipped: tagClipped.length,
      panelOverflow,
      tagTexts: tags.map(t => t.textContent.trim()),
    };
  }, spreadId);
}

async function setViewport(page, vp) {
  if (typeof page.setViewport === 'function') await page.setViewport(vp);
  else await page.setViewportSize({ width: vp.width, height: vp.height });
}

async function runViewport(browserName, page, vp) {
  const errors = [];
  await setViewport(page, vp);
  await waitMagazine(page);

  const data = await evaluateCoverIndex(page);
  console.log(`[${browserName} ${vp.name}] cover`, { overlap: data.coverOverlap, images: data.coverImages, type: data.coverTypographic });
  console.log(`[${browserName} ${vp.name}] index`, { columns: data.indexColumns, notes: data.indexNotes, tiers: data.tierTexts, clipped: data.tierClipped });

      if (data.coverOverlap) errors.push(`${browserName} ${vp.name}: tapa — texto tapado`);
      if (data.coverImages > 0) errors.push(`${browserName} ${vp.name}: tapa con imágenes (${data.coverImages})`);
      if (!data.coverTypographic) errors.push(`${browserName} ${vp.name}: tapa no tipográfica`);
  if (Number(data.indexColumns) > 1) errors.push(`${browserName} ${vp.name}: índice en ${data.indexColumns} columnas`);
  if (data.indexNotes > 0) errors.push(`${browserName} ${vp.name}: índice muestra notes (${data.indexNotes})`);
  if (data.tierClipped > 0) errors.push(`${browserName} ${vp.name}: ${data.tierClipped} etiquetas tier cortadas`);

  for (const spreadId of ['asistente', 'supercouncil', 'gastos']) {
    await flipToSpread(page, spreadId);
    const s = await evaluateSpreadPage(page, spreadId);
    console.log(`[${browserName} ${vp.name}] ${spreadId}`, s);
    if (s.textPolaroid) errors.push(`${browserName} ${vp.name}: ${spreadId} — polaroid en página de texto`);
    if (s.tagClipped > 0) errors.push(`${browserName} ${vp.name}: ${spreadId} — ${s.tagClipped} tags cortados`);
    if (spreadId !== 'gastos' && !s.visualPolaroid) {
      errors.push(`${browserName} ${vp.name}: ${spreadId} — falta polaroid en página visual`);
    }
    if ((spreadId === 'asistente' || spreadId === 'supercouncil') && !s.logo) {
      errors.push(`${browserName} ${vp.name}: ${spreadId} — falta logo`);
    }
    if (s.panelOverflow) errors.push(`${browserName} ${vp.name}: ${spreadId} — scroll interno en panel`);
  }

  await flipToSpread(page, 'colofon');
  const colofon = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.stf__item')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const el = visible.find(v => v.querySelector('#spread-colofon'))?.querySelector('.panel__title');
    return el?.textContent?.trim() || '';
  });
  console.log(`[${browserName} ${vp.name}] colofon`, colofon);
  if (colofon !== 'Cómo se hizo') errors.push(`${browserName} ${vp.name}: colofón título "${colofon}"`);

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
    console.error('\nFIXES #2 FAIL:');
    allErrors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('\nFIXES #2 OK — Chrome + Firefox @ 1280×800 y 1440×900');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});