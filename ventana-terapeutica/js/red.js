/* El mapa: un cerebro en vista lateral con las cinco redes en su lugar real.
   Three si cargó; si no, canvas 2D con el mismo dibujo.
   Las etiquetas son HTML posicionado por proyección: lo que ves es lo que clickeás. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const REDES = [
    { id: "dmn", nombre: "DMN", color: "#f5c14c" },
    { id: "ejec", nombre: "Ejecutiva", color: "#5ee0c8" },
    { id: "sal", nombre: "Saliencia", color: "#ff5c8a" },
    { id: "vis", nombre: "Visual", color: "#8b6cff" },
    { id: "lim", nombre: "Límbica", color: "#ff8a4c" },
  ];

  /* Pares entre redes (índices de REDES). */
  const ENTRE = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [2, 4], [3, 4], [1, 3],
  ];

  const NODOS_POR_HUB = 5;
  const PARTES_POR_HUB = 4;
  const MAX_SEL = 20;

  let canvas, ctx, capaEtiquetas;
  let nodos = [];
  let partes = [];
  let polvo = [];
  let etiquetas = [];
  let listo = false;
  let threeOk = false;
  let renderer, scene, camera;
  let meshNodos = [];
  let lineEntre, linePuente, linePlast, lineSel, lineRed;
  let ptsObj, polvoObj;
  let vecProy = null;
  let tAnim = 0;
  let pantalla = [];
  let pantallaHubs = [];
  let dim = { w: 1, h: 1 };
  let trazos = null;
  let esquema = null;
  let mallaOk = false;
  let zoom = 1;
  let avisado = false;
  let desplaz = {};
  let hilos = null;

  function A() {
    return V.anatomia;
  }

  function hubs(ri) {
    const h = A() && A().HUBS[REDES[ri].id];
    return h || [{ x: 0, y: 0 }];
  }

  function seed(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function hexRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgba(hex, a) {
    const c = hexRgb(hex);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function snap() {
    return V.fisio
      ? V.fisio.snapshot(V.estado.t)
      : { psilo: 0, entropia: 0, plasticidad: 0, priors: 1 };
  }

  function sel() {
    return (V.estado && V.estado.sel) || [];
  }

  function activa(id) {
    const s = sel();
    return s.length === 0 || s.indexOf(id) !== -1;
  }

  function marcada(id) {
    return sel().indexOf(id) !== -1;
  }

  /* ── Datos ───────────────────────────────────────────────── */

  function armarDatos() {
    nodos = [];
    partes = [];
    polvo = [];

    REDES.forEach(function (r, ri) {
      hubs(ri).forEach(function (h, hi) {
        for (let i = 0; i < NODOS_POR_HUB; i++) {
          const k = ri * 40 + hi * 13 + i;
          const a = (i / NODOS_POR_HUB) * Math.PI * 2 + ri * 0.6 + hi;
          const rad = 0.055 + seed(k) * 0.045;
          nodos.push({
            ri: ri,
            hi: hi,
            red: r.id,
            ox: h.x + Math.cos(a) * rad,
            oy: h.y + Math.sin(a) * rad * 0.82,
            oz: (h.z || 0) + (seed(k + 11) - 0.5) * 0.08,
            fase: seed(k + 7) * Math.PI * 2,
            color: r.color,
          });
        }
        for (let p = 0; p < PARTES_POR_HUB; p++) {
          const k = ri * 60 + hi * 17 + p;
          partes.push({
            ri: ri,
            hi: hi,
            red: r.id,
            r: 0.075 + seed(k) * 0.055,
            w: 0.5 + seed(k + 3) * 1.1,
            fase: seed(k + 5) * Math.PI * 2,
            color: r.color,
          });
        }
      });
    });

    // Textura cortical: puntos sembrados adentro del contorno, nunca afuera.
    if (A()) {
      let intentos = 0;
      while (polvo.length < 150 && intentos < 4000) {
        const x = seed(intentos * 2.1) * 2 - 1;
        const y = seed(intentos * 2.1 + 1) * 1.9 - 0.95;
        intentos++;
        if (!A().dentro(x, y)) continue;
        polvo.push({ x: x, y: y, s: 0.5 + seed(intentos + 90) * 1.2, fase: seed(intentos + 40) * 6 });
      }
    }
  }

  function armarTrazos() {
    const a = A();
    if (!a) return;
    trazos = {
      cerebro: a.suavizar(a.CEREBRO, 14, true),
      temporal: a.suavizar(a.TEMPORAL, 14, true),
      cerebelo: a.suavizar(a.CEREBELO, 12, true),
      tronco: a.suavizar(a.TRONCO, 10, true),
      surcos: a.SURCOS.map(function (s) {
        return { peso: s.peso, pts: a.suavizar(s.pts, 12, false) };
      }),
      folios: a.FOLIOS.map(function (f) {
        return a.suavizar(f, 8, false);
      }),
    };
  }

  /* ── Leyenda ─────────────────────────────────────────────── */

  function syncLeyenda() {
    const ul = document.getElementById("leyendaRed");
    if (!ul) return;
    const s = sel();
    const botones = ul.querySelectorAll("button[data-id]");
    for (let i = 0; i < botones.length; i++) {
      const on = s.indexOf(botones[i].dataset.id) !== -1;
      botones[i].classList.toggle("on", on);
      botones[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    const todas = ul.querySelector('[data-act="todas"]');
    if (todas) todas.classList.toggle("on", s.length === REDES.length);
    const nada = ul.querySelector('[data-act="nada"]');
    if (nada) nada.hidden = s.length === 0;
  }

  function leyenda() {
    const ul = document.getElementById("leyendaRed");
    if (!ul) return;
    ul.innerHTML = "";
    REDES.forEach(function (r) {
      const info = V.redes && V.redes.de(r.id);
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = r.id;
      b.style.setProperty("--c", r.color);
      b.innerHTML =
        '<i style="background:' + r.color + '"></i>' +
        '<span class="lg-n">' + r.nombre + "</span>" +
        '<span class="lg-a">' + (info ? info.apodo : "") + "</span>";
      b.addEventListener("click", function () {
        if (V.alternarRed) V.alternarRed(r.id);
      });
      li.appendChild(b);
      ul.appendChild(li);
    });

    const liT = document.createElement("li");
    const bT = document.createElement("button");
    bT.type = "button";
    bT.className = "lg-todas";
    bT.dataset.act = "todas";
    bT.textContent = "todas juntas";
    bT.addEventListener("click", function () {
      const completo = sel().length === REDES.length;
      if (V.elegirRedes) {
        V.elegirRedes(completo ? [] : REDES.map(function (r) { return r.id; }));
      }
    });
    liT.appendChild(bT);
    ul.appendChild(liT);

    const liN = document.createElement("li");
    const bN = document.createElement("button");
    bN.type = "button";
    bN.className = "lg-nada";
    bN.dataset.act = "nada";
    bN.textContent = "limpiar";
    bN.hidden = true;
    bN.addEventListener("click", function () {
      if (V.limpiar) V.limpiar();
    });
    liN.appendChild(bN);
    ul.appendChild(liN);

    syncLeyenda();
  }

  /* ── Etiquetas / globos ──────────────────────────────────── */

  /* Arrastre: si un globo tapa algo, se corre y listo. Al moverlo aparece un
     hilo hasta su nodo, para no perder de vista de quién habla. */
  function engancharArrastre(el, id, e) {
    let arrastrando = false;
    let movio = false;
    let x0 = 0;
    let y0 = 0;
    let base = null;

    el.addEventListener("pointerdown", function (ev) {
      if (!el.classList.contains("globo") || ev.button !== 0) return;
      arrastrando = true;
      movio = false;
      x0 = ev.clientX;
      y0 = ev.clientY;
      base = desplaz[id] ? { dx: desplaz[id].dx, dy: desplaz[id].dy } : { dx: 0, dy: 0 };
      el.setPointerCapture(ev.pointerId);
      el.classList.add("agarrada");
    });

    el.addEventListener("pointermove", function (ev) {
      if (!arrastrando) return;
      const z = zoom || 1;
      const dx = (ev.clientX - x0) / z;
      const dy = (ev.clientY - y0) / z;
      if (!movio && Math.abs(dx) + Math.abs(dy) > 4) movio = true;
      if (!movio) return;
      desplaz[id] = { dx: base.dx + dx, dy: base.dy + dy };
      pintarEtiquetas();
    });

    function soltar(ev) {
      if (!arrastrando) return;
      arrastrando = false;
      el.classList.remove("agarrada");
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch (err) {}
      // Si hubo arrastre, el click que sigue no debe cerrar el globo.
      if (movio) e.tragarClick = true;
    }

    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
  }

  function montarEtiquetas() {
    capaEtiquetas = document.getElementById("etiquetasRed");
    if (!capaEtiquetas) return;
    capaEtiquetas.innerHTML = "";
    desplaz = {};

    hilos = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    hilos.setAttribute("class", "hilos");
    capaEtiquetas.appendChild(hilos);

    etiquetas = REDES.map(function (r) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "et";
      b.dataset.id = r.id;
      b.style.setProperty("--c", r.color);
      const e = { el: b, w: 0, h: 0, sig: "", tragarClick: false, hilo: null };
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (e.tragarClick) {
          e.tragarClick = false;
          return;
        }
        if (V.alternarRed) V.alternarRed(r.id);
      });
      engancharArrastre(b, r.id, e);
      capaEtiquetas.appendChild(b);

      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("stroke", r.color);
      l.setAttribute("stroke-width", "1.4");
      l.setAttribute("stroke-dasharray", "3 4");
      l.setAttribute("opacity", "0");
      hilos.appendChild(l);
      e.hilo = l;

      return e;
    });
    refrescarEtiquetas();
  }

  /* Cerrada es un chip; abierta cuenta qué le pasa a esa red en este minuto.
     Lo de fondo vive en el panel lateral, así no se repite.
     Con tres o más redes el globo taparía el mapa: queda en chip. */
  function refrescarEtiquetas() {
    if (!etiquetas.length || !V.redes) return;
    const fase = V.fases ? V.fases.en(V.estado.t) : null;
    const fid = fase ? fase.id : "base";
    const globos = sel().length <= 2;
    for (let i = 0; i < REDES.length; i++) {
      const r = REDES[i];
      const abierta = marcada(r.id);
      const globo = abierta && globos;
      const sig = fid + "|" + (abierta ? "1" : "0") + "|" + (globo ? "g" : "c");
      const e = etiquetas[i];
      if (e.sig === sig) continue;
      e.sig = sig;
      const info = V.redes.ficha(r.id, fid);
      if (!info) continue;
      let html =
        '<span class="et-n">' + esc(r.nombre) + "</span>" +
        '<span class="et-a">' + esc(info.apodo) + "</span>";
      if (!abierta && desplaz[r.id]) delete desplaz[r.id];
      if (globo) {
        const donde = hubs(i)
          .map(function (h) { return h.nombre; })
          .filter(Boolean)
          .join(" · ");
        if (donde) html += '<span class="et-donde">' + esc(donde) + "</span>";
        html += '<span class="et-ahora">' + esc(info.ahora) + "</span>";
      }
      e.el.innerHTML = html;
      e.el.classList.toggle("on", abierta);
      e.el.classList.toggle("globo", globo);
      e.w = 0;
    }
  }

  function pintarEtiquetas() {
    if (!etiquetas.length) return;
    const anchoMapa = dim.w || 1;
    const altoMapa = dim.h || 1;
    const cajas = [];

    for (let i = 0; i < etiquetas.length; i++) {
      const p = pantalla[i];
      const e = etiquetas[i];
      if (!p) continue;
      if (!e.w) {
        // offsetWidth y no rect: rect trae el zoom de página encima y además
        // la escala de la animación de entrada.
        const ew = e.el.offsetWidth;
        const eh = e.el.offsetHeight;
        // Con la vista en "ojos" esta capa está en display:none y offsetWidth
        // da 0. Cachear ese 0 dejaba cajas de tamaño nulo, y al volver al
        // cerebro las etiquetas se pisaban todas. Si no se pudo medir, se
        // reintenta el cuadro que viene.
        if (ew > 0 && eh > 0) {
          e.w = ew;
          e.h = eh;
        }
      }
      if (!e.w) continue;
      const d = desplaz[REDES[i].id];
      const medio = e.w / 2;
      const arriba = p.y - 16 - e.h > 4;
      let x = Math.max(medio + 6, Math.min(anchoMapa - medio - 6, p.x));
      let y = arriba ? p.y - 16 : Math.min(altoMapa - 6, p.y + 16 + e.h);
      if (d) {
        x = Math.max(medio + 4, Math.min(anchoMapa - medio - 4, x + d.dx));
        y = Math.max(e.h + 4, Math.min(altoMapa - 4, y + d.dy));
      }
      cajas.push({
        e: e,
        i: i,
        abierta: marcada(REDES[i].id),
        movida: !!d,
        nodo: p,
        x: x,
        y: y,
        arriba: arriba,
      });
    }

    // Separación vertical. Aplica a TODAS las etiquetas, no solo a los globos:
    // en el cerebro real la DMN y la ejecutiva comparten el frontal y sus chips
    // se pisan. No pelea con lo que el usuario movió a mano.
    const libres = cajas.filter(function (c) { return !c.movida; })
      .sort(function (a, b) { return a.y - b.y; });

    function chocan(p, q) {
      return Math.abs(p.x - q.x) < (p.e.w + q.e.w) / 2 + 8 &&
        p.y > q.y - q.e.h && q.y > p.y - p.e.h;
    }

    // Se alternan las dos correcciones varias veces: correr una etiqueta
    // destapa choques nuevos, y resolver en un solo eje no alcanza.
    // Vertical primero (menos invasivo); si no entra, el mapa es ancho y bajo,
    // así que de costado sobra lugar.
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      let quedan = false;

      for (let a = 0; a < libres.length; a++) {
        for (let b = a + 1; b < libres.length; b++) {
          const p = libres[a];
          const q = libres[b];
          if (!chocan(p, q)) continue;
          const arriba = p.y <= q.y ? p : q;
          const abajo = arriba === p ? q : p;
          const falta = arriba.y + 8 - (abajo.y - abajo.e.h);
          if (falta > 0 && abajo.y + falta <= altoMapa - 4) {
            abajo.y += falta;
            quedan = true;
          }
        }
      }

      for (let a = 0; a < libres.length; a++) {
        for (let b = a + 1; b < libres.length; b++) {
          const p = libres[a];
          const q = libres[b];
          if (!chocan(p, q)) continue;
          const falta = (p.e.w + q.e.w) / 2 + 10 - Math.abs(p.x - q.x);
          if (falta <= 0) continue;
          const izq = p.x <= q.x ? p : q;
          const der = izq === p ? q : p;
          const mitad = falta / 2;
          izq.x = Math.max(izq.e.w / 2 + 6, izq.x - mitad);
          der.x = Math.min(anchoMapa - der.e.w / 2 - 6, der.x + mitad);
          quedan = true;
        }
      }

      if (!quedan) break;
      libres.sort(function (a, b) { return a.y - b.y; });
    }

    cajas.forEach(function (c) {
      c.e.el.classList.toggle("abajo", !c.arriba);
      c.e.el.classList.toggle("movida", c.movida);
      c.e.el.classList.toggle("off", !activa(REDES[c.i].id));
      c.e.el.style.transform =
        "translate(-50%,-100%) translate(" + c.x.toFixed(1) + "px," + c.y.toFixed(1) + "px)";

      // Hilo al nodo: solo hace falta cuando el globo ya no está encima de él.
      const l = c.e.hilo;
      if (!l) return;
      if (c.movida && c.abierta) {
        l.setAttribute("x1", c.nodo.x.toFixed(1));
        l.setAttribute("y1", c.nodo.y.toFixed(1));
        l.setAttribute("x2", c.x.toFixed(1));
        l.setAttribute("y2", (c.y - c.e.h / 2).toFixed(1));
        l.setAttribute("opacity", "0.6");
      } else {
        l.setAttribute("opacity", "0");
      }
    });
  }

  /* ── Hit test: cualquiera de los dos hubs de la red ──────── */

  function hitRed(clientX, clientY) {
    if (!canvas || !pantallaHubs.length) return null;
    const rect = canvas.getBoundingClientRect();
    const z = zoom || 1;
    const x = (clientX - rect.left) / z;
    const y = (clientY - rect.top) / z;
    let best = null;
    let bestD = 46;
    for (let ri = 0; ri < pantallaHubs.length; ri++) {
      const lista = pantallaHubs[ri] || [];
      for (let hi = 0; hi < lista.length; hi++) {
        const p = lista[hi];
        const d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y));
        if (d < bestD) {
          bestD = d;
          best = REDES[ri].id;
        }
      }
    }
    return best;
  }

  function engancharClick() {
    if (!canvas || canvas.dataset.hit) return;
    canvas.dataset.hit = "1";
    canvas.addEventListener("click", function (ev) {
      const id = hitRed(ev.clientX, ev.clientY);
      if (!id) {
        if (sel().length && V.limpiar) V.limpiar();
        return;
      }
      if (V.alternarRed) V.alternarRed(id);
    });
    canvas.addEventListener("mousemove", function (ev) {
      canvas.style.cursor = hitRed(ev.clientX, ev.clientY) ? "pointer" : "default";
    });
  }

  /* ── Medición y geometría ────────────────────────────────── */

  /* Todo se mide en px CSS, que es la unidad de style.transform. El rect del
     navegador viene multiplicado por el zoom de página: mezclarlos deja las
     etiquetas corridas y rompe la separación. */
  function medir() {
    if (!canvas) return { w: 1, h: 1, dpr: 1 };
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, g.devicePixelRatio || 1);
    const w = Math.max(1, canvas.clientWidth || Math.floor(r.width));
    const h = Math.max(1, canvas.clientHeight || Math.floor(r.height));
    zoom = w > 0 ? r.width / w : 1;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (threeOk && renderer) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
    dim = { w: w, h: h, dpr: dpr };
    return dim;
  }

  /* El cerebro no se mueve: es anatomía. Lo que late son las redes. */
  function hubXY(ri, hi, s, t) {
    const h = hubs(ri)[hi] || hubs(ri)[0];
    const caos = s.entropia * 0.028;
    return {
      x: h.x + Math.sin(t * 0.35 + ri * 2 + hi) * caos,
      y: h.y + Math.cos(t * 0.28 + ri * 1.3 + hi) * caos * 0.8,
      z: h.z || 0,
    };
  }

  function toXY(nx, ny, w, h) {
    const zoom = 0.42 * Math.min(w, h) * 0.85;
    return { x: nx * zoom + w * 0.5, y: -ny * zoom + h * 0.5 };
  }

  function proyectar3d(x, y, z, w, h) {
    vecProy.set(x, y, z || 0);
    vecProy.project(camera);
    return { x: (vecProy.x * 0.5 + 0.5) * w, y: (-vecProy.y * 0.5 + 0.5) * h };
  }

  /* ── Three ───────────────────────────────────────────────── */

  function lineaDe(pts, color, opacidad, z, cerrada) {
    const v = pts.map(function (p) {
      return new THREE.Vector3(p[0], p[1], z || 0);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(v);
    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacidad,
      depthWrite: false,
    });
    const l = cerrada ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat);
    esquema.add(l);
    return l;
  }

  function rellenoDe(pts, color, opacidad, z) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacidad,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    m.position.z = z || -0.08;
    esquema.add(m);
    return m;
  }

  /* ── Malla real ──────────────────────────────────────────────
     Formato de modelo/*.bin, horneado por scripts/construir_cerebro.py:
       [u32 nVert][u32 nIdx][f32 × 3·nVert][u32 × nIdx]
     Se lee con fetch y se arma un BufferGeometry a mano: el build global de
     three no trae loaders, y así no hace falta ninguno. */
  function geometriaDe(buffer) {
    const cab = new Uint32Array(buffer, 0, 2);
    const nVert = cab[0];
    const nIdx = cab[1];
    const pos = new Float32Array(buffer, 8, nVert * 3);
    const idx = new Uint32Array(buffer, 8 + nVert * 12, nIdx);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    return geo;
  }

  /* Cerebro de vidrio: una capa interna (BackSide) da el volumen y una
     externa (FrontSide) el brillo del borde. Sin escribir profundidad, para
     que las redes se vean adentro. */
  function vidrio(geo, color, opInt, opExt) {
    const grupo = new THREE.Group();
    [
      { lado: THREE.BackSide, op: opInt },
      { lado: THREE.FrontSide, op: opExt },
    ].forEach(function (capa) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.25,
          shininess: 60,
          specular: 0x8899cc,
          transparent: true,
          opacity: capa.op,
          side: capa.lado,
          depthWrite: false,
        })
      );
      m.renderOrder = capa.lado === THREE.BackSide ? -1 : 3;
      grupo.add(m);
    });
    scene.add(grupo);
    return grupo;
  }

  function cargarMalla() {
    const piezas = [
      { archivo: "cerebro", color: 0x9a86e8, ai: 0.16, ae: 0.09 },
      { archivo: "cerebelo", color: 0x6f9bd8, ai: 0.18, ae: 0.1 },
      { archivo: "tronco", color: 0x6f9bd8, ai: 0.2, ae: 0.12 },
    ];
    Promise.all(
      piezas.map(function (p) {
        return fetch("modelo/" + p.archivo + ".bin")
          .then(function (r) {
            if (!r.ok) throw new Error(p.archivo + " " + r.status);
            return r.arrayBuffer();
          })
          .then(function (b) {
            return { p: p, geo: geometriaDe(b) };
          });
      })
    )
      .then(function (lista) {
        if (esquema) {
          scene.remove(esquema);
          esquema = null;
        }
        lista.forEach(function (x) {
          vidrio(x.geo, x.p.color, x.p.ai, x.p.ae);
        });
        mallaOk = true;
      })
      .catch(function () {
        // Se queda el esquema dibujado a mano: no pasa nada.
        mallaOk = false;
      });
  }

  function montarCerebro() {
    if (!trazos) return;
    esquema = new THREE.Group();
    scene.add(esquema);
    rellenoDe(trazos.cerebro, 0x6f5bb5, 0.12, -0.1);
    rellenoDe(trazos.temporal, 0x6f5bb5, 0.12, -0.1);
    rellenoDe(trazos.cerebelo, 0x4f77a8, 0.12, -0.1);
    rellenoDe(trazos.tronco, 0x4f77a8, 0.12, -0.1);

    lineaDe(trazos.cerebro, 0xbfc6e8, 0.44, -0.05, true);
    lineaDe(trazos.temporal, 0xbfc6e8, 0.44, -0.05, true);
    lineaDe(trazos.cerebelo, 0xbfc6e8, 0.32, -0.05, true);
    lineaDe(trazos.tronco, 0xbfc6e8, 0.28, -0.05, true);

    trazos.surcos.forEach(function (s) {
      lineaDe(s.pts, 0xbfc6e8, 0.13 + s.peso * 0.16, -0.04, false);
    });
    trazos.folios.forEach(function (f) {
      lineaDe(f, 0xbfc6e8, 0.16, -0.04, false);
    });

    const pv = polvo.map(function (p) {
      return new THREE.Vector3(p.x, p.y, -0.03);
    });
    polvoObj = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(pv),
      new THREE.PointsMaterial({
        color: 0xbfc6e8,
        size: 0.012,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    esquema.add(polvoObj);
  }

  function montarThree() {
    if (typeof THREE === "undefined" || !canvas) return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
      camera.position.set(0, 0, 2.75);
      camera.lookAt(0, 0, 0);
      vecProy = new THREE.Vector3();

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const p1 = new THREE.PointLight(0x8b6cff, 1.3, 8);
      p1.position.set(-1.4, 0.8, 1.6);
      scene.add(p1);
      const p2 = new THREE.PointLight(0xff5c8a, 0.85, 8);
      p2.position.set(1.6, -0.6, 1.2);
      scene.add(p2);

      montarCerebro();

      meshNodos = [];
      const geo = new THREE.SphereGeometry(0.024, 12, 12);
      nodos.forEach(function (n) {
        const mat = new THREE.MeshStandardMaterial({
          color: n.color,
          emissive: n.color,
          emissiveIntensity: 0.45,
          roughness: 0.35,
          metalness: 0.15,
          transparent: true,
          opacity: 1,
        });
        const m = new THREE.Mesh(geo, mat);
        scene.add(m);
        meshNodos.push(m);
      });

      function mkLines(count, color, opacity, vertexColors) {
        const pos = new Float32Array(count * 6);
        const gline = new THREE.BufferGeometry();
        gline.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        if (vertexColors) {
          gline.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
        }
        const mat = new THREE.LineBasicMaterial({
          color: color,
          vertexColors: !!vertexColors,
          transparent: true,
          opacity: opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const lines = new THREE.LineSegments(gline, mat);
        scene.add(lines);
        return lines;
      }

      lineEntre = mkLines(ENTRE.length, 0xffffff, 0.22);
      lineRed = mkLines(REDES.length, 0xffffff, 0.55, true);
      linePuente = mkLines(12, 0xff5c8a, 0.0);
      linePlast = mkLines(10, 0x3ddc97, 0.0);
      lineSel = mkLines(MAX_SEL, 0xffffff, 0.0);

      // Color fijo de cada red en su cable interno.
      const cAttr = lineRed.geometry.attributes.color;
      REDES.forEach(function (r, ri) {
        const c = hexRgb(r.color);
        for (let k = 0; k < 2; k++) {
          cAttr.array[ri * 6 + k * 3] = c.r / 255;
          cAttr.array[ri * 6 + k * 3 + 1] = c.g / 255;
          cAttr.array[ri * 6 + k * 3 + 2] = c.b / 255;
        }
      });
      cAttr.needsUpdate = true;

      const pgeo = new THREE.BufferGeometry();
      const ppos = new Float32Array(partes.length * 3);
      const pcol = new Float32Array(partes.length * 3);
      partes.forEach(function (p, i) {
        const c = hexRgb(p.color);
        pcol[i * 3] = c.r / 255;
        pcol[i * 3 + 1] = c.g / 255;
        pcol[i * 3 + 2] = c.b / 255;
      });
      pgeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
      pgeo.setAttribute("color", new THREE.BufferAttribute(pcol, 3));
      ptsObj = new THREE.Points(
        pgeo,
        new THREE.PointsMaterial({
          size: 0.026,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      scene.add(ptsObj);
      cargarMalla();
      return true;
    } catch (e) {
      return false;
    }
  }

  function posNodo(n, s, t) {
    const c = hubXY(n.ri, n.hi, s, t);
    const h = hubs(n.ri)[n.hi] || hubs(n.ri)[0];
    const wob = 0.008 + s.entropia * 0.022;
    return {
      x: n.ox + Math.sin(t * 0.9 + n.fase) * wob + c.x - h.x,
      y: n.oy + Math.cos(t * 0.7 + n.fase * 1.2) * wob * 0.8 + c.y - h.y,
      z: (n.oz || 0) + Math.sin(t * 0.5 + n.fase) * (0.02 + s.entropia * 0.04),
    };
  }

  function setSeg(attr, i, a, b) {
    const arr = attr.array;
    const o = i * 6;
    arr[o] = a.x; arr[o + 1] = a.y; arr[o + 2] = a.z || 0;
    arr[o + 3] = b.x; arr[o + 4] = b.y; arr[o + 5] = b.z || 0;
  }

  const CERO = { x: 0, y: 0, z: 0 };

  function pintarThree(s, dt) {
    const d = medir();
    tAnim += dt * (0.55 + s.entropia * 1.4 + (V.estado.play ? 0.35 : 0));
    const t = tAnim;
    const hay = sel().length > 0;
    const posN = nodos.map(function (n) { return posNodo(n, s, t); });

    meshNodos.forEach(function (m, i) {
      const n = nodos[i];
      const p = posN[i];
      const on = activa(n.red);
      m.position.set(p.x, p.y, p.z);
      const pulse =
        (0.85 + s.psilo * 0.55 + Math.sin(t * 2 + i) * 0.08) * (marcada(n.red) ? 1.4 : 1);
      m.scale.setScalar(pulse);
      m.material.emissiveIntensity = (0.35 + s.entropia * 0.9) * (on ? 1 : 0.25);
      m.material.opacity = on ? 1 : 0.14;
    });

    // Cable propio de cada red: los dos hubs que la componen.
    const aRed = lineRed.geometry.attributes.position;
    REDES.forEach(function (r, ri) {
      const hs = hubs(ri);
      if (hs.length < 2 || !activa(r.id)) {
        setSeg(aRed, ri, CERO, CERO);
        return;
      }
      const a = hubXY(ri, 0, s, t);
      const b = hubXY(ri, 1, s, t);
      setSeg(aRed, ri, a, b);
    });
    aRed.needsUpdate = true;
    lineRed.material.opacity = 0.32 + s.entropia * 0.3;

    const aEntre = lineEntre.geometry.attributes.position;
    ENTRE.forEach(function (par, i) {
      const ca = hubXY(par[0], 0, s, t);
      const cb = hubXY(par[1], 0, s, t);
      setSeg(aEntre, i, ca, cb);
    });
    aEntre.needsUpdate = true;
    lineEntre.material.opacity = (0.08 + s.priors * 0.14) * (hay ? 0.3 : 1);

    const aP = linePuente.geometry.attributes.position;
    for (let i = 0; i < 12; i++) {
      setSeg(
        aP, i,
        posN[Math.floor(seed(i * 7) * nodos.length)],
        posN[Math.floor(seed(i * 7 + 3) * nodos.length)]
      );
    }
    aP.needsUpdate = true;
    linePuente.material.opacity = Math.max(0, s.entropia - 0.18) * 0.72 * (hay ? 0.35 : 1);

    const aL = linePlast.geometry.attributes.position;
    for (let i = 0; i < 10; i++) {
      setSeg(
        aL, i,
        posN[Math.floor(seed(i * 11 + 1) * nodos.length)],
        posN[Math.floor(seed(i * 11 + 5) * nodos.length)]
      );
    }
    aL.needsUpdate = true;
    linePlast.material.opacity = Math.max(0, s.plasticidad - 0.22) * 0.5 * (hay ? 0.35 : 1);

    // Cables entre las redes elegidas: eso es lo que la tarjeta combinada explica.
    const aS = lineSel.geometry.attributes.position;
    const idx = [];
    REDES.forEach(function (r, ri) { if (marcada(r.id)) idx.push(ri); });
    let k = 0;
    for (let i = 0; i < idx.length && k < MAX_SEL; i++) {
      for (let j = i + 1; j < idx.length && k < MAX_SEL; j++) {
        const ca = hubXY(idx[i], 0, s, t);
        const cb = hubXY(idx[j], 0, s, t);
        setSeg(aS, k++, ca, cb);
      }
    }
    for (let z = k; z < MAX_SEL; z++) setSeg(aS, z, CERO, CERO);
    aS.needsUpdate = true;
    lineSel.material.opacity = k ? 0.45 + Math.sin(t * 2.2) * 0.12 : 0;

    const ppos = ptsObj.geometry.attributes.position;
    partes.forEach(function (p, i) {
      const c = hubXY(p.ri, p.hi, s, t);
      const ang = t * p.w + p.fase;
      ppos.array[i * 3] = c.x + Math.cos(ang) * p.r;
      ppos.array[i * 3 + 1] = c.y + Math.sin(ang) * p.r * 0.8;
      ppos.array[i * 3 + 2] = (c.z || 0) + Math.sin(ang * 1.4) * 0.04;
    });
    ppos.needsUpdate = true;
    ptsObj.material.opacity = (0.4 + s.psilo * 0.45) * (hay ? 0.4 : 1);

    if (polvoObj) polvoObj.material.opacity = 0.16 + s.entropia * 0.18;

    pantallaHubs = REDES.map(function (_, ri) {
      return hubs(ri).map(function (_h, hi) {
        const c = hubXY(ri, hi, s, t);
        return proyectar3d(c.x, c.y, c.z, d.w, d.h);
      });
    });
    pantalla = pantallaHubs.map(function (l) { return l[0]; });

    renderer.render(scene, camera);
  }

  /* ── Fallback 2D ─────────────────────────────────────────── */

  function trazo2d(pts, w, h, cerrada) {
    ctx.beginPath();
    pts.forEach(function (p, i) {
      const xy = toXY(p[0], p[1], w, h);
      if (i === 0) ctx.moveTo(xy.x, xy.y);
      else ctx.lineTo(xy.x, xy.y);
    });
    if (cerrada) ctx.closePath();
  }

  function cerebro2d(s, w, h) {
    if (!trazos) return;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.fillStyle = "rgba(111,91,181,0.15)";
    trazo2d(trazos.cerebro, w, h, true);
    ctx.fill();
    trazo2d(trazos.temporal, w, h, true);
    ctx.fill();
    ctx.fillStyle = "rgba(79,119,168,0.15)";
    trazo2d(trazos.cerebelo, w, h, true);
    ctx.fill();
    trazo2d(trazos.tronco, w, h, true);
    ctx.fill();

    ctx.strokeStyle = "rgba(191,198,232,0.44)";
    ctx.lineWidth = 1.4;
    trazo2d(trazos.cerebro, w, h, true);
    ctx.stroke();
    trazo2d(trazos.temporal, w, h, true);
    ctx.stroke();
    ctx.strokeStyle = "rgba(191,198,232,0.3)";
    trazo2d(trazos.cerebelo, w, h, true);
    ctx.stroke();
    trazo2d(trazos.tronco, w, h, true);
    ctx.stroke();

    ctx.lineWidth = 1;
    trazos.surcos.forEach(function (su) {
      ctx.strokeStyle = "rgba(191,198,232," + (0.13 + su.peso * 0.16) + ")";
      trazo2d(su.pts, w, h, false);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(191,198,232,0.16)";
    trazos.folios.forEach(function (f) {
      trazo2d(f, w, h, false);
      ctx.stroke();
    });

    ctx.fillStyle = "rgba(191,198,232," + (0.14 + s.entropia * 0.16) + ")";
    polvo.forEach(function (p) {
      const xy = toXY(p.x, p.y, w, h);
      ctx.beginPath();
      ctx.arc(xy.x, xy.y, p.s * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function pintar2d(s, dt) {
    const d = medir();
    const w = d.w;
    const h = d.h;
    tAnim += dt * (0.55 + s.entropia * 1.4 + (V.estado && V.estado.play ? 0.35 : 0));
    const t = tAnim;
    const hay = sel().length > 0;
    ctx.clearRect(0, 0, w, h);

    cerebro2d(s, w, h);

    const hubsXY = REDES.map(function (_, ri) {
      return hubs(ri).map(function (_h, hi) {
        const c = hubXY(ri, hi, s, t);
        return toXY(c.x, c.y, w, h);
      });
    });
    pantallaHubs = hubsXY;
    pantalla = hubsXY.map(function (l) { return l[0]; });

    ENTRE.forEach(function (par) {
      const a = hubsXY[par[0]][0];
      const b = hubsXY[par[1]][0];
      ctx.strokeStyle = "rgba(232,228,216," + (0.06 + s.priors * 0.1) * (hay ? 0.35 : 1) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    REDES.forEach(function (r, ri) {
      if (hubsXY[ri].length < 2 || !activa(r.id)) return;
      ctx.strokeStyle = rgba(r.color, 0.3 + s.entropia * 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hubsXY[ri][0].x, hubsXY[ri][0].y);
      ctx.lineTo(hubsXY[ri][1].x, hubsXY[ri][1].y);
      ctx.stroke();
    });

    if (s.entropia > 0.12) {
      ctx.strokeStyle = rgba("#ff5c8a", (s.entropia - 0.12) * 0.55 * (hay ? 0.35 : 1));
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 10; i++) {
        const a = posNodo(nodos[Math.floor(seed(i * 7 + Math.floor(t)) * nodos.length)], s, t);
        const b = posNodo(nodos[Math.floor(seed(i * 7 + 3 + Math.floor(t)) * nodos.length)], s, t);
        const A = toXY(a.x, a.y, w, h);
        const B = toXY(b.x, b.y, w, h);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
    }

    if (s.plasticidad > 0.25) {
      ctx.strokeStyle = rgba("#3ddc97", (s.plasticidad - 0.2) * 0.45 * (hay ? 0.35 : 1));
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 6]);
      for (let i = 0; i < 8; i++) {
        const a = posNodo(nodos[Math.floor(seed(i * 11 + 2) * nodos.length)], s, t);
        const b = posNodo(nodos[Math.floor(seed(i * 11 + 6) * nodos.length)], s, t);
        const A = toXY(a.x, a.y, w, h);
        const B = toXY(b.x, b.y, w, h);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    const idx = [];
    REDES.forEach(function (r, ri) { if (marcada(r.id)) idx.push(ri); });
    if (idx.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255," + (0.4 + Math.sin(t * 2.2) * 0.14) + ")";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < idx.length; i++) {
        for (let j = i + 1; j < idx.length; j++) {
          ctx.beginPath();
          ctx.moveTo(hubsXY[idx[i]][0].x, hubsXY[idx[i]][0].y);
          ctx.lineTo(hubsXY[idx[j]][0].x, hubsXY[idx[j]][0].y);
          ctx.stroke();
        }
      }
    }

    nodos.forEach(function (n) {
      const p = posNodo(n, s, t);
      const xy = toXY(p.x, p.y, w, h);
      const on = activa(n.red);
      const rad =
        (2 + s.psilo * 1.8 + Math.sin(t * 2 + n.fase) * 0.5) * (marcada(n.red) ? 1.3 : 1);
      ctx.beginPath();
      ctx.fillStyle = rgba(n.color, (0.18 + s.entropia * 0.2) * (on ? 1 : 0.14));
      ctx.arc(xy.x, xy.y, rad * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = rgba(n.color, on ? 1 : 0.14);
      ctx.arc(xy.x, xy.y, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    partes.forEach(function (p) {
      const c = hubXY(p.ri, p.hi, s, t);
      const ang = t * p.w + p.fase;
      const xy = toXY(c.x + Math.cos(ang) * p.r, c.y + Math.sin(ang) * p.r * 0.8, w, h);
      ctx.fillStyle = rgba(p.color, (0.5 + s.psilo * 0.35) * (activa(p.red) ? 1 : 0.16));
      ctx.beginPath();
      ctx.arc(xy.x, xy.y, 1.4 + s.psilo * 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    hubsXY.forEach(function (lista, ri) {
      if (!marcada(REDES[ri].id)) return;
      ctx.strokeStyle = rgba(REDES[ri].color, 0.7);
      ctx.lineWidth = 1.5;
      lista.forEach(function (c) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16 + s.psilo * 6, 0, Math.PI * 2);
        ctx.stroke();
      });
    });
  }

  /* ── Ciclo ───────────────────────────────────────────────── */

  function montar() {
    canvas = document.getElementById("lienzoRed");
    if (!canvas) {
      V.red = V.red || {};
      return;
    }
    armarTrazos();
    armarDatos();
    leyenda();
    montarEtiquetas();
    threeOk = montarThree();
    if (!threeOk) ctx = canvas.getContext("2d");
    medir();
    engancharClick();
    // Sin preventDefault el navegador no reintenta nunca; con esto, si el
    // contexto se pierde (muchas pestañas 3D, suspensión, driver), vuelve.
    canvas.addEventListener("webglcontextlost", function (ev) {
      ev.preventDefault();
      threeOk = false;
    });
    canvas.addEventListener("webglcontextrestored", function () {
      avisado = false;
      threeOk = montarThree();
    });
    listo = true;
    pintar(0.016);
    g.addEventListener("resize", function () {
      medir();
      if (listo) pintar(0.016);
    });
  }

  function pintar(dt) {
    if (!listo || !canvas || !V.estado) return;
    const s = snap();
    const d = typeof dt === "number" && dt > 0 ? Math.min(0.05, dt) : 0.016;
    if (threeOk && renderer) {
      try {
        pintarThree(s, d);
      } catch (e) {
        // NO se puede caer al 2D acá: el canvas ya tiene contexto WebGL y
        // getContext("2d") devuelve null para siempre. La versión anterior lo
        // intentaba igual y al cuadro siguiente pintar2d reventaba contra un
        // ctx nulo, matando el requestAnimationFrame — o sea, la simulación
        // entera. Se avisa una vez y se sigue: si el contexto vuelve, el
        // próximo cuadro dibuja solo.
        if (!avisado) {
          avisado = true;
          console.warn("[red] falló un cuadro 3D, sigo intentando:", e);
        }
      }
    } else {
      if (!ctx) ctx = canvas.getContext("2d");
      if (ctx) pintar2d(s, d);
    }
    refrescarEtiquetas();
    pintarEtiquetas();
  }

  function sincronizar() {
    syncLeyenda();
    refrescarEtiquetas();
    pintarEtiquetas();
  }

  V.red = { montar: montar, pintar: pintar, sincronizar: sincronizar, lista: REDES };
})(window);
