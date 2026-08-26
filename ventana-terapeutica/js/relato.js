/* Modo relato: la columna vertebral.

   El simulador solo tenía superficies simultáneas y ningún orden de lectura.
   Acá hay una secuencia: cada paso mueve el tiempo, prende las redes que
   importan, resalta una curva y dice UNA cosa. Después se sale a explorar,
   que es todo lo demás que ya existe. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const PASOS = [
    {
      id: "mapa",
      t: 0,
      redes: [],
      curva: null,
      dosis: { gramos: 3.5, cepaId: "cubensis" },
      titulo: "Esto es un cerebro visto de costado",
      texto:
        "El frente está a la izquierda, la nuca a la derecha. Abajo y atrás, el cerebelo. Adentro laten cinco redes: grupos de zonas que se encienden juntas. Todavía no pasó nada — esta es la línea de base.",
    },
    {
      id: "quien",
      t: 0,
      redes: ["dmn", "ejec", "sal", "vis", "lim"],
      curva: null,
      titulo: "Quién es quién",
      texto:
        "El <b>narrador</b> arma la historia de quién sos. El <b>volante</b> dirige la atención. El <b>portero</b> decide qué importa. El <b>proyector</b> construye lo que ves. La <b>emoción</b> le pone color y memoria. Cada una tiene dos puntas unidas por un cable: así funcionan.",
    },
    {
      id: "molecula",
      t: 38,
      redes: [],
      curva: "psilo",
      titulo: "Entra la molécula",
      texto:
        "La psilocina ocupa receptores de serotonina 2A en la corteza. Mirá la curva violeta: sube rápido. Todavía no es el viaje, es la puerta. Y ojo con esto, porque después vuelve: los receptores <b>se saturan</b>.",
    },
    {
      id: "afloja",
      t: 110,
      redes: ["dmn", "ejec"],
      curva: "entropia",
      titulo: "Se afloja el yo",
      texto:
        "En el pico, el narrador se desintegra: sus dos puntas dejan de estar sincronizadas y la historia rígida pierde autoridad. El volante suelta un poco. La <b>entropía</b> está en su máximo — el cerebro visita estados que en sobriedad no visita.",
    },
    {
      id: "vision",
      t: 110,
      redes: [],
      curva: null,
      vista: "cerrados",
      titulo: "Y esto es lo que se ve",
      texto:
        "Con los ojos cerrados aparece geometría, y siempre la misma: túneles, espirales, enrejados. Klüver las catalogó en 1926 y son cuatro, en cualquier cultura. El motivo es que la corteza visual ve el mundo en coordenadas <b>log-polares</b>, y cuando se pone a oscilar sola, una onda simple atravesando ese mapa <b>es</b> un túnel o una espiral. Lo que ves es la forma de tu propia corteza. Movete la dosis en la barra de arriba y mirá cómo cambia — con microdosis no aparece nada.",
    },
    {
      id: "emocional",
      t: 115,
      redes: ["sal", "lim"],
      curva: "priors",
      titulo: "Y se abre lo emocional",
      texto:
        "El portero sube la ganancia y todo parece importante. La emoción llega con cuerpo: escenas viejas vuelven a estar disponibles. Mirá cómo los <b>priors</b> tocan su mínimo — es el momento en que una creencia sobre uno mismo puede ser revisada.",
    },
    {
      id: "baja",
      t: 300,
      redes: [],
      curva: "psilo",
      titulo: "La molécula se va",
      texto:
        "Tres a seis horas. La ocupación cae, las redes se reordenan. Acá se cosecha: poner en palabras simples lo que pasó, sin forzar el cierre. Para muchos, la sesión termina acá. Pero la parte que cura recién empieza.",
    },
    {
      id: "ventana",
      t: 4320,
      redes: [],
      curva: "plasticidad",
      titulo: "Esta es la ventana",
      texto:
        "Día 3. La molécula hace rato que no está: la curva violeta está en cero. Y sin embargo la <b>plasticidad</b> sigue arriba. Ese hueco entre las dos curvas, que dura días, es todo el asunto: el cerebro acepta reescritura con menos resistencia. Terapia, hábitos, vínculo. El viaje fue la llave; esto es la casa.",
    },
    {
      id: "dosis",
      t: 110,
      redes: [],
      curva: "psilo",
      dosis: { gramos: 0.15, cepaId: "cubensis" },
      titulo: "Por qué la microdosis no abre la ventana",
      texto:
        "Misma cepa, 0,15 g en vez de 3,5. La ocupación de receptores llega al 24 % y ahí se queda: no alcanza el umbral. Entropía en cero, priors intactos, plasticidad casi sin moverse. Los receptores se saturan rápido, y por debajo del umbral no hay ventana que abrir.",
    },
    {
      id: "cepa",
      t: 110,
      redes: [],
      curva: "psilo",
      dosis: { gramos: 3.5, cepaId: "azurescens" },
      titulo: "Y por qué «3,5 gramos» no quiere decir nada",
      texto:
        "Mismos 3,5 gramos, pero de <i>P. azurescens</i>: 81 mg en vez de 27. Tres veces la dosis clínica. Sin saber la cepa, el gramaje no informa nada. Probá el atajo «clínica» de la barra de arriba cambiando de cepa: los miligramos quedan fijos y los gramos se recalculan solos.",
    },
  ];

  let i = -1;
  let panel, cuerpo, puntos, btnPrev, btnNext, btnSalir;

  function activo() {
    return i >= 0;
  }

  function montar() {
    panel = document.getElementById("relato");
    if (!panel) return;
    panel.innerHTML =
      '<div class="rl-cab">' +
      '<span class="rl-paso"></span>' +
      '<button type="button" class="rl-salir">explorar libre ✕</button>' +
      "</div>" +
      '<div class="rl-cuerpo"></div>' +
      '<div class="rl-pie">' +
      '<button type="button" class="rl-prev">‹ atrás</button>' +
      '<div class="rl-puntos"></div>' +
      '<button type="button" class="rl-next">siguiente ›</button>' +
      "</div>";

    cuerpo = panel.querySelector(".rl-cuerpo");
    puntos = panel.querySelector(".rl-puntos");
    btnPrev = panel.querySelector(".rl-prev");
    btnNext = panel.querySelector(".rl-next");
    btnSalir = panel.querySelector(".rl-salir");

    puntos.innerHTML = PASOS.map(function (_p, k) {
      return '<button type="button" class="rl-punto" data-k="' + k + '"></button>';
    }).join("");
    puntos.querySelectorAll(".rl-punto").forEach(function (b) {
      b.addEventListener("click", function () {
        ir(Number(b.dataset.k));
      });
    });

    btnPrev.addEventListener("click", function () { ir(i - 1); });
    btnNext.addEventListener("click", function () { ir(i + 1); });
    btnSalir.addEventListener("click", salir);

    const abrir = document.getElementById("btnRelato");
    if (abrir) abrir.addEventListener("click", entrar);

    document.addEventListener("keydown", function (ev) {
      if (!activo()) return;
      if (ev.key === "ArrowRight") ir(i + 1);
      else if (ev.key === "ArrowLeft") ir(i - 1);
      else if (ev.key === "Escape") salir();
    });
  }

  function aplicar(p) {
    if (V.estado.play) V.togglePlay();
    if (p.dosis) V.setDosis(p.dosis.gramos, p.dosis.cepaId);
    if (V.setVista) V.setVista(p.vista || "cerebro");
    V.estado.curva = p.curva || null;
    V.estado.dosisInfo = false;
    V.elegirRedes(p.redes || []);
    V.irSuave(p.t);
    if (V.ui) V.ui.pintar(true);
  }

  function pintar() {
    const p = PASOS[i];
    if (!p) return;
    panel.querySelector(".rl-paso").textContent = i + 1 + " de " + PASOS.length;
    cuerpo.innerHTML = "<h3>" + p.titulo + "</h3><p>" + p.texto + "</p>";
    btnPrev.disabled = i === 0;
    btnNext.textContent = i === PASOS.length - 1 ? "explorar libre ›" : "siguiente ›";
    puntos.querySelectorAll(".rl-punto").forEach(function (b, k) {
      b.classList.toggle("on", k === i);
      b.classList.toggle("visto", k < i);
    });
  }

  function ir(k) {
    if (k < 0) return;
    if (k >= PASOS.length) {
      salir();
      return;
    }
    i = k;
    aplicar(PASOS[i]);
    pintar();
  }

  function entrar() {
    if (!panel) return;
    if (V.casa && V.casa.activo && V.casa.activo()) V.casa.salir();
    document.body.classList.add("en-relato");
    panel.hidden = false;
    ir(0);
  }

  function salir() {
    i = -1;
    document.body.classList.remove("en-relato");
    if (panel) panel.hidden = true;
    if (V.ui) V.ui.pintar(true);
  }

  V.relato = { montar: montar, entrar: entrar, salir: salir, ir: ir, activo: activo, pasos: PASOS };
})(window);
