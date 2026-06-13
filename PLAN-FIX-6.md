# Plan de correcciones #6 — Prolijar la tapa (página 0)

> Para Composer. La tapa página 0 quedó bien, faltan 3 ajustes de espaciado/medida para que
> quede prolija. SOLO la página 0 (`front-cover`). No tocar nada más. Verificar a 1280×800 y
> 1440×900 en Chrome y Firefox.

---

## FIX 1 — Gancho horizontal (el problema principal)

**Qué pasa:** el gancho "El psicólogo que audita tu mente — y te construye la salida." está
cayendo **una palabra por línea** (columna vertical altísima). Es porque su contenedor tiene una
medida (max-width) muy angosta.

**Qué hacer:**
- Ensanchar la medida del gancho para que lea **horizontal, en 2 líneas** (no una palabra por
  renglón). Quitar/subir el `max-width` que lo encajona; que use el ancho del bloque de contenido
  (al menos tan ancho como el masthead `FACUNDO GALETTA`, ~340–380px o lo que ocupe el nombre).
- Objetivo visual (aprox):
  ```
  El psicólogo que audita tu mente —
  y te construye la salida.
  ```
  Medida cómoda ~30–40 caracteres por línea. Nunca una palabra por línea.
- Mantener: itálica Fraunces + filete rojo a la izquierda.

## FIX 2 — Aire alrededor de FACUNDO GALETTA

**Qué pasa:** el nombre queda apretado contra el copete de arriba y el gancho de abajo.

**Qué hacer:**
- Más espacio **arriba** (separación del eyebrow "PARA CADA PROBLEMA…") y **abajo** (separación
  del gancho): subir el `margin` vertical del masthead.
- Si las dos líneas FACUNDO / GALETTA están muy pegadas entre sí, aflojar apenas el `line-height`
  del masthead (sin pasarse — que sigan leyéndose como un bloque).

## FIX 3 — Redistribuir para que quede prolija

**Qué pasa:** al achicar el gancho (FIX 1) sobra más espacio vertical; hay que repartirlo bien
para que no quede un hueco grande.

**Qué hacer:**
- Mantener la composición en 3 zonas que llenan la altura (ya está): eyebrow+nombre+gancho como
  bloque central con buen aire entre cada elemento; firma + CTA pinados abajo.
- Que el bloque central (eyebrow → nombre → gancho) respire con espaciado parejo entre sus partes
  y quede ópticamente centrado en la altura de la página, sin amontonar ni dejar un vacío notorio.
- Si el contenido se ve corrido a la izquierda con mucho aire muerto a la derecha, ensanchar la
  medida del bloque de texto para que el nombre y el gancho usen mejor el ancho de la página
  (tapa más balanceada). No centrar el texto: sigue alineado a la izquierda, pero con más ancho.

---

## Criterio de aceptación

- El gancho lee horizontal en ~2 líneas; cero "una palabra por línea".
- FACUNDO GALETTA tiene aire arriba y abajo, no se ve apretado.
- La tapa se ve balanceada y prolija: bloque central aireado y centrado en la altura, firma+CTA
  abajo, sin hueco muerto grande ni texto amontonado.
- No se rompió nada del resto (pares imagen|texto, contratapa, deep-link) — la tapa standalone
  sigue igual de estructura.
- Todo a 1280×800 y 1440×900, Chrome y Firefox.
