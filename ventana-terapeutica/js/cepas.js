/* Cepas y dosis.
   Los porcentajes son promedios de literatura sobre peso SECO (Gartz 1994,
   Stamets 1996, Bigwood & Beug 1982 y análisis posteriores). La variación real
   entre ejemplares, flushes y condiciones de cultivo llega a 2–3×, así que
   esto sirve para entender órdenes de magnitud, no para dosificar.

   Equivalencia molar psilocibina → psilocina: 204.25 / 284.25 = 0.719.
   Se expresa todo en "mg equivalentes de psilocibina" para poder compararlo
   con los ensayos clínicos, que dosifican psilocibina pura (10 mg = dosis
   media, 25 mg = dosis alta). */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const CONV = 0.719;

  const CEPAS = [
    {
      id: "cubensis",
      nombre: "P. cubensis (promedio)",
      corto: "Cubensis",
      psi: 0.63,
      psn: 0.11,
      rango: "0,4 – 1,0 %",
      nota:
        "La referencia de casi todo lo que se dice sobre dosis. Es la especie de cultivo más común y la que sostiene la regla de «3,5 g secos ≈ 25 mg».",
    },
    {
      id: "golden",
      nombre: "P. cubensis «Golden Teacher»",
      corto: "Golden Teacher",
      psi: 0.6,
      psn: 0.1,
      rango: "0,4 – 0,9 %",
      nota:
        "Variedad de cubensis, no especie aparte. Su fama de suave y didáctica es cultural: químicamente está en el promedio. Entre dos flushes del mismo cultivo hay más diferencia que entre variedades.",
    },
    {
      id: "penis",
      nombre: "P. cubensis «Penis Envy»",
      corto: "Penis Envy",
      psi: 1.3,
      psn: 0.2,
      rango: "0,9 – 1,9 %",
      nota:
        "La variedad de cubensis con reputación de 2–3× el promedio, y los análisis disponibles la respaldan aunque son pocos. La trampa es dosificarla como si fuera cubensis común.",
    },
    {
      id: "natalensis",
      nombre: "P. natalensis",
      corto: "Natalensis",
      psi: 0.85,
      psn: 0.15,
      rango: "0,6 – 1,8 % de alcaloides totales",
      nota:
        "Sudafricana, pariente cercana de cubensis, con perfil de alcaloides parecido pero más variable y en promedio algo más potente. Los datos cuantitativos publicados son escasos: tomá este número como estimación.",
    },
    {
      id: "semilanceata",
      nombre: "P. semilanceata",
      corto: "Semilanceata",
      psi: 0.98,
      psn: 0.02,
      rango: "0,2 – 2,4 %",
      nota:
        "El «mongui» europeo. Casi toda su carga es psilocibina, con muy poca psilocina libre. Silvestre y chiquita: se dosifica por unidades y por eso el error es fácil.",
    },
    {
      id: "azurescens",
      nombre: "P. azurescens",
      corto: "Azurescens",
      psi: 1.78,
      psn: 0.38,
      rango: "1,1 – 1,8 %",
      nota:
        "La más potente descrita hasta ahora. Casi 3× cubensis: la misma cantidad en gramos es otra experiencia por completo. Se le asocia además parálisis temporal de miembros (wood lover paralysis).",
    },
    {
      id: "cyanescens",
      nombre: "P. cyanescens",
      corto: "Cyanescens",
      psi: 0.85,
      psn: 0.36,
      rango: "0,4 – 2,0 %",
      nota:
        "Silvestre, de astilla de madera, muy variable. Su alta proporción de psilocina libre suele leerse como un inicio más rápido.",
    },
    {
      id: "mexicana",
      nombre: "P. mexicana",
      corto: "Mexicana",
      psi: 0.25,
      psn: 0.05,
      rango: "0,2 – 0,6 %",
      nota:
        "La de las veladas de María Sabina y la que Hofmann usó para aislar la psilocibina en 1958. Suave en peso: hace falta bastante más gramaje para llegar al mismo lugar.",
    },
    {
      id: "tampanensis",
      nombre: "P. tampanensis (esclerocios)",
      corto: "Tampanensis",
      psi: 0.31,
      psn: 0.05,
      rango: "0,2 – 0,7 %",
      nota:
        "Las «piedras filosofales». Los esclerocios rinden menos que el hongo entero, y son el formato legal en Países Bajos: por eso las dosis de los retiros parecen tan altas en gramos.",
    },
    {
      id: "baeocystis",
      nombre: "P. baeocystis",
      corto: "Baeocystis",
      psi: 0.85,
      psn: 0.59,
      rango: "0,2 – 0,9 %",
      nota:
        "Notable por su psilocina libre altísima y por dar nombre a la baeocistina. Se degrada rápido: el material viejo pierde bastante.",
    },
  ];

  /* Bandas por mg equivalentes de psilocibina, no por gramos: el gramaje solo
     significa algo una vez que sabés qué cepa es. */
  const BANDAS = [
    {
      id: "micro",
      nombre: "Microdosis",
      hasta: 3,
      texto:
        "Sub-perceptual por definición: si se nota, ya no es microdosis. Los receptores se ocupan un poco, pero la experiencia no cambia y el material emocional no se abre.",
      alerta:
        "La evidencia humana de que la microdosis deje plasticidad sostenida es floja: los ensayos con placebo activo en general no la separan del placebo. Acá se dibuja chiquita a propósito.",
    },
    {
      id: "baja",
      nombre: "Dosis baja",
      hasta: 9,
      texto:
        "El nivel «de museo». Colores más vivos, pensamiento más suelto, cuerpo presente. Se puede sostener una conversación y decidir cosas. Los priors aflojan apenas.",
      alerta: "",
    },
    {
      id: "moderada",
      nombre: "Dosis moderada",
      hasta: 18,
      texto:
        "Territorio clínico bajo (los ensayos usan 10 mg como comparador activo). Hay viaje, hay material, y todavía queda volante para hablar de lo que pasa mientras pasa.",
      alerta: "",
    },
    {
      id: "alta",
      nombre: "Dosis alta",
      hasta: 32,
      texto:
        "El rango de los ensayos de depresión: 25 mg. Acá aparecen la disolución del yo y las experiencias tipo místicas, que son las que mejor predicen la mejoría clínica. También es donde el acompañamiento deja de ser opcional.",
      alerta: "",
    },
    {
      id: "muyalta",
      nombre: "Dosis muy alta",
      hasta: 55,
      texto:
        "Más allá del rango estudiado. La ocupación de receptores ya está casi al tope, así que lo que crece no es tanto la intensidad como la duración y la probabilidad de pasarla mal.",
      alerta:
        "Los receptores se saturan: duplicar los gramos no duplica la experiencia. Lo que se duplica es el tiempo adentro y el riesgo de reacción aguda.",
    },
    {
      id: "extrema",
      nombre: "Dosis extrema",
      hasta: 150,
      texto:
        "El territorio de «cinco gramos secos en silencio y oscuridad» de McKenna. No hay datos clínicos acá: es folclore psiconáutico, no protocolo. El techo de lo estudiado en humanos son 30 mg/70 kg (Griffiths y col.), y ya ahí las experiencias psicológicamente difíciles son bastante más frecuentes que con 20 mg.",
      alerta:
        "Sin datos de ensayos. La curva de ocupación está planchada: el efecto extra es duración y probabilidad de pasarla mal, no profundidad.",
    },
    {
      id: "masalla",
      nombre: "Más allá de todo lo descrito",
      hasta: Infinity,
      texto:
        "En la práctica real nadie pasa de unos 8 g secos, y el tramo de acá para arriba existe por una sola razón: para ver qué NO pasa. La ocupación de receptores casi no se mueve. Multiplicar la dosis por catorce agrega unos pocos puntos de ocupación y casi el doble de horas adentro. No hay literatura de ningún tipo acá: ni ensayos, ni protocolo, ni relatos sistematizados.",
      alerta:
        "El límite acá no es la toxicidad del cuerpo sino la psiquis. La psilocibina tiene uno de los índices terapéuticos más altos que se midieron (~1:1000, Gable 2004): extrapolando la LD50 de roedores (280 mg/kg) a 70 kg darían ~19,6 g de psilocibina pura, o sea del orden de 3 kg de hongo seco — imposible de comer. Lo que sí escala con la dosis es la reacción aguda de pánico, el riesgo por conducta, y las horas de exposición.",
    },
  ];

  const POR_ID = {};
  CEPAS.forEach(function (c) {
    POR_ID[c.id] = c;
  });

  function de(id) {
    return POR_ID[id] || CEPAS[0];
  }

  /* Gramos secos + cepa → mg equivalentes de psilocibina. */
  function mgEquiv(gramos, cepaId) {
    const c = de(cepaId);
    const mgPsi = gramos * 10 * c.psi;
    const mgPsn = gramos * 10 * c.psn;
    return mgPsi + mgPsn / CONV;
  }

  /* Cuántos gramos de esta cepa hacen falta para llegar a X mg. */
  function gramosPara(mg, cepaId) {
    const porGramo = mgEquiv(1, cepaId);
    return porGramo > 0 ? mg / porGramo : 0;
  }

  function banda(mg) {
    for (let i = 0; i < BANDAS.length; i++) {
      if (mg < BANDAS[i].hasta) return BANDAS[i];
    }
    return BANDAS[BANDAS.length - 1];
  }

  /* Slider exponencial: hace falta resolución fina abajo (microdosis) y
     gruesa arriba. u ∈ [0,1] → gramos ∈ [0.05, 50].
     El techo son 50 g secos: ninguna práctica real llega ahí, y justamente por
     eso sirve — es donde se ve que la curva de ocupación ya no sube. */
  const G_MIN = 0.05;
  const G_MAX = 50;

  function sliderAGramos(u) {
    const x = Math.max(0, Math.min(1, u));
    return G_MIN * Math.pow(G_MAX / G_MIN, x);
  }

  function gramosASlider(gr) {
    const x = Math.max(G_MIN, Math.min(G_MAX, gr));
    return Math.log(x / G_MIN) / Math.log(G_MAX / G_MIN);
  }

  function leerGramos(gr) {
    if (gr < 1) return gr.toFixed(2).replace(".", ",") + " g";
    return gr.toFixed(1).replace(".", ",") + " g";
  }

  V.cepas = {
    lista: CEPAS,
    bandas: BANDAS,
    de: de,
    mgEquiv: mgEquiv,
    gramosPara: gramosPara,
    banda: banda,
    sliderAGramos: sliderAGramos,
    gramosASlider: gramosASlider,
    leerGramos: leerGramos,
    G_MIN: G_MIN,
    G_MAX: G_MAX,
  };
})(window);
