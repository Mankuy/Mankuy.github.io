# Plan de correcciones #2 — Fanzine "Construí esto"

> Para Composer. El motor (formato A, 2 páginas en desktop) y las transiciones quedaron BIEN —
> NO tocar eso. Esto son 5 fixes de layout puntual + logos. La FASE 5 (deploy) del plan
> anterior sigue EN SUSPENSO. Probar SIEMPRE a 1280×800 y 1440×900 en Chrome y Firefox.
>
> Recordatorio de arquitectura: el cover NO va solo — `showCover:false` es CORRECTO porque así
> los pares quedan (cover|intro)(proyecto-img|proyecto-txt)…. NO cambiar a `showCover:true`:
> desalinea todos los pares imagen|texto. La tapa comparte spread con el índice por diseño.

---

## FIX 1 — Tapa (página 1, mitad izquierda del spread)

**Problemas (captura):**
- La imagen hero tapa el subtítulo rojo "Herramientas para problemas que tengo de verdad"
  (el borde superior de la imagen se monta sobre el texto).
- La imagen tiene una **zona muerta** grande (gris/rosa) abajo: es la captura de SuperCouncil
  (1913×875, apaisada 2.19:1) metida en un marco alto → queda media imagen vacía. Feo.

**Qué hacer:**
- La tapa vive en MEDIA página (mitad izquierda), así que todo tiene que entrar ahí:
  masthead → subtítulo → hero → autor → CTA, sin overlap y sin scroll.
- Subtítulo y hero: separar con espacio real (gap/margin en `.cover-poster`); el hero arranca
  DEBAJO del subtítulo, nunca encima. Quitar cualquier `margin-top` negativo o `position:absolute`
  que cause el montaje.
- Hero sin zona muerta: marco con `aspect-ratio` apaisado (ej. 16/10) + `object-fit: cover` +
  `object-position: top center`, para que la captura LLENE el marco mostrando la UI (recorta el
  excedente, no deja vacío). Bajar la altura del hero para que la tapa entre completa.
- Recomendado para que respire en media página: en vez de la captura cruda, usar el **logo de
  SuperCouncil** (ver FIX 4) o un crop apretado de la UI como hero — algo limpio, no un screenshot
  con aire muerto.
- **Criterio:** a 1280×800 y 1440×900 la tapa entra entera, sin texto tapado, sin zona muerta.

## FIX 2 — Índice (página 2, mitad derecha)

**Problema:** el índice es más alto/ancho que la media página. Las etiquetas de la derecha se
cortan ("PERS", "PERSON", "EN DE…"). Está en 2 columnas y no entra.

**Qué hacer:**
- Pasar el índice a **1 sola columna** (un proyecto por fila, ancho completo de la media página).
  Lee como tabla de contenidos de revista real y deja lugar para la etiqueta completa.
- Fila = `nº pág · nombre · etiqueta(tier)`. **Quitar el subtexto "note"** de cada ítem en el
  índice (repite lo que dice la página del proyecto) → así entran las 8 filas + intro sin scroll.
- Etiqueta tier: que NO se corte — sin ancho fijo que la recorte, `white-space:nowrap` + que el
  contenedor le dé lugar; si hace falta, abreviar a `PÚBLICO / WEB / PERSONAL / WIP`.
- Apretar el padding vertical de filas lo necesario para que las 8 entren en la media página.
- **Criterio:** índice completo visible sin scroll interno, etiquetas enteras, a 1280×800.

## FIX 3 — Foto secundaria tapa texto (páginas 4 y 6, y cualquier product/web con 2ª imagen)

**Problema:** la polaroid secundaria (captura vertical de Telegram) flota sobre la mitad derecha
(texto) y tapa bullets y tags ("Modo Búnker… cer…", tag "LOCALHOST:4…" cortado). Además los tags
largos (`localhost:4000`, `localhost:7778`) desbordan el ancho del panel.

**Qué hacer:**
- **Opción A (recomendada):** mover la 2ª foto a la página de IMAGEN (izquierda), como segunda
  toma chica superpuesta a la hero en una esquina (ahí sobra lugar). La página de texto queda
  limpia: título, hook, body, bullets, tags, CTA — nada flotando encima.
- Si por algún motivo se queda en la página de texto, va en su propio lugar en el flujo (no
  `position:absolute`/float sobre el texto). La causa es exactamente eso: la foto está absoluta/
  flotada con margen negativo sobre el panel. Sacar el overlap.
- Tags: que **envuelvan** (flex-wrap) y entren en el ancho del panel; el tag largo cae a la fila
  de abajo en vez de cortarse.
- **Criterio:** en páginas 4 y 6 ningún texto/bullet/tag queda tapado ni cortado; todo se lee.

## FIX 4 — Logos (solo 2 proyectos los tienen)

**Archivos fuente (existen):**
- Asistente Académico → `D:\PROYECTOS\ASISTENTE ACADEMICO\public\logo.png` (819×819, 402KB)
- SuperCouncil → `D:\SuperCouncil_V2_Dev\src\logo.png` (751×751, 365KB)
- Los otros 6 (Gonza, Vincularmente, Gastos, Niñera, Jardín, Salones) **NO tienen logo** → no
  llevan. No inventar ni generar logos.

**Qué hacer:**
- Copiar esos 2 a `IMG/logos/` (`asistente.png`, `supercouncil.png`) y convertir a WebP (pesan
  mucho para web).
- Aplicarlo **suave** en la página de texto de cada uno: chico (~48–56px), arriba junto al
  kicker/título, como marca discreta (no badge grande, no marca de agua gigante).
- **Guardarraíl de Facu (respetar):** si meter el logo rompe el layout (empuja texto, choca con
  el sello "USAR HOY", desborda) → **omitirlo** sin dejar hueco. Es un plus, no un must.
- **Criterio:** logo sutil en Asistente y SuperCouncil; si rompe algo, se omite limpio.

## FIX 5 — "Colofón" (página 20): qué es y qué hacer

**Qué es:** el colofón es la nota final tradicional de un libro/revista que cuenta **cómo se hizo**
(tipografías, herramientas, lugar y fecha, tirada). Es un elemento editorial real y suma
credibilidad técnica / build-in-public. El problema es solo que la palabra "Colofón" es oscura
para quien no es del palo.

**Qué hacer:**
- Mantener la página (es buena para la marca "psicólogo que construye"), pero **renombrar el
  título visible** a algo claro. Default: **"Cómo se hizo"**. Alternativas: "La trastienda" /
  "La cocina del fanzine". El hook ya dice "Cómo está hecho este fanzine." → queda redundante con
  el título nuevo: ajustar el hook a una línea distinta (ej. "Sin frameworks. Hecho a mano.").
- Es solo cambio de copy en `spreads.json` (campos `title`/`hook` del spread `historia`/colofón).
- Si Facu prefiere, se elimina la página entera (sacar el spread del JSON) — pero recomiendo
  conservarla renombrada.

---

## Orden sugerido para Composer

1. FIX 2 (índice 1 columna) — el más autocontenido, valida rápido.
2. FIX 3 (foto secundaria + tags wrap) — toca product/web/diary layout.
3. FIX 1 (tapa) — el más delicado (media página apretada).
4. FIX 4 (logos) — al final, con el guardarraíl de omitir si rompe.
5. FIX 5 (copy colofón) — trivial, cierre.

**No tocar:** motor de flip, transiciones, `scripts/serve.js`, puerto 8787, ni los layouts que ya
se ven bien (páginas 3, 5, 7-9 según capturas). Verificar cada fix a 1280×800 y 1440×900 en
Chrome **y** Firefox antes de pasar al siguiente.
