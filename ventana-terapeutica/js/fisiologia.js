/* Motor fisiológico. t = minutos desde la dosis.

   Cadena del modelo:
     dosis (mg equivalentes de psilocibina)
       → psilocina en plasma (µg/L, absorción/eliminación tipo Bateman)
       → ocupación de receptores 5-HT2A (modelo de sitio único, saturable)
       → intensidad subjetiva (umbral: ocupar receptores no alcanza)
       → entropía, priors (REBUS) y plasticidad (Nardou 2023).

   Constantes con fuente:
     EC50 psilocina plasmática para ocupación 5-HT2A = 1,97 µg/L y ocupación
     máxima ≈ 76,6 % (Madsen et al. 2019, Neuropsychopharmacology; replicado
     con 1,96 µg/L en trabajos posteriores). Ese modelo reproduce el techo
     observado de ~72 % de ocupación con las dosis más altas ensayadas.

     Cmax de psilocina ≈ 0,76 µg/L por mg de psilocibina oral: calibrado para
     que 25 mg (la dosis de los ensayos de depresión) den ~19 µg/L y ~69 % de
     ocupación, que es lo que se reporta.

   Es un modelo docente, no una calculadora de dosificación. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const T_HALF = 1.9 * 60;
  const T_SESION = 8 * 60;
  const T_MAX = 14 * 24 * 60;
  const KA = 0.038;
  const KE = Math.LN2 / T_HALF;

  const EC50 = 1.97;
  const OCC_MAX = 0.766;
  const UGL_POR_MG = 0.76;

  /* Ocupar receptores no basta para que haya experiencia: por debajo de ~30 %
     la persona no nota nada (es lo que pasa con la microdosis). */
  const OCC_UMBRAL = 0.3;
  const OCC_PLENO = 0.72;

  /* Umbral de "todavía se nota algo", para estimar duración. Mide efecto
     perceptible incluyendo la cola, no el núcleo de la experiencia, que es
     bastante más corto. */
  const UGL_PERCEPTIBLE = 2.2;

  /* Ojos ABIERTOS. No es lo mismo que ver geometría con los ojos cerrados:
     los CEV aparecen bastante antes, y recién pasando cierta dosis el efecto
     sale al mundo — superficies que respiran, patrones sobre las cosas. Por
     eso tiene su propio umbral, más alto, sobre la ocupación de receptores.

     Calibrado de campo: asoma a los 2 g y está pleno a los 3,5 g, tomando
     cubensis como referencia — que es lo que quiere decir "gramos" cuando no
     se aclara la cepa. En mg eso es 16 y 27.

     Y acá se ve por qué el umbral NO puede vivir en gramos: con estos mismos
     mg, 3 g de una cepa potente (Penis Envy, 47 mg) ya caen del lado pleno,
     que es exactamente lo que se reporta. La escala está en mg y de ahí en
     ocupación; los gramos salen solos según la cepa. */
  const OCC_OEV_INI = 0.658;    // ~16 mg = 2 g de cubensis: recién asoma
  const OCC_OEV_PLENO = 0.700;  // ~27 mg = 3,5 g de cubensis: pleno

  /* Presencias / entes. Aparecen bastante más arriba que los OEV: es de los
     efectos que más consistentemente se reportan recién en dosis altas.
     Umbral en ~28 mg (unos 4 g de cubensis, o 2 g de una cepa potente) y
     pleno cerca de 60 mg. */
  const OCC_ENT_INI = 0.700;
  const OCC_ENT_PLENO = 0.734;

  /* ── Persona y contexto ──────────────────────────────────────

     El modelo hablaba de UN cuerpo: una exposición, una sensibilidad. La
     cohorte (la misma dosis, cien personas) y los moduladores (el mismo
     gramo, otro día) necesitan multiplicadores. La cadena entera se arma
     por persona en crearCadena: mismas fórmulas, parámetros escalados.
     MULT_BASE es la calibración de siempre — con multiplicadores en 1 el
     resultado es bit a bit el de la versión original (verificado contra
     scripts/fisio_golden.json).

     Convención del Cmax: la concentración se normaliza para que a los 100
     minutos valga exactamente cmax, con el Ka de esa persona. UGL_POR_MG
     está calibrado así para el Ka base. */
  const MULT_BASE = { ka: 1, cmax: 1, ec50: 1 };
  let mult = { ka: 1, cmax: 1, ec50: 1 };
  let blandura = 0;

  let dosisMg = 27.4;
  let yo = null;
  let iPico = 0;
  let duracion = 0;

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function bateman(t, ka) {
    if (t <= 0) return 0;
    return (ka / (ka - KE)) * (Math.exp(-KE * t) - Math.exp(-ka * t));
  }

  /* La cadena entera para una persona: mg + multiplicadores {ka, cmax, ec50}.
     Devuelve funciones cerradas. Los umbrales subjetivos NO se escalan:
     la sensibilidad de la persona entra por EC50 (llega a los mismos
     umbrales con menos molécula), que es donde la farmacología la pone. */
  function crearCadena(mg, m) {
    const mm = m || MULT_BASE;
    const ka = KA * (mm.ka || 1);
    const cmax = UGL_POR_MG * (mm.cmax || 1) * Math.max(0, mg || 0);
    const ec50 = EC50 * (mm.ec50 || 1);
    const den = bateman(100, ka);

    /* Psilocina en plasma, µg/L. */
    const conc = function (t) {
      if (t <= 0) return 0;
      return (bateman(t, ka) / den) * cmax;
    };

    /* Ocupación de receptores 5-HT2A, 0–1 (techo real ~0,766). */
    const psilo = function (t) {
      const c = conc(t);
      return (OCC_MAX * c) / (c + ec50);
    };

    /* Intensidad subjetiva: cuánto de eso se siente. */
    const intensidad = function (t) {
      return clamp((psilo(t) - OCC_UMBRAL) / (OCC_PLENO - OCC_UMBRAL), 0, 1);
    };

    const abiertos = function (t) {
      return clamp((psilo(t) - OCC_OEV_INI) / (OCC_OEV_PLENO - OCC_OEV_INI), 0, 1);
    };

    const entes = function (t) {
      return clamp((psilo(t) - OCC_ENT_INI) / (OCC_ENT_PLENO - OCC_ENT_INI), 0, 1);
    };

    const entropia = function (t) {
      const lag = 18;
      const base = intensidad(Math.max(0, t - lag));
      const ancho = intensidad(Math.max(0, t - 8)) * 0.2;
      const subida = t < 16 ? t / 16 : 1;
      return clamp(base * 0.9 + ancho, 0, 1) * subida;
    };

    /* Pico de intensidad y cola perceptible de ESTA persona: la ventana no
       dura lo mismo si la dosis fue mínima. */
    let pico = 0;
    let ultimo = 0;
    // Se escanea más allá de las 8 h de la sesión: con dosis muy altas la cola
    // se estira, y cortar en T_SESION haría que todas midan lo mismo.
    for (let t = 0; t <= 960; t += 2) {
      const i = intensidad(t);
      if (i > pico) pico = i;
      if (conc(t) >= UGL_PERCEPTIBLE) ultimo = t;
    }
    const iPicoP = pico;

    const plasticidad = function (t) {
      const d = t / 1440;
      const semilla = 0.03 + 0.1 * intensidad(t);
      const sube = 1 / (1 + Math.exp(-2.1 * (d - 0.72)));
      // La ventana no dura lo mismo si la dosis fue mínima.
      const dias = 2 + 12 * iPicoP;
      const meseta = d > dias ? Math.exp(-(d - dias) / 7.5) : 1;
      return clamp(semilla + 0.86 * iPicoP * sube, 0, 1) * meseta;
    };

    const bland = clamp(mm.blandura || 0, 0, 1);
    const priors = function (t) {
      const ent = entropia(t);
      const d = t / 1440;
      const agudo = 1 - 0.74 * Math.pow(ent, 0.85);
      const blando = 1 - 0.22 * plasticidad(t);
      const mezcla = d < 0.35 ? agudo : agudo * 0.25 + blando * 0.75;
      const p = clamp(mezcla, 0.14, 1);
      if (!bland) return p;
      // Sesión 2: llega ya un poco abierta. No toca ocupación.
      const extra = 0.42 * bland;
      return clamp(p * (1 - extra) + 0.14 * extra, 0.14, 1);
    };

    return {
      conc: conc,
      psilo: psilo,
      intensidad: intensidad,
      abiertos: abiertos,
      entes: entes,
      entropia: entropia,
      plasticidad: plasticidad,
      priors: priors,
      iPico: iPicoP,
      duracion: ultimo,
      cmax: cmax,
      ec50: ec50,
    };
  }

  /* La persona actual: la del modelo (calibración base) escalada por el
     perfil de la cohorte y el contexto del día. */
  function fConc(t) { return yo.conc(t); }
  function fPsilo(t) { return yo.psilo(t); }
  function fIntensidad(t) { return yo.intensidad(t); }
  function fAbiertos(t) { return yo.abiertos(t); }
  function fEntes(t) { return yo.entes(t); }
  function fEntropia(t) { return yo.entropia(t); }
  function fPlasticidad(t) { return yo.plasticidad(t); }
  function fPriors(t) { return yo.priors(t); }

  function snapshot(t) {
    return {
      t: t,
      psilo: yo.psilo(t),
      entropia: yo.entropia(t),
      plasticidad: yo.plasticidad(t),
      priors: yo.priors(t),
    };
  }

  /* Recalcula lo que depende de la dosis y del contexto. */
  function recalcular() {
    yo = crearCadena(dosisMg, {
      ka: mult.ka,
      cmax: mult.cmax,
      ec50: mult.ec50,
      blandura: blandura,
    });
    iPico = yo.iPico;
    duracion = yo.duracion;
  }

  function setDosis(mg) {
    dosisMg = Math.max(0, mg || 0);
    recalcular();
  }

  function setMult(m) {
    mult = {
      ka: (m && m.ka) || 1,
      cmax: (m && m.cmax) || 1,
      ec50: (m && m.ec50) || 1,
    };
    recalcular();
  }

  function setBlandura(b) {
    blandura = clamp(b == null ? 0 : b, 0, 1);
    recalcular();
  }

  function sliderATiempo(u) {
    const x = clamp(u, 0, 1);
    if (x <= 0.55) return (x / 0.55) * T_SESION;
    return T_SESION + ((x - 0.55) / 0.45) * (T_MAX - T_SESION);
  }

  function tiempoASlider(t) {
    const x = clamp(t, 0, T_MAX);
    if (x <= T_SESION) return (x / T_SESION) * 0.55;
    return 0.55 + ((x - T_SESION) / (T_MAX - T_SESION)) * 0.45;
  }

  function leerTiempo(t) {
    if (t < 60) return Math.round(t) + " min";
    if (t < T_SESION) {
      const h = Math.floor(t / 60);
      const m = Math.round(t % 60);
      return m ? h + " h " + m + " min" : h + " h";
    }
    const d = t / 1440;
    if (d < 1.05) return "día 1";
    return "día " + Math.min(14, Math.round(d));
  }

  function leerDuracion() {
    if (duracion < 30) return "sin efecto perceptible";
    const h = Math.floor(duracion / 60);
    const m = Math.round((duracion % 60) / 15) * 15;
    if (m === 60) return h + 1 + " h";
    return m ? h + " h " + m : h + " h";
  }

  function velocidad(t) {
    return t < T_SESION ? 88 : 920;
  }

  recalcular();

  V.fisio = {
    T_SESION: T_SESION,
    T_MAX: T_MAX,
    fConc: fConc,
    fPsilo: fPsilo,
    fIntensidad: fIntensidad,
    fAbiertos: fAbiertos,
    fEntes: fEntes,
    fEntropia: fEntropia,
    fPlasticidad: fPlasticidad,
    fPriors: fPriors,
    snapshot: snapshot,
    setDosis: setDosis,
    setMult: setMult,
    setBlandura: setBlandura,
    /* Cadena suelta para quien la necesite: la cohorte corre 120 de estas,
       el gráfico dibuja la de referencia (sin moduladores) en punteado. */
    cadena: crearCadena,
    sliderATiempo: sliderATiempo,
    tiempoASlider: tiempoASlider,
    leerTiempo: leerTiempo,
    leerDuracion: leerDuracion,
    velocidad: velocidad,
    info: function () {
      return {
        mg: dosisMg,
        cmax: yo.cmax,
        ocupacionPico: yo.psilo(100),
        intensidadPico: iPico,
        duracionMin: duracion,
        diasVentana: 2 + 12 * iPico,
        mult: { ka: mult.ka, cmax: mult.cmax, ec50: mult.ec50 },
        blandura: blandura,
        alterado: mult.ka !== 1 || mult.cmax !== 1 || mult.ec50 !== 1,
      };
    },
  };
})(window);
