# Plan de correcciones #8 — Tapa oscura + PDF (arreglo real) + música de fondo

> Para Composer. Web desktop+móvil quedaron excelentes y están LIVE — no romper el flip ni el
> layout. Tres tareas independientes. Verificar a 1280×800, 1440×900 y 375×812, Chrome y Firefox.

---

## TAREA 1 — Tapa con el MISMO color que la contratapa (oscura)

**Objetivo:** la tapa (página 0, `.spread--front-cover`) deja de ser crema y pasa a **oscura como
la contratapa** (`.spread--back`, que usa `background: var(--ink)` #1a1a1a + texto crema). Así la
tapa y la contra se diferencian de las páginas interiores (que son de papel crema). En **web
(desktop + móvil) y en PDF**.

**Qué hacer (`zine.css`, reglas `.spread--front-cover` ~496-590):**
- Fondo de `.spread--front-cover`: de la gradiente crema actual → oscuro estilo contratapa
  (`var(--ink)`, o una gradiente oscura sutil tipo `linear-gradient(155deg,#1f1f1f,#141414)`).
- Invertir el texto a crema para que se lea sobre oscuro:
  - `.spread__masthead--name` (FACUNDO GALETTA): `color: var(--paper)`.
  - `.cover-eyebrow`, `.cover-kicker`, `.cover-deck--front`, `.spread__author`: a `--paper` o
    `rgba(245,240,230,.8)` (mirar cómo lo resuelve `.spread--back` en ~1057-1130 y copiar criterio).
  - El filete rojo y los acentos rojos quedan (el rojo funciona sobre oscuro).
  - CTA "Pasá la página →" (`.cover-cta`): adaptarla para fondo oscuro (ej. fondo rojo o borde
    crema), que no quede un botón oscuro sobre fondo oscuro.
  - Barcode (`.cover-barcode`) y spine: tono crema tenue para que se vean sobre oscuro.
- **Coherencia:** la tapa debe quedar visualmente hermana de la contratapa (mismo color base),
  no idéntica en layout. Mantener la composición ya aprobada (nombre grande + gancho horizontal).

**Criterio:** tapa oscura, texto crema legible, en desktop, móvil y PDF. Contraste AA en el body.

---

## TAREA 2 — Arreglar el PDF (hoy salen 82 hojas; deben ser 22)

**Diagnóstico:** en `@media print`, cada `.flip-page` se imprime con `height:auto` y el contenido
(capturas grandes + texto denso) crece más alto que una A4 → el navegador parte cada página en
~4 hojas → 22 × ~3.7 ≈ 82. El `break-inside: avoid` actual no alcanza porque el contenido no entra.

**La oportunidad:** la página del fanzine es ~10:14 (0.714) ≈ proporción A4 (0.707). Entra UNA
página del fanzine por UNA hoja A4 casi perfecto. Y el área útil de una A4 (~703×994px) es MÁS
grande que la tarjeta en pantalla (~487×682px), así que **todo lo que entra en pantalla entra en
la hoja** sin recortar.

**Estrategia: una flip-page = una hoja A4, contenida, sin desborde** (reescribir el bloque
`@media print` en `zine.css` ~1494-1790):
- `@page { size: A4 portrait; margin: 0; }` (la tarjeta trae su propio padding interno).
- Cada `.flip-page` en print = una hoja fija que NO se parte:
  ```css
  .flip-page {
    box-sizing: border-box;
    width: 210mm;
    height: 297mm;
    overflow: hidden;          /* nada se desborda a una 2da hoja */
    break-inside: avoid;
    break-after: page;         /* una por hoja */
    display: flex;
  }
  .flip-page:last-child { break-after: auto; }   /* evita hoja final en blanco */
  .flip-page .spread { width: 100%; height: 100%; }
  ```
- **Quitar el doble salto:** hoy saltan tanto `.flip-page + .flip-page` como `.spread + .spread`
  (~1589-1593). Dejar UN solo mecanismo (`break-after` por flip-page). El doble puede meter hojas
  en blanco.
- **Imágenes contenidas:** que las capturas no revienten el alto —
  `.feature-hero img, .spread img, .collage-photo img { max-height: 60vh; object-fit: contain; }`
  (o lo que entre dentro de la hoja). El `overflow:hidden` de la flip-page es la red de seguridad.
- **Respetar tapa/contra oscuras (interacción con TAREA 1):** hoy print fuerza
  `.spread { background: var(--paper) !important }` (~1569). Excluir cover y back para que
  impriman OSCURAS: `.spread--front-cover, .spread--back { background: var(--ink) !important;
  color: var(--paper) !important; }` con `print-color-adjust: exact` (ya está en body).
- El `preparePrintDOM()` de `zine.js` (~1115) ya desarma el flip y pone las flip-pages en bloque;
  no debería hacer falta tocar JS, pero verificar que tras imprimir el flip se restablece
  (`cleanupPrint` ya llama `reenableMagazine`).

**Criterio de aceptación (medible):** el PDF generado tiene **exactamente 22 hojas** (una por
flip-page), cada hoja = una página del fanzine completa y centrada, sin recortes ni hojas en
blanco, tapa y contra en oscuro, imágenes nítidas. Probar con "Guardar como PDF" en Chrome
(botón PDF) y contar las hojas. Si queda alguna página apretada, ajustar tamaños de fuente solo
para print, NO el layout web.

> Nota: si el approach CSS quedara finicky en algún navegador, el fallback aceptable es exportar
> con una herramienta headless (puppeteer `page.pdf({format:'A4'})` recorriendo las flip-pages),
> pero **intentar primero el CSS** (cero dependencias, coherente con el "sin build step").

---

## TAREA 3 — Música de piano relajante de fondo (toggle)

**Objetivo:** sumar música de piano suave de fondo, con un botón para prender/apagar, al lado del
botón de sonido de página (`#btn-flip-sound` en `index.html:57`). Apagada por default.

**Qué hacer:**
- **Archivo:** agregar un loop de piano **royalty-free / CC0** (Pixabay Music, Free Music Archive
  CC0, etc.), liviano (<2MB), loopeable, en `audio/piano-loop.mp3` (+ `.ogg` opcional para
  compatibilidad). Que Facu pueda cambiar el track después reemplazando el archivo. (Dejar la
  elección final del tema a Facu; usar uno CC0 de placeholder y anotar la fuente/licencia en un
  comentario o en el README.)
- **Markup:** `<audio id="bg-music" loop preload="none"><source src="audio/piano-loop.mp3"
  type="audio/mpeg"></audio>` + un botón `#btn-music` en `.zine-toolbar` (junto a flip-sound),
  con `aria-pressed` y `title="Música de fondo"`, ícono `🎵`/`🔈`.
- **Comportamiento (en `zine.js`, mismo patrón que `initFlipUx` ~695):**
  - Apagada por default. Estado en `localStorage` (clave tipo `zine-bg-music`).
  - Arranca SOLO con gesto del usuario (click del toggle) — los navegadores bloquean autoplay con
    sonido; está bien y es lo cortés. Nada de autoplay al cargar.
  - Volumen bajo (`audio.volume = 0.2`), `loop`. Toggle pausa/reanuda y persiste preferencia.
  - Si la preferencia guardada es "on", esperar el primer gesto del usuario (click en cualquier
    lado o en el toggle) para iniciar, por la policy de autoplay.
  - Móvil: mismo toggle; iOS puede pausar al ir a segundo plano (aceptable, no forzar).
- **Independiente del sonido de página:** son dos controles separados (uno es el flip-sound
  sintetizado existente, otro la música). No mezclarlos.

**Criterio:** botón visible en desktop y móvil; música apagada por default; al prenderla suena el
piano en loop a bajo volumen; la preferencia se recuerda; no suena nada sin que el usuario lo pida.

---

## Orden sugerido
1. TAREA 1 (tapa oscura) — contenida, valida rápido en web.
2. TAREA 2 (PDF) — la más delicada; depende de TAREA 1 para los colores de cover/back en print.
3. TAREA 3 (música) — independiente, al final.

No tocar: motor de flip, transiciones, layouts de páginas interiores, `scripts/serve.js`, puerto
8787. Verificar PDF contando hojas (= 22) antes de dar TAREA 2 por hecha.
