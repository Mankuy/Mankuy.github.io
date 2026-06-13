# Plan de correcciones #3 — Tapa tipográfica (página 1)

> Para Composer. Los planes #1 y #2 ya están ejecutados y OK. Esto es UN solo cambio: la tapa.
> No tocar el resto (motor de flip, transiciones, otras páginas, serve.js, puerto 8787).
> Verificar a 1280×800 y 1440×900 en Chrome y Firefox.
>
> Recordatorio: la tapa vive en la MITAD IZQUIERDA del primer spread (comparte con el índice a la
> derecha). `showCover:false` se queda así. Es una media página alta y angosta.

---

## Qué se saca

- **Fuera la imagen hero de SuperCouncil** de la tapa (el screenshot grande con zona muerta).
- **Fuera el collage de 8 polaroids** de la tapa (eran ilegibles). En `spreads.json`, el spread
  `cover` ya no usa `coverHero` ni `coverCollage` para renderizar (se pueden dejar los campos en
  el JSON sin usar, o quitarlos — pero el render de la tapa NO los muestra).

## Qué se pone: tapa 100% tipográfica con copete

La tapa pasa a ser texto puro, jerarquía de revista. Orden vertical en la media página:

1. **Riel superior** (se queda): `FANZINE · FACUNDO GALETTA` (izq) + sello `GRATIS · Nº1 · MVD · 2026` (der).
2. **Masthead** (se queda): `CONSTRUÍ ESTO` — grande, Fraunces Black, dominante.
3. **Gancho** (1 línea, NUEVO/repurpose del `hook`): Fraunces itálica, con filete rojo a la izquierda.
4. **Copete** (NUEVO — campo `lead` en el JSON del spread cover): párrafo de ~3-4 líneas, cuerpo
   1rem/1.5, el enganche que hace que el lector se quede.
5. **Coverlines como teasers** (upgrade de las actuales): 3 líneas tipo blurb de tapa, cada una
   con su número de página (ver copy abajo). Esto es lo que invita a pasar de página.
6. **Autor** (se queda): `Psicólogo · constructor · Montevideo, Uruguay`.
7. **CTA** (se queda): `Pasá la página →`.
8. **Barcode** lateral (se queda).

**Reglas de layout:**
- Todo entra en la media página a 1280×800 y 1440×900, **sin scroll y sin overlap** (este era el
  bug viejo: el hero tapaba el subtítulo; ahora sin imagen sobra lugar, pero igual cuidar que el
  masthead + copete + teasers no desborden — si aprieta, achicar el masthead con clamp).
- Mantener textura de papel, cinta adhesiva y el resto del sistema visual ya hecho.
- Sin imagen, la tapa puede sentirse vacía: que el masthead sea bien grande y los teasers ocupen
  el aire. Jerarquía clara: manda el título, después el copete, después los teasers.

---

## COPY — copete

> ✅ ELEGIDA POR FACU: **OPCIÓN A**. Usar esta. B y C quedan abajo solo como referencia
> histórica — NO implementarlas.

### ✅ OPCIÓN A (ELEGIDA — ángulo "psicólogo que programa")
- **Gancho:** `Un psicólogo que programa. Mirá lo que le sale.`
- **Copete:** `Ocho herramientas, cada una nacida de un problema que tuve en serio: corregir mi
  tesis, pagarle a la niñera, registrar la huerta, hacer que una IA deje de darme la razón.
  Ninguna vive en la nube. Todas corren en tu máquina.`

### OPCIÓN B (ángulo "historia personal")
- **Gancho:** `Estudié la mente, no el código. Igual hice esto.`
- **Copete:** `Tesis con corrector propio. Una IA obligada a discutir consigo misma. El sueldo de
  la niñera que se calcula solo. Cada una empezó como un problema mío y terminó siendo una
  herramienta. Acá están las ocho.`

### OPCIÓN C (ángulo "directo / manifiesto")
- **Gancho:** `Problemas de verdad. Herramientas que funcionan.`
- **Copete:** `Soy psicólogo en Montevideo y construyo software para lo que me molesta: la
  burocracia de una tesis, las cuentas de casa, las IA que mienten para caer bien. Ocho
  proyectos, todos local-first. El recorrido empieza en la página de al lado.`

> Nota: el `hook` actual ("Herramientas para problemas que tengo de verdad") se reemplaza por el
> gancho elegido. El campo `body` actual ("Psicólogo · constructor · Montevideo") pasa a ser la
> línea de autor del punto 6 (ya está).

## COPY — coverlines como teasers (reemplazan las actuales)

Tres blurbs con número de página (engancha mostrando lo más jugoso):

- `El corrector de tesis que te explica cada error — p.03`
- `Una IA que no te da la razón (a propósito) — p.05`
- `El sueldo de la niñera, calculado solo — p.13`

(Si se quieren 4, sumar: `Una tienda de vinilos que reconoce discos por foto — p.09`.)

---

## Criterio de aceptación

- La tapa no muestra ninguna imagen; es tipográfica.
- Se lee, de arriba a abajo: riel → CONSTRUÍ ESTO → gancho → copete → 3 teasers con página →
  autor → CTA, todo dentro de la media página, sin scroll ni texto tapado, a 1280×800 y 1440×900,
  en Chrome y Firefox.
- El índice de la derecha (ya arreglado en plan #2) sigue intacto.
