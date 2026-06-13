# Auditoría + Plan de remediación — Fanzine "Construí esto"

> Auditado: 2026-06-12. Código revisado completo (zine.js 777 líneas, zine.css 1947 líneas,
> spreads.json 12 spreads, vendor StPageFlip) + inspección en vivo (DOM) + capturas reales de Facu.
> Estado: el concepto es bueno; el motor tiene 1 bug raíz que rompe desktop, y el sistema
> visual necesita subir de "scrapbook 2012" a "editorial 2026".

---

## PARTE 1 — DIAGNÓSTICO

### 🔴 BUG RAÍZ (explica la mayoría de los síntomas): PageFlip entra en modo landscape no diseñado

**Evidencia:**
- StPageFlip decide solo entre portrait (1 página) y landscape (2 páginas) según el ancho del contenedor.
- En cualquier viewport ≥ ~900px entra en `--landscape` (verificado: `.stf__wrapper.--landscape` a 950, 1100 y 1440px).
- La librería escribe **estilos inline** en `#flip-book`: `width: 100%; max-width: 1120px` (2 × maxWidth 560)
  que **pisan** el CSS `body.magazine-mode .flip-book { width: min(520px, 88vw) }` (zine.css ~1503).
- TODO el CSS de `magazine-mode` (zine.css 1458-1936) fue diseñado para UNA página por vez
  ("una página a la vez" era el diseño original). Nadie estiló el modo 2 páginas.

**Síntomas que produce (capturas de Facu):**
1. **Contenido decapitado:** pág 3 arranca "monografías) con IA…" — el título "Asistente Académico",
   el hook y la imagen quedan recortados arriba (`justify-content: center` + `overflow: hidden`
   en `.flip-page .spread`, zine.css ~1517-1533). Abajo igual: bullets cortados a mitad de frase
   sin ningún indicador.
2. **Imágenes colapsadas a "tiritas":** Gastos (collage duo) y Jardín (solo) renderizan láminas
   de 2-3px de alto bajo la cinta adhesiva. El grid 50/50 de magazine-mode
   (`grid-template-columns: 1fr 1fr`, zine.css ~1595) + `max-height` + `overflow-y: auto` del
   collage + los translate del duo (zine.css ~854-874) colapsan dentro de la media página de ~466px.
3. **En el navegador embebido del preview (Chromium): libro 100% EN BLANCO** — las 12
   `.stf__item` quedan `display:none`. En Firefox renderiza (roto); en otros engines ni eso.
4. Scrollbars internos en páginas (overflow-y:auto) = anti-inmersivo. Una revista no scrollea
   adentro de la página.

### 🟠 Bugs secundarios

5. **Hash pegajoso:** cada flip hace `pushState` con `#spread-X` (zine.js ~502-508, 618).
   Al recargar/compartir, la revista arranca en la pág 3 o donde quedó — nunca en la tapa.
   Además ensucia el historial del navegador (volver atrás = des-hojear).
6. **`doodle-drift`:** SVG de fondo a 140% del viewport rotando 360° en loop infinito
   (zine.css 60-72). Compositing GPU constante; colgó la captura del preview embebido y en
   notebooks = ventilador. Encima es invisible (opacity 0.035).
7. **Repetición de imágenes:** las 9 capturas aparecen TODAS en cover (8 polaroids de ≤88px),
   TODAS en intro, TODAS en historia y 4 en back-cover. Capturas de apps 2.1:1 en marcos de
   72-96px = manchas ilegibles. Cada imagen pierde valor por repetición.
8. **Aspect ratios ignorados:** 7/9 imágenes son apaisadas (~2.1:1), 2 son verticales de
   Telegram (~0.6:1). Los layouts las tratan igual (marcos cuadrados/anchos fijos).
9. **Accesibilidad:** botones de lightbox dentro de páginas `display:none` siguen tabulables;
   `cover-pulse` infinito sin pausa; textos mono de 7-9px (cover-barcode 7px, tags 8px) ilegibles.
10. **PDF:** `preparePrint` depende de destruir el flip y re-armar el DOM — frágil; re-testear
    al final, no antes.

### 🟡 Veredicto estético (por qué se ve "de hace 10 años")

- **Tipografía cómica literal:** Bangers + Patrick Hand + Special Elite es el kit "scrapbook
  de plantilla 2012". El look fanzine 2026 es **editorial con carácter**, no Comic Sans vestido.
- **Tilt + cinta adhesiva en TODO:** cuando todo está torcido, nada está torcido. El recurso
  pierde fuerza y suma ruido visual.
- **Capturas crudas pegadas:** screenshot sin marco ni tratamiento = poco pro. Las apps
  merecen presentación de producto (browser frame, sombra real, tamaño protagonista).
- **Bocadillos de historieta** para los hooks (border-radius 18px + flechita) = infantil.
- **Jerarquía plana:** títulos typewriter chicos, hook en bocadillo, body manuscrito —
  compiten entre sí, nada manda.
- **El escritorio de fondo** (gris plano con 2 gradientes) no vende "objeto físico sobre mesa".

---

## PARTE 2 — PLAN DETALLADO

> Principio rector: **la revista abierta de a DOS páginas es un regalo, no un bug** — es lo
> más inmersivo que hay. Se abraza el landscape y se diseña cada proyecto como un *spread*
> real de revista: **página izquierda = imagen hero grande; página derecha = texto**.
> Eso resuelve de un golpe: imágenes protagonistas en su proyecto, legibilidad, y look pro.

### FASE 0 — Decisión de formato

- [x] **A — DECIDIDO por Facu (2026-06-12):** Desktop ≥1024px = libro abierto SIEMPRE de
      2 páginas (landscape controlado por nosotros). 600-1023 = 1 página (portrait).
      <600 = scroll vertical actual.
- El resto del plan asume A. No re-discutir.

### FASE 1 — Reparar el motor (crítico, primero)

**1.1 Controlar PageFlip en vez de sufrirlo** (`zine.js` initMagazine ~593-610):
- Calcular en JS las dimensiones de página ANTES de instanciar: ratio de página fijo
  (ej. 10:14, A5-ish), `pageH = min(84vh, 760px)`, `pageW = pageH × 10/14`,
  y pasar `size: 'fixed'`, `width: pageW`, `height: pageH`.
- En landscape el libro mide `2 × pageW` — dimensionar `#flip-book` acorde (la lib pone
  inline styles: dejarla, pero con nuestros números).
- `usePortrait: true` se mantiene (en 600-1023 la lib cae a 1 página sola).
- En `resize` (debounce 200ms): si cambió el bucket de tamaño → `destroy()` + re-init en la
  misma página (`startPage: current`). El `update()` actual no recalcula orientación.
- **Criterio de aceptación:** a 1280×800 y 1920×1080 se ven 2 páginas lado a lado con
  contenido completo; a 768×1024 una página; nunca libro en blanco (probar en Chrome Y Firefox).

**1.2 Spreads en PARES imagen|texto** (`spreads.json` + `zine.js`):
- Nuevo layout `"feature"`: cada proyecto genera DOS flip-pages:
  - **Página izquierda (visual):** imagen hero full-bleed (la captura del proyecto a ~80-90%
    del área, enmarcada en browser-frame CSS), caption corta abajo, folio.
  - **Página derecha (texto):** kicker de sección, título, hook, body, bullets, tags, CTA, folio.
- En `spreads.json` cada proyecto pasa a tener `hero: { src, caption }` + el resto igual.
  El renderer emite 2 páginas por spread (par/impar alineado para que SIEMPRE caigan
  enfrentadas: visual a la izquierda, texto a la derecha → ojo con el offset de la tapa:
  con `showCover: true` la tapa va sola y los pares quedan alineados naturalmente).
- Verticales de Telegram (supercounciltelegram, gastos-telegram): van como "segunda foto"
  chica SOBRE la página de texto (polaroid única con tilt — ahí SÍ el recurso rinde), no
  apretadas junto a la hero.
- **Criterio:** cada captura aparece grande y legible UNA vez, en su proyecto. Cero "tiritas".

**1.3 Presupuesto de contenido por página** (`spreads.json` copy):
- Página de texto: kicker + título + hook (1 línea) + body (máx 2 párrafos × 3 líneas) +
  máx 4 bullets + tags + CTA. Lo que no entra, SE CORTA EN EL JSON, no en el render.
- Eliminar `overflow-y: auto` y `max-height` internos de panels en magazine-mode.
  `overflow: hidden` queda solo como red de seguridad, no como mecánica.
- SuperCouncil hoy tiene 7 bullets + pullquote larguísima → recortar a 4 bullets y pullquote
  de 1-2 líneas (el detalle vive en Gumroad).
- **Criterio:** las 12 (→ ~20) páginas se ven completas sin scroll interno a 1280×800.

**1.4 Arranque y hash:**
- `setHash` → usar SIEMPRE `history.replaceState` (nunca pushState).
- Al cargar sin hash: tapa. Con hash: ir directo (deep-link sigue funcionando).

**1.5 Performance:**
- Eliminar la animación `doodle-drift` (dejar el SVG estático) — es invisible y quema GPU.
- `cover-pulse`: máx 3 iteraciones y parar.
- Imágenes: convertir PNG pesados a WebP (gonzadiscos 811KB → ~80KB) + `srcset`. Total hoy
  ~3.1MB de PNG para una landing.

### FASE 2 — Sistema visual 2026 (el "WOOW")

**2.1 Tipografía nueva** (reemplaza el kit cómico completo):
- Display: **Fraunces** (Black, optical size alto, ejes SOFT/WONK al gusto) — tiene el
  carácter "imprenta con alma" del fanzine sin el cartoon. Bonus: ya la usa Gonza Discos.
- Cuerpo: **Space Grotesk** (ya está cargada como mono-cousin) o Inter.
- Metadata/folios: **Space Mono** (se queda).
- Eliminar: Bangers, Patrick Hand, Special Elite. La "mano humana" la ponen la composición
  y los sellos, no la font.
- Escala: masthead tapa ~clamp(3.5-6rem); títulos de proyecto ~2.2-2.8rem; body 1-1.05rem/1.6;
  NADA bajo 11px.

**2.2 Anatomía de página de revista real:**
- Folio verdadero en cada página: arriba `CONSTRUÍ ESTO · Nº1` (izq) / sección (der);
  abajo número de página grande-chico estilo editorial.
- Kickers de sección como cabecera de la página de texto: `USAR HOY` / `EN LA WEB` /
  `DE MI CASA` / `EN EL TALLER` — en mono 11px tracking ancho + filete.
- Tilt y cinta: UN elemento torcido por spread máximo (la polaroid secundaria o el sello).
  Las páginas, derechas.
- Hooks: de bocadillo de historieta → **deck editorial**: 1.25rem itálica Fraunces con
  filete rojo a la izquierda.
- Sellos "USO PERSONAL"/"EN DESARROLLO": se quedan (funcionan), pero tipografía mono 10px
  tracking ancho y un solo ángulo (-4°) consistente.

**2.3 Tratamiento de imágenes:**
- Browser-frame CSS puro para capturas desktop (barra superior con 3 puntos + URL fantasma);
  phone-frame para las 2 verticales de Telegram.
- Sombra: doble (contacto 0 2px 8px + ambiente 0 24px 48px rgba(0,0,0,.18)) — nada de
  `box-shadow: 4px 4px 0` duro en fotos.
- Filtro unificado sutil (contrast 1.05, saturate .95) para que las 9 capturas convivan.
- Caption bajo la hero: mono 10px, "fig. 01 — Boardroom en vivo".

**2.4 Tapa de revista REAL (la primera impresión es el 80%):**
- Masthead `CONSTRUÍ ESTO` en Fraunces Black enorme, ligeramente solapado por la imagen
  (la imagen TAPA parte de las letras = truco de tapa de revista de verdad).
- UNA imagen hero (SuperCouncil, la mejor captura) en duotono rojo/tinta o con grano,
  NO 8 polaroids ilegibles.
- Coverlines reales en los costados (3-4, cortas, con número de página: "Un consejo de IAs
  que no te da la razón — p.04").
- Mantener: barcode, precio "GRATIS · Nº1 · MVD · 2026", "Pasá la página →".
- Lomo con gradiente + textura de papel global (grain PNG sutil multiply en toda página).

**2.5 Escritorio (el fondo):**
- Gradiente radial cálido oscuro + viñeta + textura sutil (fieltro/madera muy tenue).
- Sombra del libro proyectada en la mesa (elipse blur debajo del flip-book).
- El doodle SVG: estático, opacity 0.05, y que se note apenas (o eliminarlo).

**2.6 Micro-interacciones (inmersión "fanzine real"):**
- Hover en borde derecho/izquierdo: la esquina hace **peel** sutil (StPageFlip ya soporta
  drag de esquina — habilitar `clickEventForward` y mostrar dog-ear con CSS en hover).
- Hint inicial una sola vez: "→ pasá la página (o arrastrá la esquina)" — desaparece al
  primer flip (localStorage).
- `flippingTime: 700`, `maxShadowOpacity: 0.4` (el 0.6 actual ensombrece de más).
- Lightbox: se queda, ya funciona bien.
- Opcional fino: sonido de hoja al voltear, OFF por defecto, toggle 🔇 junto al botón PDF.

### FASE 3 — Contenido

- 3.1 Reescribir copy al presupuesto de 1.3 (recortar, no reescribir de cero — el copy es bueno).
- 3.2 Nueva captura del Asistente mostrando LAS TARJETAS de corrección (la feature estrella
      no se ve en la captura actual). Idealmente también una vertical para variedad.
- 3.3 Página nueva "Colofón" antes de la contratapa: cómo está hecho el fanzine (vanilla JS,
      StPageFlip, cero frameworks, hecho en MVD) — autoridad técnica + simpatía nerd.

### FASE 4 — Mobile + PDF (después del refactor visual)

- 4.1 Mobile <600px: scroll vertical con el MISMO sistema visual nuevo (hoy quedaría
      inconsistente). Hero arriba, texto abajo, sin flip (el flip en touch chico es tortura).
- 4.2 Re-test del botón PDF post-refactor (preparePrint depende del DOM viejo).
      Criterio: Chrome → Guardar como PDF = 20+ páginas completas, imágenes incluidas.

### FASE 5 — QA + publicación

- Checklist: 1920/1280/768/375 × las ~20 páginas; consola sin 404 ni warnings; Firefox +
  Chrome; `prefers-reduced-motion` (flip instantáneo); Lighthouse perf ≥85 (hoy: PNGs 3MB).
- Publicar en `Mankuy.github.io` + OG image (la tapa renderizada 1200×630 — la tapa ES el
  marketing en X).

---

## Orden de ejecución sugerido

| Paso | Qué | Toca |
|------|-----|------|
| 1 | FASE 1 completa (motor) | zine.js, spreads.json (estructura), zine.css (quitar magazine-mode roto) |
| 2 | FASE 2.1-2.3 (tipografía + páginas + imágenes) | zine.css, index.html (fonts) |
| 3 | FASE 2.4-2.6 (tapa + desk + micro) | zine.css, zine.js, spreads.json (cover) |
| 4 | FASE 3 (copy + capturas) | spreads.json, IMG/ |
| 5 | FASE 4-5 (mobile, PDF, QA, deploy) | todo |

**Regla para quien ejecute (humano o agente):** el contrato del renderer es
`spreads.json → RENDERERS[layout] → flip-pages`. Cualquier layout nuevo se agrega como
renderer nuevo SIN tocar los existentes hasta que el reemplazo esté probado. Probar SIEMPRE
en Chrome y Firefox a 1280×800 antes de dar por hecho un paso (el bug raíz era invisible
en un solo browser).
