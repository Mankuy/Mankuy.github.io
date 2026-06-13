/**
 * Genera IMG/og-image.png (1200×630) para Open Graph / X
 * Run: node scripts/generate-og.mjs
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CARD = path.join(__dirname, 'og-card.html');
const OUT = path.join(ROOT, 'IMG', 'og-image.png');
const CHROME = '/home/facajgs/.local/bin/google-chrome';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(`file://${CARD}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: OUT, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log('OG image:', OUT);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});