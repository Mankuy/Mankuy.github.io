#!/usr/bin/env node
/**
 * new-spread.js — Agrega una viñeta al fanzine
 * Uso: node scripts/new-spread.js "Nombre del Proyecto" [layout]
 * Layouts: diary (default) | product | web | editorial
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPREADS_PATH = path.join(ROOT, 'spreads.json');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const title = process.argv[2];
  const layout = process.argv[3] || 'diary';

  if (!title) {
    console.log(`
Uso: node scripts/new-spread.js "Nombre del Proyecto" [layout]

Layouts:
  diary     — uso personal (default)
  product   — público, con CTA
  web       — proyecto en la web
  editorial — texto largo / historia

Ejemplo:
  node scripts/new-spread.js "Control de Plantas" diary
`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(SPREADS_PATH, 'utf8'));
  const spreads = data.spreads;
  const maxPage = spreads.reduce((m, s) => Math.max(m, s.page), 0);
  const id = slugify(title);

  if (spreads.some(s => s.id === id)) {
    console.error(`Error: ya existe un spread con id "${id}"`);
    process.exit(1);
  }

  const base = {
    id,
    page: maxPage + 1,
    layout,
    title,
    hook: 'Escribí acá el gancho — el problema que tenías.',
    body: 'Qué hace la herramienta. Primera persona, 2-3 oraciones.',
  };

  let spread;
  if (layout === 'product') {
    spread = {
      ...base,
      tier: 'public',
      tags: ['Nuevo'],
      cta: { label: 'Próximamente', url: null, disabled: true }
    };
  } else if (layout === 'web') {
    spread = {
      ...base,
      tier: 'web',
      tags: ['En vivo'],
      cta: { label: 'Visitar', url: 'https://', disabled: false }
    };
  } else if (layout === 'editorial') {
    spread = { ...base, stamp: null, note: null };
  } else {
    spread = { ...base, tier: 'personal', stamp: 'USO PERSONAL' };
  }

  spreads.push(spread);
  data.meta.updated = new Date().toISOString().slice(0, 10);
  data.spreads = spreads.sort((a, b) => a.page - b.page);

  fs.writeFileSync(SPREADS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`✓ Spread agregado: "${title}"`);
  console.log(`  id:     ${id}`);
  console.log(`  page:   ${spread.page}`);
  console.log(`  layout: ${layout}`);
  console.log(`\nEditá spreads.json para completar hook, body y links.`);
  console.log(`Preview: node scripts/serve.js → http://localhost:8787`);
}

main();