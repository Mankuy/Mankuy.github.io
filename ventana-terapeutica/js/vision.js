/* Lo que se ve.

   Klüver (1926) clasificó las alucinaciones geométricas en cuatro familias que
   se repiten en todo el mundo y con casi cualquier sustancia: túneles,
   espirales, panales y telarañas. Bressloff, Cowan y otros (Phil. Trans. R.
   Soc. B, 2001) explicaron por qué son SIEMPRE esas cuatro: la corteza visual
   V1 ve el campo visual en coordenadas casi log-polares, y con los 5-HT2A
   ocupados baja la inhibición y la corteza oscila sola en ondas planas. Una
   onda plana atravesando ese mapa ES una constante de forma.

   De ese mismo mapa salen tres cosas que hacen que esto se parezca a un cierre
   de ojos y no a un fondo de pantalla:

   1. ZOOM INFINITO — en log(r) escalar es SUMAR: restarle tiempo es caer hacia
      adentro para siempre, sin costura.
   2. AUTO-SEMEJANZA — por lo mismo, sumar octavas da patrón adentro del patrón.
   3. CAPAS — si el régimen depende de log(r), cada capa de profundidad tiene
      OTRA geometría y vienen hacia uno. De ahí las cámaras sucesivas y los
      umbrales que se leen como puertas.

   Ojos abiertos es otra cosa: la realidad sigue ahí, lo que cambia es cómo se
   comporta. Hay tres escenarios — una pieza preparada, un bosque, un cerro —
   que se sortean por viaje, porque el setting importa. Encima va la
   deformación, la sinestesia y las presencias.

   Seguridad: nada de destellos. Todo por debajo de 1 Hz, la realimentación
   siempre decae, y con prefers-reduced-motion se frena aún más. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const VERT = [
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = uv;",
    "  gl_Position = vec4(position.xy, 0.0, 1.0);",
    "}",
  ].join("\n");

  const FRAG = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform sampler2D uPrev;",
    "uniform float uT;",
    "uniform float uInt;",
    "uniform float uEnt;",
    "uniform float uPlas;",
    "uniform float uAb;",
    "uniform float uEntes;",
    "uniform float uModo;",
    "uniform float uEscena;",
    "uniform float uSemilla;",
    "uniform vec2 uRes;",

    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",

    "float vnoise(vec2 p) {",
    "  vec2 i = floor(p); vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",

    "float fbm(vec2 p) {",
    "  float v = 0.0; float a = 0.5;",
    "  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }",
    "  return v;",
    "}",

    "vec3 pal(float t) {",
    "  return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t",
    "         + vec3(0.00, 0.33, 0.67)));",
    "}",

    "float panal(vec2 q) {",
    "  return (cos(q.x)",
    "        + cos(dot(q, vec2(0.5, 0.86603)))",
    "        + cos(dot(q, vec2(-0.5, 0.86603)))) / 3.0;",
    "}",

    "float forma(float reg, float u, float v, float k, float t) {",
    "  float tunel   = cos(u * 6.0 * k + t * 0.5);",
    "  float espiral = cos(u * 5.0 * k + v * 4.0 - t * 0.4);",
    "  float pana    = panal(vec2(u, v) * 3.0 * k);",
    "  float telar   = cos(v * 9.0) * cos(u * 3.0 * k + t * 0.3);",
    "  float m = mod(reg, 4.0);",
    "  float w0 = max(0.0, 1.0 - abs(m)) + max(0.0, 1.0 - abs(m - 4.0));",
    "  float w1 = max(0.0, 1.0 - abs(m - 1.0));",
    "  float w2 = max(0.0, 1.0 - abs(m - 2.0));",
    "  float w3 = max(0.0, 1.0 - abs(m - 3.0));",
    "  return tunel * w0 + espiral * w1 + pana * w2 + telar * w3;",
    "}",

    "float campo(vec2 p, float t, float sectores, float octavas, float semilla) {",
    "  float r = max(length(p), 1e-4);",
    "  float th = atan(p.y, p.x);",
    "  if (sectores > 1.5) {",
    "    float paso = 6.28318 / sectores;",
    "    th = abs(mod(th + paso * 0.5, paso) - paso * 0.5);",
    "  }",
    "  float u = log(r) - t * 0.16;",
    "  float v = th;",
    "  float reg = log(r) * 0.75 - t * 0.09 + semilla * 4.0;",
    "  float suma = 0.0;",
    "  float amp = 1.0;",
    "  float k = 1.0;",
    "  for (int i = 0; i < 5; i++) {",
    "    if (float(i) > octavas) break;",
    "    suma += amp * forma(reg + float(i) * 0.6, u, v, k, t);",
    "    k *= 2.0;",
    "    amp *= 0.55;",
    "  }",
    "  return suma;",
    "}",

    "float umbral(vec2 p, float t, float semilla) {",
    "  float r = max(length(p), 1e-4);",
    "  float reg = log(r) * 0.75 - t * 0.09 + semilla * 4.0;",
    "  float f = abs(fract(reg) - 0.5) * 2.0;",
    "  return smoothstep(0.86, 1.0, f);",
    "}",

    "vec3 pieza(vec2 p) {",
    "  float horiz = -0.28;",
    "  vec3 col;",
    "  if (p.y < horiz) {",
    "    float d = max(horiz - p.y, 0.02);",
    "    float persp = 0.28 / d;",
    "    vec2 gg = vec2(p.x * persp * 2.2, persp * 1.6);",
    "    float bal = step(0.06, abs(fract(gg.x) - 0.5) * 2.0)",
    "              * step(0.06, abs(fract(gg.y) - 0.5) * 2.0);",
    "    col = mix(vec3(0.20, 0.16, 0.13), vec3(0.34, 0.27, 0.21), bal);",
    "    col *= 0.45 + 0.55 * smoothstep(0.0, 0.5, d);",
    "  } else {",
    "    col = vec3(0.30, 0.29, 0.28) * (0.80 + 0.30 * (1.0 - p.y));",
    "  }",
    "  vec2 w = p - vec2(0.62, 0.20);",
    "  float dentro = step(abs(w.x), 0.26) * step(abs(w.y), 0.22);",
    "  float marco = step(abs(w.x), 0.31) * step(abs(w.y), 0.27) - dentro;",
    "  float cruz = dentro * (step(abs(w.x), 0.012) + step(abs(w.y), 0.012));",
    "  col = mix(col, vec3(0.88, 0.90, 0.84), dentro * 0.92);",
    "  col = mix(col, vec3(0.13, 0.11, 0.10), clamp(marco + cruz, 0.0, 1.0));",
    "  vec2 m = p - vec2(-0.15, -0.72);",
    "  float colchon = step(abs(m.x), 0.45) * step(abs(m.y), 0.12);",
    "  col = mix(col, vec3(0.42, 0.24, 0.26), colchon * 0.9);",
    "  vec2 q = p - vec2(-0.78, -0.42);",
    "  float tallo = smoothstep(0.028, 0.0, abs(q.x - sin(q.y * 2.4) * 0.05))",
    "              * step(0.0, q.y) * step(q.y, 0.62);",
    "  float hojas = 0.0;",
    "  for (int i = 0; i < 4; i++) {",
    "    float fi = float(i);",
    "    vec2 h = q - vec2(sin(fi * 2.1) * 0.16, 0.14 + fi * 0.14);",
    "    h.x *= 2.6;",
    "    hojas += smoothstep(0.11, 0.0, length(h));",
    "  }",
    "  col = mix(col, vec3(0.16, 0.34, 0.18), clamp(tallo + hojas, 0.0, 1.0) * 0.95);",
    "  return col;",
    "}",

    "vec3 bosque(vec2 p, float t) {",
    "  vec3 col = mix(vec3(0.09, 0.13, 0.08), vec3(0.28, 0.40, 0.22),",
    "                 smoothstep(-0.4, 1.0, p.y));",
    "  if (p.y < -0.30) {",
    "    float d = max(-0.30 - p.y, 0.02);",
    "    col = mix(vec3(0.18, 0.14, 0.09), vec3(0.11, 0.10, 0.07), smoothstep(0.0, 0.6, d));",
    "    col *= 0.75 + 0.5 * fbm(vec2(p.x * 5.0, p.y * 9.0));",
    "  }",
    "  for (int i = 0; i < 7; i++) {",
    "    float fi = float(i);",
    "    float x = -1.6 + fi * 0.48 + sin(fi * 3.7) * 0.16;",
    "    float an = 0.030 + 0.032 * hash(vec2(fi, 4.0));",
    "    float cur = sin(p.y * 0.9 + fi) * 0.035;",
    "    float tr = smoothstep(an, an * 0.55, abs(p.x - x - cur));",
    "    tr *= smoothstep(-0.42, -0.34, p.y);",
    "    float tono = 0.55 + 0.5 * hash(vec2(fi, 9.0));",
    "    col = mix(col, vec3(0.19, 0.14, 0.10) * tono, tr);",
    "  }",
    "  float haz = smoothstep(0.55, 1.0, fbm(vec2(p.x * 1.3 + t * 0.02, p.y * 0.5)));",
    "  col += vec3(0.30, 0.32, 0.16) * haz * 0.35 * smoothstep(-0.2, 0.9, p.y);",
    "  return col;",
    "}",

    "vec3 cerro(vec2 p, float t) {",
    "  vec3 col = mix(vec3(0.52, 0.34, 0.26), vec3(0.13, 0.16, 0.30),",
    "                 smoothstep(-0.3, 1.1, p.y));",
    "  col += vec3(1.00, 0.66, 0.36) * smoothstep(0.22, 0.0, length(p - vec2(0.45, 0.22))) * 0.55;",
    "  for (int i = 0; i < 4; i++) {",
    "    float fi = float(i);",
    "    float h = 0.06 - fi * 0.17 + 0.20 * fbm(vec2(p.x * 1.1 + fi * 7.3, fi * 3.1));",
    "    if (p.y < h) {",
    "      float som = 0.16 - fi * 0.028;",
    "      col = mix(col, vec3(som, som * 1.05 + 0.02, som * 1.15 + 0.04), 0.92);",
    "    }",
    "  }",
    "  if (p.y < -0.52) {",
    "    col *= 0.8 + 0.5 * fbm(vec2(p.x * 12.0, p.y * 30.0));",
    "  }",
    "  return col;",
    "}",

    "vec3 realidad(vec2 p, float t, float cual) {",
    "  if (cual < 0.5) return pieza(p);",
    "  if (cual < 1.5) return bosque(p, t);",
    "  return cerro(p, t);",
    "}",

    "float presencia(vec2 p, vec2 c, float t, float fase) {",
    "  vec2 d = p - c;",
    "  float r = length(d);",
    "  float cuerpo = smoothstep(0.60, 0.05, r);",
    "  vec2 e = vec2(abs(d.x) - 0.15, d.y - 0.07);",
    "  float ojos = smoothstep(0.085, 0.0, length(e));",
    "  float vida = smoothstep(0.05, 0.6, sin(t * 0.21 + fase) * 0.5 + 0.5);",
    "  return (cuerpo * 0.30 + ojos * 0.9) * vida;",
    "}",

    "float presencias(vec2 p, float t, float semilla) {",
    "  float acc = 0.0;",
    "  for (int i = 0; i < 4; i++) {",
    "    float fi = float(i);",
    "    vec2 c = (vec2(hash(vec2(fi * 3.1, semilla)),",
    "                   hash(vec2(fi * 7.7, semilla + 3.0))) - 0.5) * 1.8;",
    "    acc = max(acc, presencia(p, c, t, fi * 2.4 + semilla * 6.0));",
    "  }",
    "  return acc;",
    "}",

    "void main() {",
    "  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.0;",
    "  vec3 col;",
    "  float r2;",

    "  if (uModo > 0.5) {",
    "    vec2 q = p;",
    "    float lat = sin(uT * 0.42) * 0.5 + 0.5;",
    "    q += uAb * 0.15 * vec2(",
    "      fbm(p * 1.5 + vec2(uT * 0.07, 0.0)) - 0.5,",
    "      fbm(p * 1.5 - vec2(0.0, uT * 0.06)) - 0.5);",
    "    q += uAb * 0.05 * vec2(sin(p.y * 3.4 + uT * 0.5), cos(p.x * 3.1 - uT * 0.43));",
    "    q *= 1.0 + 0.04 * uAb * lat;",

    "    col = realidad(q, uT, uEscena);",
    "    float sep = 0.012 * uAb;",
    "    col.r = realidad(q + vec2(sep, 0.0), uT, uEscena).r;",
    "    col.b = realidad(q - vec2(sep, 0.0), uT, uEscena).b;",

    "    float fa = campo(q, uT, 2.0 + floor(uAb * 4.0) * 2.0, 1.0 + uAb * 2.5, uSemilla);",
    "    float bordes = smoothstep(0.30, 0.95, abs(fa));",
    "    vec3 iris = pal(fa * 0.18 + q.y * 0.4 - uT * 0.03);",
    "    col = mix(col, col * 0.55 + iris * 0.70, uAb * 0.62 * bordes);",

    "    float dr = length(q - vec2(-0.2, 0.05));",
    "    for (int i = 0; i < 3; i++) {",
    "      float fase = fract(uT * 0.33 + float(i) * 0.333);",
    "      float anillo = smoothstep(0.10, 0.0, abs(dr - fase * 2.4));",
    "      col += pal(0.35 + fase + uSemilla * 0.2) * anillo * uAb * 0.34 * (1.0 - fase);",
    "    }",

    "    float lum = dot(col, vec3(0.299, 0.587, 0.114));",
    "    col = mix(vec3(lum), col, 1.0 + 1.6 * uAb);",

    "    float pra = presencias(q, uT, uSemilla) * uEntes;",
    "    col = mix(col, col * 0.30 + pal(0.55 + uSemilla * 0.13) * 0.85, pra * 0.8);",
    "    r2 = max(length(p), 1e-4);",

    "  } else {",
    "    p *= 1.0 + 0.07 * uInt * sin(uT * 0.45);",
    "    float sect = 2.0 + floor(uInt * 5.0) * 2.0;",
    "    float oct = 1.0 + uInt * 3.5;",
    "    float w1 = campo(p, uT, 1.0, 1.0, uSemilla);",
    "    float w2 = campo(p + vec2(1.7, -1.1), uT * 0.8, 1.0, 1.0, uSemilla);",
    "    p += 0.22 * uInt * vec2(w1, w2);",
    "    float f = campo(p, uT, sect, oct, uSemilla);",
    "    float d = 0.035 * uInt;",
    "    float fr = campo(p * (1.0 + d), uT, sect, oct, uSemilla);",
    "    float fb = campo(p * (1.0 - d), uT, sect, oct, uSemilla);",
    "    float borde = 0.55 + 0.6 * uEnt;",
    "    vec3 tri = vec3(",
    "      smoothstep(-borde, borde, fr),",
    "      smoothstep(-borde, borde, f),",
    "      smoothstep(-borde, borde, fb));",
    "    r2 = max(length(p), 1e-4);",
    "    float tono = f * 0.16 + log(r2) * 0.1 - uT * 0.035 + uPlas * 0.1;",
    "    col = pal(tono) * tri;",
    "    col *= 0.10 + 0.95 * uInt;",
    "    float pu = umbral(p, uT, uSemilla) * uInt;",
    "    col += pal(0.15 + uSemilla * 0.2) * pu * 0.55;",
    "    float prc = presencias(p, uT, uSemilla) * uEntes;",
    "    col = mix(col, col * 0.25 + pal(0.55 + uSemilla * 0.13) * 0.95, prc * 0.85);",
    "  }",

    "  float vig = 1.0 - smoothstep(0.30, 1.45, r2);",
    "  col *= 0.30 + 0.85 * vig;",

    "  vec2 uvPrev = (vUv - 0.5) * (1.0 - 0.014 * (0.3 + uInt)) + 0.5;",
    "  vec3 prev = texture2D(uPrev, uvPrev).rgb * (0.62 + 0.30 * uInt);",
    "  col = max(col, prev * 0.94);",

    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  const FRAG_COPIA = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform sampler2D uTex;",
    "void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0); }",
  ].join("\n");

  const ESCENAS = ["una pieza preparada", "un bosque", "un cerro al atardecer"];

  let canvas, renderer, camera;
  let escena, malla, escenaCopia, mallaCopia;
  let rtA, rtB;
  let listo = false;
  let activo = false;
  let reloj = 0;
  let lento = false;
  let modo = "cerrados";

  function montar() {
    canvas = document.getElementById("lienzoVision");
    if (!canvas || typeof THREE === "undefined") return;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
      renderer.setClearColor(0x05060b, 1);
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      escena = new THREE.Scene();
      malla = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            uPrev: { value: null },
            uT: { value: 0 },
            uInt: { value: 0 },
            uEnt: { value: 0 },
            uPlas: { value: 0 },
            uAb: { value: 0 },
            uEntes: { value: 0 },
            uModo: { value: 0 },
            uEscena: { value: 0 },
            uSemilla: { value: 0 },
            uRes: { value: new THREE.Vector2(1, 1) },
          },
        })
      );
      escena.add(malla);

      escenaCopia = new THREE.Scene();
      mallaCopia = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG_COPIA,
          uniforms: { uTex: { value: null } },
        })
      );
      escenaCopia.add(mallaCopia);

      const op = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      rtA = new THREE.WebGLRenderTarget(2, 2, op);
      rtB = new THREE.WebGLRenderTarget(2, 2, op);

      lento = !!(g.matchMedia && g.matchMedia("(prefers-reduced-motion: reduce)").matches);
      listo = true;
      nuevoViaje();
    } catch (e) {
      listo = false;
    }
  }

  /* Cada viaje es otro: cambia dónde aparecen las presencias, cómo se acomodan
     las capas del túnel, y en qué lugar estás. */
  function nuevoViaje() {
    if (!malla) return null;
    const sem = Math.random() * 10;
    const esc = Math.floor(Math.random() * ESCENAS.length);
    malla.material.uniforms.uSemilla.value = sem;
    malla.material.uniforms.uEscena.value = esc;
    return { semilla: sem, escena: esc, nombre: ESCENAS[esc] };
  }

  function medir() {
    if (!canvas || !renderer) return;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(1.5, g.devicePixelRatio || 1);
    const bw = Math.floor(w * dpr);
    const bh = Math.floor(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      rtA.setSize(bw, bh);
      rtB.setSize(bw, bh);
    }
    malla.material.uniforms.uRes.value.set(w, h);
  }

  function pintar(dt) {
    if (!listo || !activo || !V.fisio) return;
    const s = V.fisio.snapshot(V.estado.t);
    const inten = V.fisio.fIntensidad ? V.fisio.fIntensidad(V.estado.t) : s.entropia;
    const paso = typeof dt === "number" && dt > 0 ? Math.min(0.05, dt) : 0.016;
    reloj += paso * (0.3 + inten * 0.8) * (lento ? 0.25 : 1);
    medir();

    const un = malla.material.uniforms;
    un.uT.value = reloj;
    un.uInt.value = inten;
    un.uEnt.value = s.entropia;
    un.uPlas.value = s.plasticidad;
    un.uAb.value = V.fisio.fAbiertos ? V.fisio.fAbiertos(V.estado.t) : 0;
    un.uEntes.value = V.fisio.fEntes ? V.fisio.fEntes(V.estado.t) : 0;
    un.uModo.value = modo === "abiertos" ? 1 : 0;
    un.uPrev.value = rtA.texture;

    try {
      renderer.setRenderTarget(rtB);
      renderer.render(escena, camera);
      renderer.setRenderTarget(null);
      mallaCopia.material.uniforms.uTex.value = rtB.texture;
      renderer.render(escenaCopia, camera);
      const tmp = rtA;
      rtA = rtB;
      rtB = tmp;
    } catch (e) {
      // Un throw acá mataría el rAF de estado.js: se contiene.
      listo = false;
      console.warn("[vision] se cayó el render, apago la vista:", e);
    }
  }

  function activar(si, cual) {
    if (cual) modo = cual;
    activo = !!si && listo;
    const mapa = document.getElementById("mapa");
    if (mapa) mapa.classList.toggle("viendo", activo);
    if (activo) {
      medir();
      pintar(0.016);
    }
    return activo;
  }

  V.vision = {
    montar: montar,
    pintar: pintar,
    activar: activar,
    nuevoViaje: nuevoViaje,
    activo: function () { return activo; },
    modo: function () { return modo; },
    disponible: function () { return listo; },
    escenas: ESCENAS,
    escenaActual: function () {
      return malla ? ESCENAS[malla.material.uniforms.uEscena.value] : "";
    },
    semilla: function () {
      return malla ? malla.material.uniforms.uSemilla.value : 0;
    },
  };
})(window);
