# Plan de correcciones #4 — Tapa que enganche (pág 1) + título índice (pág 2)

> Para Composer. Planes #1, #2, #3 ya ejecutados. Esto son ajustes finos sobre la tapa
> tipográfica + un cambio de una palabra en la pág 2. No tocar motor de flip, transiciones,
> ni el resto de las páginas. Verificar a 1280×800 y 1440×900 en Chrome y Firefox.
>
> La tapa vive en la MITAD IZQUIERDA del primer spread (media página alta y angosta).

---

## DIAGNÓSTICO (por qué la tapa todavía no engancha)

1. **Texto amontonado arriba + vacío abajo:** masthead, gancho, copete y teasers quedan apretados
   en el tercio superior; entre los teasers y la firma hay un hueco muerto grande. La página no
   está compuesta, se ve incompleta.
2. **Falso índice:** los 3 teasers con "— P.03 / P.05 / P.13" se leen como un índice, y el índice
   real está al lado (pág 2). Son dos índices seguidos = redundante y raro.
3. **El anzuelo está enterrado:** el gancho ("Un psicólogo que programa. Mirá lo que le sale.")
   es la línea que engancha, pero está en cuerpo chico, mismo peso que el copete. No manda.
4. **Cabezal sucio:** el barcode "FG·001·2026" se monta sobre el sello "GRATIS · Nº1 · MVD · 2026".

---

## FIX A — Sacar el falso índice

- **Eliminar de la tapa los 3 teasers con número de página** ("El corrector de tesis… — P.03",
  etc.). Esos `coverLines`/teasers se quitan del render de la tapa (el índice real es la pág 2).

## FIX B — Componer la tapa en TODA la altura (que el texto baje)

- La tapa pasa a distribuirse en **3 zonas verticales que llenan la media página** (flex column,
  `justify-content: space-between`, `min-height: 100%`), sin amontonar arriba ni dejar vacío abajo:
  - **ZONA SUPERIOR (pegada arriba):** riel (`FANZINE · FACUNDO GALETTA` + sello) y nada más.
  - **ZONA CENTRO (centrada ópticamente, ~mitad de la página):** masthead `CONSTRUÍ ESTO` →
    gancho (destacado, ver FIX C) → copete. Este bloque es el corazón y va en el centro vertical,
    no pegado al riel. (Esto cumple el pedido de Facu: "que el texto vaya más abajo en la página".)
  - **ZONA INFERIOR (pinada abajo, `margin-top:auto`):** firma `Psicólogo · constructor ·
    Montevideo, Uruguay` → CTA `Pasá la página →`.
- Resultado: la tapa respira de arriba a abajo, el ojo aterriza en el centro, sin hueco muerto.

## FIX C — Subir el anzuelo (el gancho manda)

- **Agrandar el gancho** "Un psicólogo que programa. Mirá lo que le sale." → es la línea que
  engancha. Que tenga jerarquía: Fraunces itálica, cuerpo claramente mayor que el copete
  (ej. ~1.4–1.6rem), con el filete rojo a la izquierda. Hoy pasa desapercibido; tiene que ser
  lo segundo que se lee después del título.
- Copete: queda igual de texto, cuerpo normal (1rem/1.5), debajo del gancho.
- **CTA más presente:** `Pasá la página →` un poco más grande y con su pulso, para que invite
  (es la acción que queremos). No gigante, pero que se note como botón.

## FIX D — Limpiar el cabezal

- Resolver el choque barcode/sello: mover el barcode `FG·001·2026` al lateral (vertical, como
  lomo) o abajo, para que NO se monte sobre el sello `GRATIS · Nº1 · MVD · 2026`. Que el riel
  superior quede limpio: kicker a la izquierda, sello a la derecha, sin solaparse.

## FIX E — Pág 2: acortar el título

- En `spreads.json`, el spread del índice (`intro`): cambiar `title` de **"De qué va esto"** a
  **"De qué va"**. Nada más de esa página (el resto está bien).

---

## Copy final de la tapa (referencia, ya aprobado — solo se reordena/redimensiona)

- Riel: `FANZINE · FACUNDO GALETTA`  ·  sello `GRATIS · Nº1 · MVD · 2026`
- Masthead: `CONSTRUÍ ESTO`
- Gancho (AGRANDADO): `Un psicólogo que programa. Mirá lo que le sale.`
- Copete: `Ocho herramientas, cada una nacida de un problema que tuve en serio: corregir mi
  tesis, pagarle a la niñera, registrar la huerta, hacer que una IA deje de darme la razón.
  Ninguna vive en la nube. Todas corren en tu máquina.`
- Firma: `Psicólogo · constructor · Montevideo, Uruguay`
- CTA: `Pasá la página →`

> No se agrega texto nuevo: se SACAN los teasers, se AGRANDA el gancho, y se REDISTRIBUYE en la
> altura. El enganche sale de la jerarquía (gancho grande) + composición (centro de la página) +
> CTA visible, no de meter más palabras.

---

## Criterio de aceptación

- La tapa no tiene los teasers con P.03/P.05/P.13.
- El contenido llena la media página de arriba a abajo: riel arriba, bloque título+gancho+copete
  centrado verticalmente, firma+CTA abajo. Sin amontonar arriba, sin hueco muerto, sin scroll.
- El gancho se lee grande, segundo después del título.
- Barcode y sello no se solapan.
- Pág 2 dice "De qué va".
- Todo a 1280×800 y 1440×900, Chrome y Firefox.
