(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const FASES = [
    {
      id: "base",
      nombre: "Línea de base",
      kicker: "antes de la dosis",
      desde: 0,
      ancla: 0,
      cuerpo:
        "El default mode anda cerrado, como una habitación que ya conoce de memoria. Los priors están firmes: el mundo se predice más de lo que se mira. Todavía no pasó nada — y por eso se ve tan nítido lo que después se desarma.",
    },
    {
      id: "umbral",
      nombre: "Umbral",
      kicker: "20 – 40 min",
      desde: 20,
      ancla: 30,
      cuerpo:
        "La psilocina empieza a ocupar receptores 5-HT2A. No es el viaje: es la puerta. Un calor atrás de los ojos, el cuerpo un poco más ancho. La red de saliencia se asoma y pregunta, por primera vez en el día, si esto que está pasando importa.",
    },
    {
      id: "ascenso",
      nombre: "Ascenso",
      kicker: "40 – 90 min",
      desde: 40,
      ancla: 65,
      cuerpo:
        "Las curvas se empinan. La entropía cerebral va unos minutos atrás de la molécula, como una marea que llega tarde. Los priors empiezan a aflojar: lo familiar se vuelve poroso. La ejecutiva suelta el volante un toque, no del todo.",
    },
    {
      id: "pico",
      nombre: "Pico",
      kicker: "90 – 160 min",
      desde: 90,
      ancla: 110,
      cuerpo:
        "Acá el grafo se vuelve un coral. DMN, ejecutiva y saliencia se cruzan como no deberían. La psilocina está en el pico, la entropía también. Es el momento en que una frase, una imagen o un silencio pueden reescribir el mapa.",
    },
    {
      id: "descenso",
      nombre: "Descenso",
      kicker: "3 – 6 h",
      desde: 180,
      ancla: 240,
      cuerpo:
        "La molécula se va. Lo que no se va es la porosidad. La red se reordena, más lenta, más honesta. Acá se cosecha: no se empuja. El cuerpo pide agua, el cerebro pide sentido.",
    },
    {
      id: "ventana",
      nombre: "Ventana",
      kicker: "día 1 – 14",
      desde: 480,
      ancla: 4320,
      cuerpo:
        "Nardou 2023: la plasticidad crítica se queda abierta días después de que la psilocina ya no está. Los priors siguen blandos. Es el tramo terapéutico de verdad — terapia, hábitos, vínculo. El viaje fue la llave; esto es la casa.",
    },
  ];

  function faseEn(t) {
    let actual = FASES[0];
    for (let i = 0; i < FASES.length; i++) {
      if (t >= FASES[i].desde) actual = FASES[i];
    }
    return actual;
  }

  V.fases = { lista: FASES, en: faseEn };
})(window);
