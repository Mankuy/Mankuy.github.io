# Plan de correcciones #5 — Tapa página 0 (portada real) + título colofón

> Para Composer. Planes #1–#4 ejecutados. Dos cambios: (1) agregar una TAPA real como página 0,
> (2) un cambio de copy en el colofón. No tocar transiciones ni el resto de páginas. Verificar a
> 1280×800 y 1440×900 en Chrome y Firefox.

---

## FIX A — Colofón (última página): título

- En `spreads.json`, el spread del colofón: cambiar `title` de **"Cómo se hizo"** a
  **"Cómo se hizo este fanzine"**. El hook de esa página queda como está.

---

## FIX B — Agregar TAPA como página 0 (portada de revista cerrada)

### El concepto
Hoy no hay portada standalone: "CONSTRUÍ ESTO" comparte spread con el índice. Falta la **tapa**
(la que ves con la revista cerrada). Se agrega una página 0 nueva, sola, con la marca Facundo
Galetta. Al abrir, el primer spread interior sigue siendo "CONSTRUÍ ESTO" (izq) + índice (der),
intactos. Es el orden real de una revista: tapa de marca afuera → título del número adentro.

### El mecanismo (CLAVE — así NO se rompe el apareo)
Hoy StPageFlip usa `showCover: false` y los pares son (0,1)(2,3)(4,5)…:
`(cover|intro)(asistente-img|txt)(sc-img|txt)…(historia|colofón)` y la contratapa sola al final.

**Cambio:** agregar el spread `tapa` como PRIMERO en `spreads.json` **y** poner `showCover: true`.
Con showCover:true, la página 0 queda sola (portada), la última queda sola (contratapa), y el
medio aparea (1,2)(3,4)(5,6)… → que mapea EXACTO a los pares actuales corridos un lugar:
- `0` = tapa (sola) ✓
- `(1,2)` = cover | intro ✓
- `(3,4)` = asistente-img | txt ✓
- `(5,6)` = sc-img | txt ✓ … (todos los proyectos igual)
- `(penúltima par)` = historia | colofón ✓
- `última` = contratapa (sola) ✓

**Todos los pares imagen|texto quedan idénticos.** El único cambio estructural es +1 página al
frente y showCover:true.

### Qué tiene que hacer Composer
1. Agregar el spread `tapa` como primer elemento de `spreads.json` (page 0), layout nuevo
   `"front-cover"`.
2. Crear el renderer `front-cover` en `zine.js` (RENDERERS) — página completa standalone,
   sin tocar los renderers existentes.
3. Cambiar `showCover: false` → `showCover: true` en la config de StPageFlip.
4. Re-numerar folios si hace falta (ahora son 22 páginas; los "— NN / 22 —" deben reflejarlo;
   si el total se calcula solo desde el length, no hay nada que tocar).
5. Verificar deep-link por hash y el botón "Pasá la página" del cover-cta siguen andando.

### Guardarraíl de Facu ("no rompamos nada")
- Si `showCover: true` desalinea CUALQUIER par imagen|texto, descoloca la contratapa, o rompe el
  deep-link por hash → **revertir todo el FIX B** (quitar el spread `tapa` y volver a
  `showCover: false`). La tapa es deseable pero NO a costa de romper lo que ya funciona.
- Probar específicamente: páginas 3-4 (Asistente img|txt), 5-6 (SuperCouncil img|txt) y la
  contratapa final, en Chrome y Firefox, antes de dar por bueno.

### Diseño de la tapa (página 0)
Tapa tipográfica, marca-forward (es la cara de Facundo Galetta, no del número). Composición en
toda la altura, 3 zonas (igual criterio que la portada interior):
- **Arriba:** kicker `FANZINE Nº1 · CONSTRUÍ ESTO` (mono) + eyebrow con la promesa.
- **Centro (foco):** el NOMBRE como masthead gigante `FACUNDO GALETTA` (Fraunces Black) + el
  gancho debajo (itálica, filete rojo).
- **Abajo:** `Montevideo · 2026` + CTA `Pasá la página →`.
- Mantener textura de papel / sistema visual ya hecho. Diferenciar del page-1: acá manda el
  NOMBRE; en page-1 manda el título del número (CONSTRUÍ ESTO). Así no se sienten repetidas.

### Copy de la tapa
- Kicker: `FANZINE Nº1 · CONSTRUÍ ESTO`
- Eyebrow / promesa: `Para cada problema, una solución a tu medida.`
- Masthead (nombre, gigante): `FACUNDO GALETTA`
- **Gancho** (elegí uno; default = A):
  - ✅ **A (recomendado, pulido):** `El psicólogo que audita tu mente — y te construye la salida.`
  - B (tu frase literal, simple y fuerte): `El psicólogo que audita tu mente.`
  - C (los dos oficios, cálido): `Psicólogo de oficio. Constructor por necesidad.`
- Pie: `Montevideo · 2026`  ·  CTA `Pasá la página →`

> Por qué la A: "audita tu mente" trae tu lado clínico + el guiño a SuperCouncil (audita tu
> pensamiento); "te construye la salida" suma tu lado constructor y juega doble sentido
> (salida = solución / salida = camino de salida en terapia). Cierra tu esencia en una línea.

---

## Criterio de aceptación

- Página 0 = tapa standalone con FACUNDO GALETTA + promesa + gancho + CTA, sola (no apareada).
- TODOS los pares imagen|texto de los proyectos quedan idénticos a antes; contratapa sola al final.
- Deep-link por hash y "Pasá la página" funcionan.
- Colofón dice "Cómo se hizo este fanzine".
- Si algo del FIX B se rompe y no se arregla rápido → se revierte el FIX B entero (el FIX A queda).
- Todo a 1280×800 y 1440×900, Chrome y Firefox.
