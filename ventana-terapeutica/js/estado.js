(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const estado = {
    t: 0,
    play: false,
    last: 0,
    hoverU: null,
    faseId: "base",
    sel: [],
    curva: null,
    target: null,
    cepaId: "cubensis",
    gramos: 3.5,
    vel: 1,
    vista: "cerebro",
    cohorte: false,
    perfil: "promedio",
    moduladores: { estomago: "ayunas", prep: "secos", irs: "no", ultima: "mes" },
    sesion: 1,
    sala: "alineada",
  };

  const VELS = [0.25, 0.5, 1, 2, 4];

  /* Tres salas. No tocan ocupación: reparte qué redes se llevan la entropía.
     Alineada es la de los ensayos (playlist que sigue el pico). */
  const SALAS = {
    alineada: {
      id: "alineada",
      nombre: "playlist al pico",
      efecto: "el caudal va a imagen y narrador",
      nota: "La sala de los ensayos: música que sube con la molécula. Los ojos cerrados mandan el caudal a visual y DMN. Kaelen, Carhart-Harris.",
      pesos: { dmn: 1.28, vis: 1.28, ejec: 1, sal: 0.82, lim: 0.9 },
    },
    silencio: {
      id: "silencio",
      nombre: "silencio",
      efecto: "el caudal va al cuerpo y la alarma",
      nota: "Sin música el portero y la emoción se quedan con el ancho de banda. El viaje es más interoceptivo, menos geométrico.",
      pesos: { dmn: 0.75, vis: 0.7, ejec: 1, sal: 1.32, lim: 1.28 },
    },
    desfasada: {
      id: "desfasada",
      nombre: "playlist tarde",
      efecto: "la música picoa cuando la molécula ya bajó",
      nota: "Misma playlist, mal tempo: el pico químico pasa casi en seco y el caudal llega en el descenso. No cambia los mg. Cambia si el material aterriza.",
      pesos: { dmn: 1.12, vis: 1.12, ejec: 1, sal: 0.9, lim: 0.9 },
      delayMin: 90,
    },
  };

  /* Moduladores del día: el mismo gramo, otro contexto. Cada opción escala
     parámetros reales del motor (ka, cmax, ec50). Los valores son órdenes de
     magnitud de literatura y práctica, no dosis de precisión — las notas que
     los acompañan en la UI dicen cuánto se sabe de cada uno. */
  const MODULADORES = {
    estomago: {
      etiqueta: "estómago",
      nota: "Los ensayos dosifican en ayunas por esto mismo: la comida baja y atrasa el pico.",
      opciones: {
        ayunas: { nombre: "en ayunas", ka: 1, cmax: 1 },
        comida: { nombre: "con comida", ka: 0.62, cmax: 0.82, efecto: "pico más bajo y más tarde" },
      },
    },
    prep: {
      etiqueta: "preparación",
      nota: "Folclore psiconáutico con mecanismo plausible (conversión previa, líquido ácido). Nadie lo midió formal.",
      opciones: {
        secos: { nombre: "hongos secos", ka: 1, cmax: 1 },
        tek: { nombre: "té / lemon tek", ka: 1.8, cmax: 1.05, efecto: "subida más rápida" },
      },
    },
    irs: {
      etiqueta: "IRS",
      nota: "El uso crónico de IRS deja los 5-HT2A menos responsivos: misma dosis, bastante menos efecto. La interacción que más aparece en consultorio.",
      opciones: {
        no: { nombre: "no usa", ec50: 1 },
        si: { nombre: "uso crónico", ec50: 1.75, efecto: "respuesta amortiguada" },
      },
    },
    ultima: {
      etiqueta: "última sesión",
      nota: "Tolerancia rápida (tachyfilaxia 5-HT2A): repetir a los pocos días da mucho menos. Por eso los protocolos espacian las sesiones por semanas.",
      opciones: {
        mes: { nombre: "hace más de un mes", ec50: 1 },
        semana: { nombre: "hace una semana", ec50: 1.35, efecto: "algo achatada" },
        dias: { nombre: "hace 2 días", ec50: 2.3, efecto: "muy achatada" },
      },
    },
  };

  function perfilMult() {
    const perfiles = (V.cohorte && V.cohorte.perfiles) || {};
    return (perfiles[estado.perfil] && perfiles[estado.perfil].mult) || { ka: 1, cmax: 1, ec50: 1 };
  }

  /* Multiplicador de solo el contexto: lo usa el gráfico para dibujar la
     línea de referencia en punteado (la misma persona sin el modificador). */
  function modMult() {
    const out = { ka: 1, cmax: 1, ec50: 1 };
    Object.keys(MODULADORES).forEach(function (k) {
      const op = MODULADORES[k].opciones[estado.moduladores[k]] || {};
      out.ka *= op.ka || 1;
      out.cmax *= op.cmax || 1;
      out.ec50 *= op.ec50 || 1;
    });
    return out;
  }

  function modAlterado() {
    const m = modMult();
    return m.ka !== 1 || m.cmax !== 1 || m.ec50 !== 1;
  }

  /* Perfil (quién es) × contexto (qué día): ambos escalan la misma cadena. */
  function aplicarMult() {
    if (!V.fisio || !V.fisio.setMult) return;
    const p = perfilMult();
    const m = modMult();
    V.fisio.setMult({
      ka: (p.ka || 1) * m.ka,
      cmax: (p.cmax || 1) * m.cmax,
      ec50: (p.ec50 || 1) * m.ec50,
    });
    avisar();
  }

  function setVel(v) {
    estado.vel = v;
    if (V.ui) V.ui.pintar(true);
  }

  function avisar() {
    if (V.ui) V.ui.pintar(true);
    if (V.red) V.red.sincronizar();
    if (V.curvas) V.curvas.sincronizar();
  }

  function seleccionada(id) {
    return estado.sel.indexOf(id) !== -1;
  }

  function alternarRed(id) {
    if (!id) return;
    const i = estado.sel.indexOf(id);
    if (i === -1) estado.sel.push(id);
    else estado.sel.splice(i, 1);
    avisar();
  }

  function elegirRedes(ids) {
    estado.sel = (ids || []).slice();
    avisar();
  }

  function elegirCurva(k) {
    estado.curva = estado.curva === k ? null : k || null;
    avisar();
  }

  /* Tres ventanas a la misma corrida: el mapa del cerebro, lo que se ve con
     los ojos cerrados (geometría) y lo que se ve con los ojos abiertos (el
     mundo deformándose), que aparece bastante más arriba en dosis. */
  const VISTAS = ["cerebro", "cerrados", "abiertos"];

  function setVista(v) {
    const q = v === "ojos" ? "cerrados" : v;
    estado.vista = VISTAS.indexOf(q) === -1 ? "cerebro" : q;
    if (V.vision) V.vision.activar(estado.vista !== "cerebro", estado.vista);
    avisar();
  }

  function limpiar() {
    estado.sel = [];
    estado.curva = null;
    avisar();
  }

  /* Cambiar cepa o gramos recalcula todo el motor: las curvas son otras. */
  function setDosis(gramos, cepaId) {
    if (gramos != null) estado.gramos = gramos;
    if (cepaId != null) estado.cepaId = cepaId;
    if (V.cepas && V.fisio) {
      V.fisio.setDosis(V.cepas.mgEquiv(estado.gramos, estado.cepaId));
    }
    avisar();
  }

  function setPerfil(id) {
    if (!id || estado.perfil === id) return;
    estado.perfil = id;
    aplicarMult();
  }

  function setModulador(k, v) {
    if (!MODULADORES[k] || !MODULADORES[k].opciones[v]) return;
    if (estado.moduladores[k] === v) return;
    estado.moduladores[k] = v;
    aplicarMult();
  }

  function toggleCohorte() {
    estado.cohorte = !estado.cohorte;
    avisar();
  }

  function caudalRed(id) {
    const sala = SALAS[estado.sala] || SALAS.alineada;
    let g = (sala.pesos && sala.pesos[id]) || 1;
    if (estado.sala === "desfasada" && V.fisio) {
      const t = estado.t;
      const ahora = V.fisio.fEntropia(t);
      const tarde = V.fisio.fEntropia(Math.max(0, t - (sala.delayMin || 90)));
      const mix = 0.4 * ahora + 0.6 * tarde;
      g = 0.55 + ((sala.pesos && sala.pesos[id]) || 1) * mix * 0.7;
    }
    const ancla = V.casa && V.casa.ancla && V.casa.ancla();
    if (ancla === id) g *= 1.22;
    return g;
  }

  function focoSala() {
    const ancla = V.casa && V.casa.ancla && V.casa.ancla();
    const sala = estado.sala || "alineada";
    if (sala === "desfasada") return 0.72;
    if (sala === "alineada" && (ancla === "dmn" || ancla === "vis")) return 1.14;
    if (sala === "silencio" && (ancla === "sal" || ancla === "lim")) return 1.14;
    return 0.88;
  }

  function setSala(id) {
    if (!SALAS[id] || estado.sala === id) return;
    estado.sala = id;
    avisar();
  }

  function setSesion(n) {
    const s = n === 2 ? 2 : 1;
    if (estado.sesion === s) return;
    if (s === 2) {
      const bland = V.casa && V.casa.heredar ? V.casa.heredar() : 0;
      if (V.fisio && V.fisio.setBlandura) V.fisio.setBlandura(bland);
      estado.sesion = 2;
      estado.dosisInfo = true;
    } else {
      if (V.casa && V.casa.restaurar) V.casa.restaurar();
      if (V.fisio && V.fisio.setBlandura) V.fisio.setBlandura(0);
      estado.sesion = 1;
    }
    avisar();
  }

  function irA(t) {
    const F = V.fisio;
    estado.t = Math.max(0, Math.min(F.T_MAX, t));
    estado.target = null;
  }

  function irSuave(t) {
    const F = V.fisio;
    estado.target = Math.max(0, Math.min(F.T_MAX, t));
  }

  function togglePlay() {
    const F = V.fisio;
    estado.play = !estado.play;
    estado.target = null;
    if (estado.play && estado.t >= F.T_MAX - 0.5) irA(0);
    estado.last = 0;
  }

  function tick(now) {
    const F = V.fisio;
    if (!estado.last) estado.last = now;
    const dt = Math.min(0.05, (now - estado.last) / 1000);
    estado.last = now;

    if (estado.target != null) {
      const d = estado.target - estado.t;
      if (Math.abs(d) < 4) {
        estado.t = estado.target;
        estado.target = null;
      } else {
        estado.t += d * Math.min(1, dt * 5.5);
      }
    } else if (estado.play) {
      irA(estado.t + F.velocidad(estado.t) * dt * estado.vel);
      if (estado.t >= F.T_MAX) {
        estado.t = F.T_MAX;
        estado.play = false;
      }
    }

    if (V.ui) V.ui.pintar();
    if (V.curvas) V.curvas.pintar();
    if (V.red) V.red.pintar(dt);
    if (V.vision) V.vision.pintar(dt);
    if (V.casa) V.casa.pintar();
    requestAnimationFrame(tick);
  }

  function arrancar() {
    estado.last = 0;
    requestAnimationFrame(tick);
  }

  V.estado = estado;
  V.MODULADORES = MODULADORES;
  V.SALAS = SALAS;
  V.irA = irA;
  V.irSuave = irSuave;
  V.seleccionada = seleccionada;
  V.alternarRed = alternarRed;
  V.elegirRedes = elegirRedes;
  V.elegirCurva = elegirCurva;
  V.limpiar = limpiar;
  V.setDosis = setDosis;
  V.setPerfil = setPerfil;
  V.setModulador = setModulador;
  V.setSala = setSala;
  V.setSesion = setSesion;
  V.caudalRed = caudalRed;
  V.focoSala = focoSala;
  V.toggleCohorte = toggleCohorte;
  V.modMult = modMult;
  V.modAlterado = modAlterado;
  V.perfilMult = perfilMult;
  V.setVel = setVel;
  V.setVista = setVista;
  V.VELS = VELS;
  V.togglePlay = togglePlay;
  V.arrancar = arrancar;
})(window);
