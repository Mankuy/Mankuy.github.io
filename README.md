# Construí esto — Fanzine #1

Landing de Facundo Galetta como **fanzine web**: cada proyecto es una viñeta, no una card de portfolio.

## Preview local

```bash
node scripts/serve.js
# → http://localhost:8787
```

> `fetch` no funciona abriendo `index.html` directo (`file://`). Usá el servidor.

## Agregar un proyecto nuevo

```bash
node scripts/new-spread.js "Nombre del Proyecto" diary
node scripts/new-spread.js "Mi App Pública" product
node scripts/new-spread.js "Sitio de un amigo" web
```

Después editá `spreads.json` y completá `hook`, `body`, `cta`, etc.

Plantilla manual: `spreads/TEMPLATE.json`

## Estructura

| Archivo | Rol |
|---------|-----|
| `spreads.json` | **Fuente de verdad** — todo el contenido |
| `zine.css` | Sistema visual (paneles, collage, print) |
| `zine.js` | Renderer — monta spreads en el DOM |
| `index.html` | Shell mínimo |
| `scripts/new-spread.js` | CLI para nueva viñeta |
| `scripts/serve.js` | Preview local |

## Layouts disponibles

- `cover` — portada
- `editorial` — texto narrativo (historia, intro)
- `product` — herramienta pública con CTA
- `web` — proyecto en la web
- `diary` — uso personal, sin link
- `back-cover` — cierre + links

## PDF

Botón **PDF** arriba a la derecha, o `Ctrl+P`. CSS `@media print` optimizado.

## Publicar

Subir a `Mankuy.github.io` (GitHub Pages). El fanzine funciona sin build step.