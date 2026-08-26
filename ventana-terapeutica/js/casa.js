/* La casa: laboratorio de la ventana.

   La tesis de la pieza termina en "el viaje fue la llave; esto es la casa" —
   pero la casa era un párrafo. Acá es operativa:

     - Se elige la CREENCIA con la que llega la persona (con su peso).
     - Durante la sesión, el peso de la creencia sigue la curva de priors:
       lo que el modelo ya calculaba, ahora pasa algo con eso.
     - En la ventana (días 1–14) compiten dos fuerzas por día:
         reconsolidación: tiende a volver a su peso original
         escritura: lo que se haga, proporcional a plasticidad × apertura
     - Sin apertura (microdosis) no hay nada que escribir. Sin integración,
       el viaje se archiva. Con las dos, la creencia se reescribe.

   Modelo de juguete, asumido como tal: no cuantifica resultado clínico,
   ilustra el mecanismo (REBUS + integración, Carhart-Harris 2019;
   Lyons & Carhart-Harris 2018). Las constantes están en la fuente del panel.

   La trayectoria es determinista y se recalcula sola si cambia la dosis, el
   perfil o el contexto: el tiempo se puede rebobinar sin romper nada. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const CREENCIAS = [
    {
      id: "identidad",
      frase: "«Así soy, y no hay mucho que hacer»",
      ancla: "dmn",
      anclaNombre: "el narrador",
      nota: "Identidad cerrada: el libreto que el narrador sostiene desde hace años. Vive en el DMN. El prior más difícil de mover, y el que más cambia todo cuando se mueve.",
    },
    {
      id: "culpa",
      frase: "«Lo que pasó fue culpa mía»",
      ancla: "lim",
      anclaNombre: "la emoción",
      nota: "Un peso fijo sobre un recuerdo: la emoción lo cargó, el narrador lo cerró con llave. Vive en la red límbica. El trabajo clásico de reconsolidación.",
    },
    {
      id: "evitacion",
      frase: "«Si lo dejo venir, me rompo»",
      ancla: "sal",
      anclaNombre: "el portero",
      nota: "Prior protector: en su momento cuidó. Hoy impide que el material llegue. Vive en la saliencia. La sesión lo salta si el portero no afloja.",
    },
  ];

  const INTEGRACION = [
    { id: "sola", nombre: "sola", tasa: 0, nota: "La vida sigue. Nadie pregunta, nada se practica." },
    { id: "anotar", nombre: "anotar / charlar", tasa: 0.10, nota: "Contarlo, escribirlo, algún café con alguien: palabras sueltas sobre lo que pasó." },
    { id: "terapia", nombre: "terapia en la ventana", tasa: 0.22, nota: "Sesiones estos días, sobre el material que apareció. El clásico «integración»." },
    { id: "practica", nombre: "terapia + práctica", tasa: 0.36, nota: "Terapia y además conducta nueva: exponerse a lo evitado, escribir la carta, cambiar la rutina que sostenía la creencia." },
  ];

  /* Constantes del modelo (a la vista): cuánto tiende el prior a volver por
     día, y el paso de integración de la ventana en minutos. */
  const K_RECUP = 0.30;
  const PASO = 30;

  let panel = null;
  let canvas = null;
  let ctx = null;
  let abierto = false;

  let creenciaId = CREENCIAS[0].id;
  let pesoLlegada = 0.85;
  let peso0 = 0.85;
  let integId = "sola";

  let cache = { sig: null, ts: [], pesos: [], apertura: 0 };
  let ultLectura = "";
  let ultVeredicto = "";

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function creencia() {
    for (let i = 0; i < CREENCIAS.length; i++) {
      if (CREENCIAS[i].id === creenciaId) return CREENCIAS[i];
    }
    return CREENCIAS[0];
  }

  function integracion() {
    for (let i = 0; i < INTEGRACION.length; i++) {
      if (INTEGRACION[i].id === integId) return INTEGRACION[i];
    }
    return INTEGRACION[0];
  }

  /* Cuánto abrió la sesión esta dosis: el hueco entre los priors al llegar y
     su mínimo durante la sesión, normalizado al piso del modelo (0,14). */
  function aperturaDe() {
    const F = V.fisio;
    if (!F) return 0;
    let minP = 1;
    for (let t = 0; t <= F.T_SESION; t += 10) {
      const p = F.fPriors(t);
      if (p < minP) minP = p;
    }
    return clamp((1 - minP) / (1 - 0.14), 0, 1);
  }

  function trayectoria() {
    const F = V.fisio;
    if (!F) return cache;
    const info = F.info();
    const sala = (V.estado && V.estado.sala) || "alineada";
    const sesion = (V.estado && V.estado.sesion) || 1;
    const sig = [
      info.mg, info.mult.ka, info.mult.cmax, info.mult.ec50, info.blandura || 0,
      creenciaId, peso0.toFixed(3), integId, sala, sesion,
    ].join("|");
    if (cache.sig === sig) return cache;

    const apertura = aperturaDe();
    const foco = (V.focoSala && V.focoSala()) || 1;
    const tasa = integracion().tasa * foco;
    const ts = [];
    const pesos = [];

    // Sesión: el peso sigue la curva de priors tal cual.
    for (let t = 0; t <= F.T_SESION; t += 10) {
      ts.push(t);
      pesos.push(peso0 * F.fPriors(t));
    }

    // Ventana: cada día, la reconsolidación empuja hacia peso0 y la práctica
    // escribe (si hubo apertura, y mientras haya plasticidad).
    let peso = pesos[pesos.length - 1];
    const dtDia = PASO / 1440;
    for (let t = F.T_SESION + PASO; t <= F.T_MAX; t += PASO) {
      const recupera = K_RECUP * (peso0 - peso);
      const escribe = tasa * F.fPlasticidad(t) * apertura;
      peso = clamp(peso + (recupera - escribe) * dtDia, 0.01, 1);
      ts.push(t);
      pesos.push(peso);
    }

    cache = { sig: sig, ts: ts, pesos: pesos, apertura: apertura, foco: foco };
    return cache;
  }

  function heredar() {
    const tr = trayectoria();
    const fin = tr.pesos.length ? tr.pesos[tr.pesos.length - 1] : peso0;
    const bland = 1 - fin / Math.max(0.01, peso0);
    peso0 = clamp(fin, 0.05, 0.98);
    cache.sig = null;
    const el = panel && panel.querySelector("#csPeso");
    if (el) el.value = String(Math.round(peso0 * 100));
    return clamp(bland, 0, 1);
  }

  function restaurar() {
    peso0 = pesoLlegada;
    cache.sig = null;
    const el = panel && panel.querySelector("#csPeso");
    if (el) el.value = String(Math.round(peso0 * 100));
  }

  function pesoEn(tr, t) {
    if (!tr.ts.length) return peso0;
    if (t <= tr.ts[0]) return tr.pesos[0];
    const last = tr.ts.length - 1;
    if (t >= tr.ts[last]) return tr.pesos[last];
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tr.ts[mid] <= t) lo = mid;
      else hi = mid;
    }
    const span = tr.ts[hi] - tr.ts[lo] || 1;
    const f = (t - tr.ts[lo]) / span;
    return tr.pesos[lo] + (tr.pesos[hi] - tr.pesos[lo]) * f;
  }

  /* ── Textos ─────────────────────────────────────────────── */

  function palabraApertura(a) {
    if (a >= 0.6) return "amplia";
    if (a >= 0.3) return "media";
    if (a >= 0.12) return "angosta";
    return "nula";
  }

  function palabraPeso(peso) {
    const r = peso / Math.max(0.01, peso0);
    if (r >= 0.9) return "sigue tan firme como al llegar";
    if (r >= 0.7) return "aflojó un poco";
    if (r >= 0.45) return "está blanda";
    if (r >= 0.25) return "perdió buena parte de la autoridad";
    return "ya no organiza como antes";
  }

  function lectura(t, tr) {
    const fase = V.fases ? V.fases.en(t) : null;
    const peso = pesoEn(tr, t);
    const c = creencia();
    return (
      (fase ? fase.nombre.toLowerCase() : "") +
      " · " + palabraPeso(peso) +
      " · viga: " + c.anclaNombre +
      " · apertura: " + palabraApertura(tr.apertura)
    );
  }

  function veredicto(t, tr) {
    const peso = pesoEn(tr, t);
    if (tr.apertura < 0.12) {
      return "Con esta dosis el prior casi no se enteró: no hay puerta abierta que escribir. " +
        "Por más terapia en la ventana, la integración trabaja sobre madera seca. " +
        "La curva de priors lo dice todo: no bajó.";
    }
    if (t < V.fisio.T_SESION) {
      const r = peso / peso0;
      if (r > 0.9) {
        return "Todavía firme. La sesión apenas empezó: la curva de priors todavía no bajó y la creencia sigue mandando.";
      }
      if (r > 0.55) {
        return "Está aflojando. Este es el material en movimiento — el momento de sostener, no de interpretar encima.";
      }
      return "En su punto más blando. La viga es " + creencia().anclaNombre +
        ": acá una frase pesa lo que en otro momento no pesaría. Lo que falta decidir es qué pasa después.";
    }
    const r = peso / peso0;
    if (r >= 0.85) {
      return "Se reconsolidó casi igual. La experiencia se archiva como «aquello que me pasó una vez»: " +
        "sin trabajo en la ventana, el viaje no deja casa.";
    }
    if (r >= 0.6) {
      return "Quedó más liviana pero entera: hay material abierto y sin cerrar. Sigue siendo terreno de trabajo — la ventana todavía dura.";
    }
    if (r >= 0.35) {
      return "Bastante reescrita: perdió buena parte de la autoridad. " +
        "Lo que se practique el resto de la ventana decide si el cambio se queda o se va.";
    }
    return "Perdió autoridad: la creencia sigue ahí, pero ya no organiza la vida. " +
      "Eso es reconsolidación — y no pasa sin ventana, por más linda que haya sido la sesión.";
  }

  /* ── Dibujo ─────────────────────────────────────────────── */

  function medir() {
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const dpr = Math.min(2, g.devicePixelRatio || 1);
    const w = Math.floor(r.width * dpr);
    const h = Math.floor(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function dibujar(tr) {
    if (!canvas || !ctx) return;
    medir();
    const F = V.fisio;
    const r = canvas.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (w < 4) return;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 6, r: 6, t: 8, b: 12 };
    const xU = function (u) { return pad.l + u * (w - pad.l - pad.r); };
    const yP = function (p) { return pad.t + (1 - p) * (h - pad.t - pad.b); };

    // Sesión (55 % del ancho, como en el gráfico grande).
    const xs = xU(0.55);
    ctx.fillStyle = "rgba(139, 108, 255, 0.07)";
    ctx.fillRect(pad.l, pad.t, xs - pad.l, h - pad.t - pad.b);

    // Como llegó: la referencia de peso0.
    ctx.strokeStyle = "rgba(232, 228, 216, 0.22)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, yP(peso0));
    ctx.lineTo(w - pad.r, yP(peso0));
    ctx.stroke();
    ctx.setLineDash([]);

    // El peso: amarillo mientras la sesión lo afloja, verde cuando la
    // ventana decide lo que se queda.
    const tramo = function (desde, hasta, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let primero = true;
      for (let i = 0; i < tr.ts.length; i++) {
        const t = tr.ts[i];
        if (t < desde || t > hasta) continue;
        const x = xU(F.tiempoASlider(t));
        const y = yP(tr.pesos[i]);
        if (primero) { ctx.moveTo(x, y); primero = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    tramo(0, F.T_SESION, "#f5c14c");
    tramo(F.T_SESION, F.T_MAX + 1, "#3ddc97");

    // Ahora.
    const uAhora = F.tiempoASlider(V.estado.t);
    const xA = xU(uAhora);
    const yA = yP(pesoEn(tr, V.estado.t));
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xA, pad.t);
    ctx.lineTo(xA, h - pad.b);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(xA, yA, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(232, 228, 216, 0.4)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("8 h", xs, h - pad.b + 3);
    ctx.fillText("día 14", w - pad.r - 14, h - pad.b + 3);
  }

  /* ── Panel ──────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function montar() {
    panel = document.getElementById("casa");
    const abrir = document.getElementById("btnCasa");
    if (abrir) abrir.addEventListener("click", function () { entrar(); });
    if (!panel) return;

    panel.innerHTML =
      '<div class="cs-cab">' +
      '<span class="cs-kicker" id="csKicker">laboratorio · sesión + 14 días</span>' +
      '<button type="button" class="cs-salir">volver ✕</button>' +
      "</div>" +
      "<h3 class=\"cs-titulo\">La casa: qué se escribe en la ventana</h3>" +
      '<p class="cs-intro">La sesión afloja la creencia. Lo que se haga estos días decide si vuelve a cerrar igual.</p>' +
      '<canvas id="csCanvas" aria-hidden="true"></canvas>' +
      '<div class="cs-lectura" id="csLectura"></div>' +
      '<div class="cs-veredicto" id="csVeredicto"></div>' +
      '<div class="cs-grupo"><span class="cs-rotulo">la creencia</span><div class="cs-chips cs-creencias">' +
      CREENCIAS.map(function (c) {
        return '<button type="button" class="cs-chip" data-creencia="' + c.id + '">' + esc(c.frase) + "</button>";
      }).join("") +
      "</div>" +
      '<p class="cs-nota" id="csNotaCreencia"></p></div>' +
      '<label class="cs-peso"><span>cuán firme la sostiene</span>' +
      '<input type="range" id="csPeso" min="40" max="100" step="1" aria-label="Peso inicial de la creencia">' +
      "<em id=\"csPesoVal\"></em></label>" +
      '<div class="cs-grupo"><span class="cs-rotulo">en la ventana</span><div class="cs-chips cs-integs">' +
      INTEGRACION.map(function (i) {
        return '<button type="button" class="cs-chip" data-integ="' + i.id + '">' + esc(i.nombre) + "</button>";
      }).join("") +
      "</div>" +
      '<p class="cs-nota" id="csNotaInteg"></p></div>' +
      '<p class="cs-fuente">Modelo de juguete de REBUS + integración (Carhart-Harris 2019; ' +
      "Lyons &amp; Carhart-Harris 2018). El mapeo creencia→red es ilustrativo, no una localización. " +
      "Durante la sesión el peso sigue la curva de priors; en la ventana, cada día compite la reconsolidación " +
      "contra lo que se escribe (práctica × plasticidad × apertura × si la sala apuntó a esa red). " +
      "No cuantifica resultado clínico: ilustra por qué la ventana se llama terapéutica.</p>";

    canvas = panel.querySelector("#csCanvas");
    ctx = canvas ? canvas.getContext("2d") : null;
    if (canvas && typeof ResizeObserver === "function") {
      new ResizeObserver(function () { pintar(); }).observe(canvas);
    }

    const peso = panel.querySelector("#csPeso");
    if (peso) {
      peso.value = String(Math.round(peso0 * 100));
      peso.addEventListener("input", function () {
        peso0 = Number(peso.value) / 100;
        if (!V.estado || V.estado.sesion !== 2) pesoLlegada = peso0;
        pintar(true);
      });
    }

    panel.querySelectorAll("[data-creencia]").forEach(function (b) {
      b.addEventListener("click", function () {
        creenciaId = b.dataset.creencia;
        pintar(true);
        if (V.red && V.red.sincronizar) V.red.sincronizar();
      });
    });
    panel.querySelectorAll("[data-integ]").forEach(function (b) {
      b.addEventListener("click", function () {
        integId = b.dataset.integ;
        pintar(true);
      });
    });
    panel.querySelector(".cs-salir").addEventListener("click", salir);

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && abierto) salir();
    });
  }

  function entrar() {
    if (!panel) return;
    // Una sola columna de lectura a la vez: con el relato abierto, gana la casa.
    if (V.relato && V.relato.activo && V.relato.activo()) V.relato.salir();
    const ctx = document.getElementById("dzCtx");
    const ctxBtn = document.getElementById("dzCtxBtn");
    if (ctx && !ctx.hidden) {
      ctx.hidden = true;
      if (ctxBtn) ctxBtn.setAttribute("aria-expanded", "false");
    }
    const sala = document.getElementById("dzSala");
    const salaBtn = document.getElementById("dzSalaBtn");
    if (sala && !sala.hidden) {
      sala.hidden = true;
      if (salaBtn) salaBtn.setAttribute("aria-expanded", "false");
    }
    abierto = true;
    document.body.classList.add("en-casa");
    panel.hidden = false;
    pintar(true);
  }

  function salir() {
    abierto = false;
    document.body.classList.remove("en-casa");
    if (panel) panel.hidden = true;
    if (V.ui) V.ui.pintar(true);
  }

  function activo() {
    return abierto;
  }

  function pintar(forzar) {
    if (!abierto || !panel || !V.fisio) return;
    const tr = trayectoria();
    const t = V.estado.t;

    const kick = panel.querySelector("#csKicker");
    if (kick) {
      kick.textContent =
        (V.estado && V.estado.sesion === 2)
          ? "laboratorio · sesión 2 + 14 días"
          : "laboratorio · sesión + 14 días";
    }

    const sigChips =
      creenciaId + "|" + integId + "|" + Math.round(peso0 * 100) +
      "|" + ((V.estado && V.estado.sesion) || 1);
    if (forzar || panel.dataset.chips !== sigChips) {
      panel.dataset.chips = sigChips;
      panel.querySelectorAll("[data-creencia]").forEach(function (b) {
        b.classList.toggle("on", b.dataset.creencia === creenciaId);
      });
      panel.querySelectorAll("[data-integ]").forEach(function (b) {
        b.classList.toggle("on", b.dataset.integ === integId);
      });
      const nc = panel.querySelector("#csNotaCreencia");
      if (nc) nc.textContent = creencia().nota;
      const ni = panel.querySelector("#csNotaInteg");
      if (ni) ni.textContent = integracion().nota;
      const pv = panel.querySelector("#csPesoVal");
      if (pv) pv.textContent = Math.round(peso0 * 100) + "%";
    }

    const txtL = lectura(t, tr);
    if (forzar || txtL !== ultLectura) {
      ultLectura = txtL;
      const el = panel.querySelector("#csLectura");
      if (el) el.textContent = txtL;
    }
    const txtV = veredicto(t, tr);
    if (forzar || txtV !== ultVeredicto) {
      ultVeredicto = txtV;
      const el = panel.querySelector("#csVeredicto");
      if (el) el.textContent = txtV;
    }

    dibujar(tr);
  }

  V.casa = {
    montar: montar,
    entrar: entrar,
    salir: salir,
    mostrar: function (si) { if (si) entrar(); else if (abierto) salir(); },
    activo: activo,
    pintar: pintar,
    ancla: function () { return creencia().ancla; },
    heredar: heredar,
    restaurar: restaurar,
    creencias: CREENCIAS,
    integraciones: INTEGRACION,
  };
})(window);
