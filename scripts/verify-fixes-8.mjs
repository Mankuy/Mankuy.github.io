/**
 * Plan correcciones #8 — tapa oscura, PDF 22 hojas, música Mozart
 * Run: node scripts/verify-fixes-8.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { firefox } from 'playwright-core';

const URL = 'http://localhost:8787/';
const CHROME = '/home/facajgs/.local/bin/google-chrome';

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '375x812', width: 375, height: 812 },
];

function isPuppeteerPage(page) {
  return typeof page.setViewport === 'function';
}

async function setViewport(page, vp) {
  if (isPuppeteerPage(page)) await page.setViewport(vp);
  else await page.setViewportSize({ width: vp.width, height: vp.height });
}

async function waitMagazine(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    return document.body.classList.contains('magazine-mode')
      && document.querySelectorAll('.stf__item').length === 22;
  }, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 600));
}

function countPdfPages(buffer) {
  const text = buffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 0;
}

async function checkFrontCoverDark(page, label) {
  const data = await page.evaluate(() => {
    const cover = document.querySelector('.spread--front-cover');
    if (!cover) return { ok: false, reason: 'sin .spread--front-cover' };
    const cs = getComputedStyle(cover);
    const name = cover.querySelector('.spread__masthead--name');
    const nameColor = name ? getComputedStyle(name).color : '';
    const bg = cs.backgroundColor;
    const rgb = bg.match(/\d+/g)?.map(Number) || [];
    const luminance = rgb.length >= 3
      ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2])
      : 255;
    const nameRgb = nameColor.match(/\d+/g)?.map(Number) || [];
    const nameLum = nameRgb.length >= 3
      ? (0.299 * nameRgb[0] + 0.587 * nameRgb[1] + 0.114 * nameRgb[2])
      : 0;
    return {
      ok: luminance < 80 && nameLum > 180,
      bg,
      nameColor,
      luminance: Math.round(luminance),
      nameLum: Math.round(nameLum),
    };
  });
  return { label, ...data };
}

async function checkMusicControls(page) {
  return page.evaluate(() => {
    const toggle = document.getElementById('btn-music');
    const prev = document.getElementById('btn-music-prev');
    const next = document.getElementById('btn-music-next');
    const audio = document.getElementById('bg-music');
    return {
      ok: !!(toggle && prev && next && audio),
      togglePressed: toggle?.getAttribute('aria-pressed'),
      prevHidden: prev?.hidden,
      playlistFetchable: true,
    };
  });
}

async function generatePdf(page) {
  await page.evaluate(async () => {
    if (typeof window.zinePreparePrintDOM === 'function') window.zinePreparePrintDOM();
    document.body.classList.add('printing', 'print-prep');
    await new Promise(r => setTimeout(r, 200));
  });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  return pdf;
}

async function runBrowser(name, launch, { withPdf = false } = {}) {
  const browser = await launch();
  const page = await browser.newPage();
  const results = { browser: name, covers: [], pdfPages: null, music: null, errors: [] };

  try {
    for (const vp of VIEWPORTS) {
      await setViewport(page, vp);
      await waitMagazine(page);
      const cover = await checkFrontCoverDark(page, `${name}@${vp.name}`);
      results.covers.push(cover);
      if (!cover.ok) results.errors.push(`tapa no oscura en ${vp.name}`);
    }

    await setViewport(page, VIEWPORTS[0]);
    await waitMagazine(page);
    results.music = await checkMusicControls(page);
    if (!results.music.ok) results.errors.push('controles de música incompletos');

    if (withPdf) {
      const pdfBuffer = await generatePdf(page);
      results.pdfPages = countPdfPages(pdfBuffer);
      if (results.pdfPages !== 22) {
        results.errors.push(`PDF tiene ${results.pdfPages} hojas (esperado 22)`);
      }
    }
  } finally {
    await browser.close();
  }

  results.ok = results.errors.length === 0;
  return results;
}

async function main() {
  const chrome = await runBrowser('chrome', () => puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }), { withPdf: true });

  const ff = await runBrowser('firefox', () => firefox.launch({ headless: true }));

  const all = [chrome, ff];
  for (const r of all) {
    console.log(`\n=== ${r.browser} ===`);
    console.log(`PDF pages: ${r.pdfPages}`);
    console.log(`Music controls: ${r.music?.ok ? 'OK' : 'FAIL'}`);
    for (const c of r.covers) {
      console.log(`  ${c.label}: bg=${c.bg} lum=${c.luminance} name=${c.nameColor} → ${c.ok ? 'OK' : 'FAIL'}`);
    }
    if (r.errors.length) console.log('Errors:', r.errors.join('; '));
    else console.log('All checks passed');
  }

  const failed = all.some(r => !r.ok);
  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});