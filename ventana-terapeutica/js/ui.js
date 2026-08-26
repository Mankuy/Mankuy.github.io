(function (g) {
  const V = (g.Ventana = g.Ventana || {});
  const KEYS = ["psilo", "entropia", "plasticidad", "priors"];

  let btn, lectura, scrub, chips, panel, metricas, fichas, ayuda, dosis, velocidad;
  let dragging = false;
  let listo = false;
  let sigDosis = "";
  let faseVisible = "";

  /* Atajos por mg equivalentes: los gramos se recalculan según la cepa.
     Cambiar de cepa con un preset puesto es la mejor manera de ver que
     "3,5 g" no quiere decir nada sin saber de qué hongo se habla. */
  const PRESETS = [
    { mg: 1.5, nombre: "micro" },
    { mg: 6, nombre: "museo" },
    { mg: 25, nombre: "clínica" },
    { mg: 45, nombre: "heroica" },
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function montar() {
    btn = document.getElementById("btnPlay");
    lectura = document.getElementById("lecturaTiempo");
    scrub = document.getElementById("scrubber");
    chips = document.getElementById("chipsFase");
    panel = document.getElementById("panelFase");
    fichas = document.getElementById("fichas");
    metricas = document.getElementById("metricas");
    ayuda = document.getElementById("ayuda");

    if (btn) {
      btn.addEventListener("click", function () {
        V.togglePlay();
        syncPlay();
      });
    }

    if (scrub) {
      scrub.addEventListener("pointerdown", function () {
        dragging = true;
      });
      window.addEventListener("pointerup", function () {
        dragging = false;
      });
      scrub.addEventListener("input", function () {
        const u = Number(scrub.value) / 1000;
        V.irA(V.fisio.sliderATiempo(u));
      });
    }

    if (chips && V.fases) {
      chips.innerHTML = "";
      V.fases.lista.forEach(function (f) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.id = f.id;
        b.innerHTML =
          '<span class="ch-n">' + esc(f.nombre) + "</span>" +
          '<span class="ch-k">' + esc(f.kicker) + "</span>";
        b.addEventListener("click", function () {
          V.irSuave(f.ancla);
        });
        chips.appendChild(b);
      });
    }

    montarMetricas();
    montarDosis();
    montarVelocidad();
    montarVista();
    montarAyuda();

    listo = true;
    if (panel) panel.dataset.id = "";
    if (fichas) fichas.dataset.sig = "";
    pintar(true);
  }

  /* ── Métricas: son la leyenda de las curvas y también botones ── */

  function montarMetricas() {
    if (!metricas) return;
    const labels = (V.curvas && V.curvas.labels) || {};
    metricas.innerHTML =
      '<p class="met-titulo">qué está pasando ahora</p>' +
      KEYS.map(function (k) {
        const info = V.variables && V.variables.de(k);
        return (
          '<button type="button" class="met" data-k="' + k + '" title="' +
          esc(info ? info.apodo : "") + '">' +
          "<span>" + esc(labels[k] || k) + "</span>" +
          '<span class="bar"><i></i></span>' +
          "<em>0%</em>" +
          "</button>"
        );
      }).join("") +
      '<p class="met-pista">clic en una para que te la explique</p>';

    metricas.querySelectorAll(".met").forEach(function (el) {
      el.addEventListener("click", function () {
        if (V.elegirCurva) V.elegirCurva(el.dataset.k);
      });
    });
  }

  /* ── Cerebro / lo que se ve ──────────────────────────────── */

  function montarVista() {
    const caja = document.getElementById("vistaSwitch");
    if (!caja) return;
    if (V.vision && !V.vision.disponible()) {
      // Sin WebGL no hay simulación visual: se esconde en vez de dar un botón
      // que no hace nada.
      caja.hidden = true;
      return;
    }
    caja.querySelectorAll("button[data-vista]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.setVista) V.setVista(b.dataset.vista);
      });
    });
    const viaje = document.getElementById("btnViaje");
    if (viaje) {
      viaje.addEventListener("click", function () {
        if (V.vision && V.vision.nuevoViaje) V.vision.nuevoViaje();
        pintar(true);
      });
    }

    // Pantalla completa sobre el mapa.
    //
    // La API nativa no siempre está: adentro de la ventanita de Hydra el
    // navegador rechaza requestFullscreen con "Permissions check failed", y lo
    // hace por promesa — sin catch, el botón no hacía absolutamente nada y no
    // quedaba rastro en la consola. Por eso: catch obligatorio y plan B por
    // CSS (fixed + inset 0), que funciona en cualquier lado.
    //
    // Los canvas se miden con clientWidth, así que alcanza con avisarles que
    // cambió el tamaño. El fullscreen falso NO dispara "resize" solo.
    const full = document.getElementById("btnPantalla");
    const mapa = document.getElementById("mapa");
    if (full && mapa) {
      // Hay TRES maneras de estar en pantalla completa acá y hay que
      // reconocer las tres, o el botón no encuentra la salida: la nativa, la
      // clase que cuelga Pake, y el plan B por CSS de más abajo.
      const PAKE = "pake-fullscreen-element";
      const enPantalla = function () {
        return (
          document.fullscreenElement === mapa ||
          mapa.classList.contains("full-falso") ||
          mapa.classList.contains(PAKE)
        );
      };
      // Pake no se limita a poner una clase: MUEVE el nodo en el DOM, lo
      // cuelga del <body> para agrandarlo — y al salir no lo devuelve. Ahí el
      // mapa queda con el ancho de la ventana y el #rail se queda solo en
      // #escenario ocupando la primera columna del grid. Eso era el "sigue
      // roto" que ni limpiando la clase ni el style inline se arreglaba: no
      // había nada sucio que limpiar, el elemento estaba en otro lado.
      // Se guarda el lugar de origen apenas monta, que es la única foto
      // confiable del DOM sano.
      const hogar = { padre: mapa.parentNode, siguiente: mapa.nextSibling };
      const volverAlHogar = function () {
        if (enPantalla()) return;   // en pantalla completa tiene que estar donde Pake lo puso
        if (!hogar.padre || mapa.parentNode === hogar.padre) return;
        hogar.padre.insertBefore(mapa, hogar.siguiente);
      };
      const acomodar = function () {
        volverAlHogar();
        full.textContent = enPantalla() ? "⛶ salir" : "⛶";
        g.dispatchEvent(new Event("resize"));
      };
      const falso = function (si) {
        mapa.classList.toggle("full-falso", !!si);
        acomodar();
      };
      const salir = function () {
        if (mapa.classList.contains("full-falso")) {
          falso(false);
          return;
        }
        if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
        // Red para Pake: su clase la pone él, y si no la limpia te deja
        // encerrado en la vista grande sin forma de volver salvo refrescar.
        // Se le da un respiro para que salga solo y, si sigue, se fuerza.
        //
        // Ojo con el style inline: Pake escribe position:fixed ahí además de
        // la clase, y sacando sólo la clase el mapa se queda fuera del flujo
        // igual. #mapa no trae style propio en el HTML, así que limpiarlo
        // entero es seguro.
        if (mapa.classList.contains(PAKE)) {
          setTimeout(function () {
            if (!mapa.classList.contains(PAKE)) return;
            mapa.classList.remove(PAKE);
            if (mapa.getAttribute("style")) mapa.removeAttribute("style");
            acomodar();
          }, 150);
        }
        // Red: Pake puede devolver el nodo (o no) después de soltar la clase,
        // y entonces el acomodar del observer llega antes de tiempo.
        setTimeout(acomodar, 400);
      };
      full.addEventListener("click", function () {
        if (enPantalla()) {
          salir();
          return;
        }
        const p = mapa.requestFullscreen && mapa.requestFullscreen();
        if (p && p.catch) {
          p.catch(function (e) {
            console.warn("[ui] el navegador negó la pantalla completa nativa, voy por CSS:", e && e.message);
            falso(true);
          });
        } else {
          falso(true);
        }
      });
      document.addEventListener("fullscreenchange", acomodar);
      // Pake no pasa por la API estándar: le cuelga la clase
      // `pake-fullscreen-element` al mapa y puede no disparar
      // fullscreenchange. Mirando la clase nos enteramos igual, entre y salga
      // por donde entre — y sin esto los canvas se quedan con la medida del
      // otro estado, que es lo que obligaba a refrescar a mano.
      if (typeof MutationObserver === "function") {
        let ultimo = mapa.className;
        new MutationObserver(function () {
          if (mapa.className === ultimo) return;
          ultimo = mapa.className;
          acomodar();
        }).observe(mapa, { attributes: true, attributeFilter: ["class"] });
      }
      // Escape tiene que sacar de las tres, no sólo del plan B por CSS: en
      // Pake el navegador no se entera de que estás en pantalla completa, así
      // que si no lo manejamos acá la tecla no hace nada.
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && enPantalla()) salir();
      });
    }
  }

  function pintarVista() {
    const caja = document.getElementById("vistaSwitch");
    if (!caja || caja.hidden) return;
    caja.querySelectorAll("button[data-vista]").forEach(function (b) {
      b.classList.toggle("on", b.dataset.vista === (V.estado.vista || "cerebro"));
    });
    const viaje = document.getElementById("btnViaje");
    if (viaje) viaje.hidden = (V.estado.vista || "cerebro") === "cerebro";
  }

  /* ── Velocidad de reproducción ───────────────────────────── */

  function leerVel(v) {
    return (v < 1 ? String(v).replace("0.", "0,") : String(v)) + "×";
  }

  function montarVelocidad() {
    velocidad = document.getElementById("velocidad");
    if (!velocidad || !V.VELS) return;
    velocidad.innerHTML =
      '<button type="button" id="velMenos" aria-label="Más lento">−</button>' +
      '<span id="velValor">1×</span>' +
      '<button type="button" id="velMas" aria-label="Más rápido">+</button>';
    velocidad.title = "Velocidad de reproducción";
    velocidad.querySelector("#velMenos").addEventListener("click", function () {
      mover(-1);
    });
    velocidad.querySelector("#velMas").addEventListener("click", function () {
      mover(1);
    });
  }

  function mover(paso) {
    const i = V.VELS.indexOf(V.estado.vel);
    const j = Math.max(0, Math.min(V.VELS.length - 1, (i === -1 ? 2 : i) + paso));
    V.setVel(V.VELS[j]);
  }

  function pintarVelocidad() {
    if (!velocidad) return;
    const i = V.VELS.indexOf(V.estado.vel);
    const val = velocidad.querySelector("#velValor");
    if (val) val.textContent = leerVel(V.estado.vel);
    velocidad.querySelector("#velMenos").disabled = i <= 0;
    velocidad.querySelector("#velMas").disabled = i >= V.VELS.length - 1;
    velocidad.classList.toggle("alterada", V.estado.vel !== 1);
  }

  /* ── Dosis y cepa ────────────────────────────────────────── */

  function montarDosis() {
    dosis = document.getElementById("barraDosis");
    if (!dosis || !V.cepas) return;
    const C = V.cepas;
    const MODS = V.MODULADORES || {};
    const ctxFilas = Object.keys(MODS)
      .map(function (k) {
        const m = MODS[k];
        const ops = Object.keys(m.opciones)
          .map(function (oid) {
            return (
              '<button type="button" class="dz-seg" data-mod="' + k + '" data-op="' + oid + '">' +
              esc(m.opciones[oid].nombre) + "</button>"
            );
          })
          .join("");
        return (
          '<div class="dz-ctx-fila" title="' + esc(m.nota) + '"><span class="dz-ctx-rot">' + esc(m.etiqueta) + "</span>" +
          '<div class="dz-ctx-ops">' + ops + "</div></div>"
        );
      })
      .join("");

    dosis.innerHTML =
      '<label class="dz-campo dz-campo--cepa"><span>cepa</span>' +
      '<select id="dzCepa" aria-label="Cepa">' +
      C.lista.map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.nombre) + "</option>";
      }).join("") +
      "</select></label>" +
      '<label class="dz-campo dz-campo--rango"><span>seco</span>' +
      '<input id="dzGramos" type="range" min="0" max="1000" step="1" aria-label="Gramos secos">' +
      "</label>" +
      '<button type="button" class="dz-lectura" id="dzLectura" aria-expanded="false">' +
      '<b id="dzGr">—</b><span id="dzMg">—</span>' +
      "</button>" +
      '<div class="dz-presets">' +
      PRESETS.map(function (p) {
        return '<button type="button" class="dz-preset" data-mg="' + p.mg + '">' + p.nombre + "</button>";
      }).join("") +
      "</div>" +
      '<div class="dz-sesion" role="group" aria-label="Sesión">' +
      '<button type="button" class="dz-seg" data-sesion="1">sesión 1</button>' +
      '<button type="button" class="dz-seg" data-sesion="2">sesión 2</button>' +
      "</div>" +
      '<button type="button" class="dz-preset dz-ctx-btn" id="dzCtxBtn" aria-expanded="false" aria-controls="dzCtx">' +
      "⧗ el día y el cuerpo</button>" +
      '<button type="button" class="dz-preset dz-ctx-btn" id="dzSalaBtn" aria-expanded="false" aria-controls="dzSala">' +
      "la sala</button>" +
      '<div class="dz-ctx" id="dzCtx" hidden>' + ctxFilas + "</div>" +
      '<div class="dz-ctx dz-sala" id="dzSala" hidden>' +
      Object.keys(V.SALAS || {}).map(function (sid) {
        const s = V.SALAS[sid];
        return (
          '<button type="button" class="dz-seg" data-sala="' + sid + '" title="' + esc(s.nota) + '">' +
          esc(s.nombre) + "</button>"
        );
      }).join("") +
      "</div>" +
      '<div class="dz-salida"><b id="dzBanda">—</b><span id="dzPico">—</span><span id="dzDur">—</span></div>';

    const selCepa = dosis.querySelector("#dzCepa");
    const rango = dosis.querySelector("#dzGramos");
    const ctxBtn = dosis.querySelector("#dzCtxBtn");
    const ctxCaja = dosis.querySelector("#dzCtx");

    selCepa.value = V.estado.cepaId;
    selCepa.addEventListener("change", function () {
      // Se mantienen los gramos: el punto es ver cómo cambian los mg.
      V.setDosis(null, selCepa.value);
    });

    rango.value = String(Math.round(C.gramosASlider(V.estado.gramos) * 1000));
    rango.addEventListener("input", function () {
      V.setDosis(C.sliderAGramos(Number(rango.value) / 1000), null);
    });

    dosis.querySelectorAll(".dz-preset[data-mg]").forEach(function (b) {
      b.addEventListener("click", function () {
        const gr = C.gramosPara(Number(b.dataset.mg), V.estado.cepaId);
        V.setDosis(Math.max(C.G_MIN, Math.min(C.G_MAX, gr)), null);
      });
    });

    if (ctxBtn && ctxCaja) {
      ctxBtn.addEventListener("click", function () {
        const abrir = ctxCaja.hidden;
        ctxCaja.hidden = !abrir;
        ctxBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
        const salaCaja = dosis.querySelector("#dzSala");
        if (abrir && salaCaja) {
          salaCaja.hidden = true;
          const sb = dosis.querySelector("#dzSalaBtn");
          if (sb) sb.setAttribute("aria-expanded", "false");
        }
      });
      ctxCaja.querySelectorAll(".dz-seg").forEach(function (b) {
        b.addEventListener("click", function () {
          if (V.setModulador) V.setModulador(b.dataset.mod, b.dataset.op);
        });
      });
    }

    const salaBtn = dosis.querySelector("#dzSalaBtn");
    const salaCaja = dosis.querySelector("#dzSala");
    if (salaBtn && salaCaja) {
      salaBtn.addEventListener("click", function () {
        const abrir = salaCaja.hidden;
        salaCaja.hidden = !abrir;
        salaBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
        if (abrir && ctxCaja) {
          ctxCaja.hidden = true;
          ctxBtn.setAttribute("aria-expanded", "false");
        }
        V.estado.salaInfo = abrir;
        pintar(true);
      });
      salaCaja.querySelectorAll("[data-sala]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (V.setSala) V.setSala(b.dataset.sala);
        });
      });
    }

    dosis.querySelectorAll("[data-sesion]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.setSesion) V.setSesion(Number(b.dataset.sesion));
      });
    });

    dosis.querySelector("#dzLectura").addEventListener("click", function () {
      V.estado.dosisInfo = !V.estado.dosisInfo;
      pintar(true);
    });
  }

  function pintarDosis(forzar) {
    if (!dosis || !V.cepas || !V.fisio.info) return;
    const C = V.cepas;
    const info = V.fisio.info();
    const b = C.banda(info.mg);
    const mods = V.estado.moduladores || {};
    const sig =
      V.estado.cepaId + "|" + V.estado.gramos.toFixed(3) + "|" +
      (V.estado.perfil || "") + "|" +
      (mods.estomago || "") + (mods.prep || "") + (mods.irs || "") + (mods.ultima || "") +
      "|" + (V.estado.sesion || 1) + "|" + (V.estado.sala || "");
    if (!forzar && sig === sigDosis) return;
    sigDosis = sig;

    const rango = dosis.querySelector("#dzGramos");
    if (rango && document.activeElement !== rango) {
      rango.value = String(Math.round(C.gramosASlider(V.estado.gramos) * 1000));
    }
    const selCepa = dosis.querySelector("#dzCepa");
    if (selCepa && selCepa.value !== V.estado.cepaId) selCepa.value = V.estado.cepaId;

    dosis.querySelector("#dzGr").textContent = C.leerGramos(V.estado.gramos);
    dosis.querySelector("#dzMg").textContent = "≈ " + Math.round(info.mg) + " mg psilocibina";
    dosis.querySelector("#dzBanda").textContent = b.nombre;
    dosis.querySelector("#dzPico").textContent =
      "ocupación pico " + Math.round(info.ocupacionPico * 100) + "%";
    dosis.querySelector("#dzDur").textContent = "se nota ~" + V.fisio.leerDuracion();
    dosis.dataset.banda = b.id;

    dosis.querySelectorAll(".dz-preset[data-mg]").forEach(function (el) {
      el.classList.toggle("on", Math.abs(info.mg - Number(el.dataset.mg)) < 1.2);
    });
    const lec = dosis.querySelector("#dzLectura");
    if (lec) lec.setAttribute("aria-expanded", V.estado.dosisInfo ? "true" : "false");

    const ctxBtn = dosis.querySelector("#dzCtxBtn");
    if (ctxBtn && V.modAlterado) {
      ctxBtn.classList.toggle("on", V.modAlterado());
      ctxBtn.classList.toggle("alterado", V.modAlterado());
    }
    const salaBtnP = dosis.querySelector("#dzSalaBtn");
    if (salaBtnP) {
      salaBtnP.classList.toggle("on", V.estado.sala && V.estado.sala !== "alineada");
      salaBtnP.classList.toggle("alterado", V.estado.sala && V.estado.sala !== "alineada");
    }
    const MODS = V.MODULADORES || {};
    dosis.querySelectorAll("[data-mod]").forEach(function (b) {
      b.classList.toggle(
        "on",
        MODS[b.dataset.mod] &&
          V.estado.moduladores[b.dataset.mod] === b.dataset.op
      );
    });
    dosis.querySelectorAll("[data-sala]").forEach(function (b) {
      b.classList.toggle("on", V.estado.sala === b.dataset.sala);
    });
    dosis.querySelectorAll("[data-sesion]").forEach(function (b) {
      b.classList.toggle("on", String(V.estado.sesion || 1) === b.dataset.sesion);
    });
  }

  /* El contexto activo, contado en la ficha de dosis: qué se cambió del día
     y qué le hizo a la curva. */
  function lineaContexto() {
    const MODS = V.MODULADORES;
    if (!MODS || !V.modAlterado || !V.modAlterado()) return "";
    const activos = [];
    Object.keys(MODS).forEach(function (k) {
      const op = MODS[k].opciones[V.estado.moduladores[k]];
      if (op && op.efecto) {
        activos.push("<b>" + esc(MODS[k].etiqueta) + ":</b> " + esc(op.nombre.toLowerCase()) + " (" + esc(op.efecto) + ")");
      }
    });
    if (!activos.length) return "";
    return (
      '<p class="card-p">' + activos.join(" · ") +
      ". En el gráfico, la línea punteada es esta misma persona sin el cambio: el mismo gramo, otro día.</p>"
    );
  }

  function lineaSesion() {
    if (!V.estado || V.estado.sesion !== 2) return "";
    return (
      '<p class="card-p"><b>Sesión 2.</b> Misma dosis, misma cepa. Llega con el prior que dejó la ventana. ' +
      "Si no se escribió nada, es un déjà vu: la curva de priors casi no cambia. " +
      "La punteada amarilla es la sesión 1. Inspirado en el esquema de dos dosis, no es una simulación de esos ensayos.</p>"
    );
  }

  function lineaSala() {
    const SALAS = V.SALAS;
    if (!SALAS || !V.estado) return "";
    const s = SALAS[V.estado.sala] || SALAS.alineada;
    const ancla = V.casa && V.casa.ancla && V.casa.ancla();
    const red = (V.redes && ancla && V.redes.de(ancla)) || null;
    return (
      '<p class="card-p"><b>La sala:</b> ' + esc(s.nombre) + " (" + esc(s.efecto) + "). " +
      "No mueve miligramos: reparte el caudal entre redes. " +
      (red ? "La viga de esta creencia es " + esc(red.apodo) + ". " : "") +
      esc(s.nota) + "</p>"
    );
  }

  function cardDosis() {
    if (!V.cepas || !V.fisio.info) return "";
    const info = V.fisio.info();
    const b = V.cepas.banda(info.mg);
    const c = V.cepas.de(V.estado.cepaId);
    return (
      '<article class="card card--dosis">' +
      '<header><span class="card-tipo">dosis</span>' +
      '<button type="button" class="card-x" data-cerrar="dosis" aria-label="Cerrar">×</button></header>' +
      "<h3>" + esc(b.nombre) + "</h3>" +
      '<p class="card-apodo">' + esc(V.cepas.leerGramos(V.estado.gramos)) + " de " +
      esc(c.corto) + " ≈ " + Math.round(info.mg) + " mg · pico de ocupación " +
      Math.round(info.ocupacionPico * 100) + "% · se nota ~" + V.fisio.leerDuracion() +
      " · ventana de plasticidad ~" + Math.round(info.diasVentana) + " días</p>" +
      '<p class="card-p"><b>Ese «se nota» incluye la cola.</b> El núcleo de la ' +
      "experiencia es bastante más corto: el tramo intenso ocupa más o menos el " +
      "primer tercio.</p>" +
      '<p class="card-p">' + esc(b.texto) + "</p>" +
      (b.alerta ? '<p class="card-alerta">' + esc(b.alerta) + "</p>" : "") +
      lineaContexto() +
      lineaSesion() +
      lineaSala() +
      '<p class="card-p"><b>' + esc(c.nombre) + ".</b> " + esc(c.nota) + "</p>" +
      '<p class="card-fuente">Contenido de referencia: ' +
      String(c.psi).replace(".", ",") + " % psilocibina y " +
      String(c.psn).replace(".", ",") + " % psilocina sobre peso seco (rango publicado " +
      esc(c.rango) + "). Entre ejemplares y flushes la variación real llega a 2–3×: " +
      "esto sirve para entender proporciones, no para dosificar.</p>" +
      "</article>"
    );
  }

  /* La cohorte en tarjeta: picos de la corrida (no valores por minuto, así la
     tarjeta no caduca mientras corre el tiempo) + dónde se para tu persona. */
  function cardCohorte() {
    const C = V.cohorte;
    if (!C || !C.bandas || !C.bandas()) return "";
    const d = C.bandas();
    const k = V.estado.curva || "psilo";
    const vd = d.vars[k];
    if (!vd) return "";
    const alReves = k === "priors";
    const ext = function (arr) {
      let m = arr[0];
      for (let j = 1; j < arr.length; j++) {
        if (alReves ? arr[j] < m : arr[j] > m) m = arr[j];
      }
      return m;
    };
    const pct = function (x) { return Math.round(x * 100); };
    const rotulo = alReves ? "el punto más relajado" : "el pico";
    const nombresVar = {
      psilo: "ocupación de receptores",
      entropia: "entropía",
      plasticidad: "plasticidad",
      priors: "priors",
    };
    const perfiles = C.PERFILES.map(function (p) {
      return (
        '<button type="button" class="cs-chip cs-chip--inline' +
        (V.estado.perfil === p.id ? " on" : "") +
        '" data-perfil="' + p.id + '">' + esc(p.nombre) + "</button>"
      );
    }).join("");
    const notaPerfil = (C.perfiles[V.estado.perfil] && C.perfiles[V.estado.perfil].nota) || "";
    const mio = pct(extFns(k));
    const lo = pct(ext(vd.p10));
    const hi = pct(ext(vd.p90));
    const med = pct(ext(vd.p50));

    return (
      '<article class="card card--cohorte">' +
      '<header><span class="card-tipo">cohorte · ' + C.N + " personas</span>" +
      '<button type="button" class="card-x" data-cerrar="cohorte" aria-label="Cerrar">×</button></header>' +
      "<h3>La misma dosis, cien personas</h3>" +
      '<p class="card-apodo">por qué ningún número de esta pieza es un pronóstico</p>' +
      '<p class="card-ahora"><b>' + esc(rotulo.charAt(0).toUpperCase() + rotulo.slice(1)) + " de " +
      esc(nombresVar[k]) + ":</b> tu persona llega al " + mio +
      "% · 8 de cada 10 caen entre " + lo + " y " + hi +
      "% · mediana " + med + "%</p>" +
      '<p class="card-p"><b>¿Dónde está tu persona?</b></p>' +
      '<div class="cs-chips">' + perfiles + "</div>" +
      '<p class="card-apodo">' + esc(notaPerfil) + "</p>" +
      '<p class="card-p"><b>Qué es.</b> Cada banda del gráfico son las mismas ' + C.N +
      " personas pasando por el mismo motor: la exposición (cuánta psilocina llega) varía ~40 % entre personas " +
      "y la sensibilidad de los receptores, otro tanto. La banda clara es donde caen 8 de cada 10; la más densa, la mitad central.</p>" +
      '<p class="card-p"><b>Por qué importa.</b> Fijate en la microdosis: para la mediana no es nada, y en el borde ' +
      "amable de la banda ya se nota. La ocupación de receptores varía poco (se saturan), pero la experiencia varía mucho: " +
      "los umbrales cortan justo la parte empinada. Nadie es la mediana — el acompañamiento no escala con los miligramos.</p>" +
      '<p class="card-fuente">Variabilidad lognormal centrada en el modelo (CV 42 % en exposición, 30 % en sensibilidad), ' +
      "percentiles 10–90, semilla fija: es una población, no ruido. Los coeficientes salen de literatura PK; " +
      "los arquetipos son ilustrativos, igual que las cepas. No simula ningún paciente concreto.</p>" +
      "</article>"
    );
  }

  /* Valor extremo de la corrida para la persona actual (pico o mínimo según
     la variable). */
  function extFns(k) {
    const F = V.fisio;
    const alReves = k === "priors";
    let m = alReves ? 1 : 0;
    for (let t = 0; t <= F.T_SESION; t += 10) {
      const v = F.snapshot(t)[k];
      if (alReves ? v < m : v > m) m = v;
    }
    for (let t = F.T_SESION + 240; t <= F.T_MAX; t += 240) {
      const v = F.snapshot(t)[k];
      if (alReves ? v < m : v > m) m = v;
    }
    return m;
  }

  /* Lo que se ve, explicado desde su causa. Sin esto es un filtro lindo. */
  function cardVision() {
    const inten = V.fisio.fIntensidad ? V.fisio.fIntensidad(V.estado.t) : 0;
    const ab = V.fisio.fAbiertos ? V.fisio.fAbiertos(V.estado.t) : 0;
    const en = V.fisio.fEntes ? V.fisio.fEntes(V.estado.t) : 0;
    let ahora;
    if (inten < 0.05) {
      ahora = "Nada. Los receptores no llegan al umbral, así que la corteza no " +
        "oscila sola. Es la respuesta honesta: sin dosis suficiente no hay geometría.";
    } else if (inten < 0.35) {
      ahora = "Apenas un túnel tenue y algo de respiración en los bordes. " +
        "Es una sola onda, la más simple que puede armar la corteza.";
    } else if (inten < 0.7) {
      ahora = "Entran las espirales: la misma onda pero girada en la corteza. " +
        "Acá ya se reconoce el patrón clásico.";
    } else {
      ahora = "Enrejado completo — dos espirales de giro opuesto sumadas. Es el " +
        "panal que aparece en todos los relatos, en cualquier cultura.";
    }
    if (ab > 0.05) {
      ahora += " Con los ojos abiertos ya " +
        (ab > 0.6 ? "las superficies respiran y se deforman." : "asoma la deriva y el color se satura.");
    }
    if (en > 0.05) {
      ahora += " Y aparecen presencias" + (en > 0.6 ? ", bastante definidas." : ", todavía apenas insinuadas.");
    }
    return (
      '<article class="card card--vision">' +
      '<header><span class="card-tipo">ojos cerrados</span></header>' +
      "<h3>Constantes de forma</h3>" +
      '<p class="card-apodo">por qué siempre son las mismas cuatro</p>' +
      '<p class="card-ahora"><b>Ahora:</b> ' + esc(ahora) + "</p>" +
      '<p class="card-p"><b>Qué es.</b> Klüver clasificó en 1926 las alucinaciones ' +
      "geométricas en cuatro familias que se repiten en todo el mundo y con casi " +
      "cualquier sustancia: túneles y embudos, espirales, enrejados o panales, y " +
      "telarañas. No son cuatro entre muchas: son las cuatro.</p>" +
      '<p class="card-p"><b>Por qué importa.</b> La corteza visual no ve el campo ' +
      "visual tal cual: lo ve en coordenadas casi <b>log-polares</b> — la distancia al " +
      "centro se mapea al logaritmo, y el ángulo aparte. Cuando los 5-HT2A se ocupan " +
      "baja la inhibición y la corteza se pone a oscilar sola, en ondas planas, que es " +
      "lo más simple que puede hacer una lámina de neuronas. Una onda plana vista a " +
      "través de ese mapa <b>es</b> un túnel, una espiral o una red, según cómo esté " +
      "girada. La geometría que se ve es la geometría de la corteza.</p>" +
      (en > 0.05
        ? '<p class="card-p"><b>Las presencias.</b> En dosis altas aparecen entes, ' +
          "seres, elementales. Acá no se dibuja ningún bicho: se dibuja lo que hace " +
          "el sistema de detección de caras y agentes cuando le entra ruido de alta " +
          "entropía y sin inhibición que lo frene. Por eso son <b>simétricas</b>, por " +
          "eso arman ojos antes que cuerpo, y por eso emergen de la geometría en vez " +
          "de estar apoyadas encima. Es el mismo principio que las constantes de " +
          "forma: la alucinación delata la arquitectura. Cada viaje trae otras — " +
          'tocá «otro viaje» y se resortean.</p>'
        : "") +
      '<p class="card-fuente">Esto no imita el efecto: lo deriva. El dibujo sale de ' +
      "cos(k·log r + k′·θ) sobre el mapa retino-cortical, con la amplitud atada a la " +
      "misma ocupación de receptores que mueve las curvas. Klüver 1926; Bressloff, " +
      "Cowan, Golubitsky, Thomas y Wiener, <i>Phil. Trans. R. Soc. B</i> 2001. " +
      "Es un modelo, no una foto de lo que ve una persona.</p>" +
      "</article>"
    );
  }

  /* ── Ayuda ───────────────────────────────────────────────── */

  function montarAyuda() {
    const abrir = document.getElementById("btnAyuda");
    if (abrir && ayuda) {
      abrir.addEventListener("click", function () {
        ayuda.hidden = false;
      });
    }
    if (!ayuda) return;
    ayuda.addEventListener("click", function (ev) {
      if (ev.target === ayuda || ev.target.classList.contains("ay-cerrar")) {
        ayuda.hidden = true;
      }
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !ayuda.hidden) ayuda.hidden = true;
    });
    let visto = null;
    try {
      visto = g.localStorage.getItem("vt_intro_v1");
    } catch (e) {
      visto = "1";
    }
    if (!visto) {
      ayuda.hidden = false;
      try {
        g.localStorage.setItem("vt_intro_v1", "1");
      } catch (e) {}
    }
  }

  function syncPlay() {
    if (!btn || !V.estado) return;
    const on = !!V.estado.play;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-label", on ? "Pausar" : "Reproducir");
    btn.textContent = on ? "❚❚" : "▶";
  }

  /* ── Tarjetas ────────────────────────────────────────────── */

  function cardVariable(k, fid) {
    const c = V.variables && V.variables.ficha(k, fid);
    if (!c) return "";
    return (
      '<article class="card card--var" style="--c:' + c.color + '">' +
      '<header><span class="card-tipo">curva</span>' +
      '<button type="button" class="card-x" data-cerrar="curva" aria-label="Cerrar">×</button></header>' +
      "<h3>" + esc(c.nombre) + "</h3>" +
      '<p class="card-apodo">' + esc(c.apodo) + "</p>" +
      '<p class="card-ahora"><b>Ahora:</b> ' + esc(c.ahora) + "</p>" +
      '<p class="card-p"><b>Qué mide.</b> ' + esc(c.que) + "</p>" +
      '<p class="card-p"><b>Por qué importa.</b> ' + esc(c.porque) + "</p>" +
      "</article>"
    );
  }

  function cardCombo(ids, fid) {
    const c = V.redes && V.redes.combo(ids, fid);
    if (!c) return "";
    const puntos = c.colores
      .map(function (col) {
        return '<i style="background:' + col + '"></i>';
      })
      .join("");
    const lineas = c.lineas
      .map(function (l) {
        return (
          '<div class="card-linea"><h4>' + esc(l.titulo) + "</h4><p>" + esc(l.texto) + "</p></div>"
        );
      })
      .join("");
    return (
      '<article class="card card--combo' + (c.todas ? " card--todas" : "") + '">' +
      '<header><span class="card-tipo">' +
      (c.todas ? "el conjunto" : "combinación") +
      '</span><span class="card-puntos">' + puntos + "</span></header>" +
      "<h3>" + esc(c.titulo) + "</h3>" +
      '<p class="card-clima">' + esc(c.clima) + "</p>" +
      lineas +
      "</article>"
    );
  }

  /* El "ahora" de cada red lo cuenta el globo sobre el mapa. Acá va el fondo:
     qué es y por qué importa. No se repite texto entre los dos lugares.
     Con más de dos redes elegidas la ficha se acorta para que la combinación
     siga siendo legible. */
  function cardRed(id, fid, compacto) {
    const c = V.redes && V.redes.ficha(id, fid);
    if (!c) return "";
    return (
      '<article class="card card--red' + (compacto ? " card--mini" : "") + '" style="--c:' + c.color + '">' +
      '<header><span class="card-tipo">red</span>' +
      '<button type="button" class="card-x" data-red="' + c.id + '" aria-label="Soltar">×</button></header>' +
      "<h3>" + esc(c.corto) + ' <span class="card-apodo-in">· ' + esc(c.apodo) + "</span></h3>" +
      '<p class="card-apodo">' + esc(c.resumen) + "</p>" +
      // Con tres o más redes los globos del mapa se apagan: el "ahora" viene acá.
      (compacto ? '<p class="card-ahora"><b>Ahora:</b> ' + esc(c.ahora) + "</p>" : "") +
      '<p class="card-p"><b>Qué es.</b> ' + esc(c.que) + "</p>" +
      (compacto ? "" : '<p class="card-p"><b>Por qué importa.</b> ' + esc(c.porque) + "</p>") +
      "</article>"
    );
  }

  function pintarFichas(fase, forzar) {
    if (!fichas) return;
    const fid = fase ? fase.id : "base";
    const sel = V.redes ? V.redes.ordenar(V.estado.sel) : V.estado.sel.slice();
    const curva = V.estado.curva;
    const verDosis = !!V.estado.dosisInfo || V.estado.sesion === 2 || !!V.estado.salaInfo;
    const verVision = !!V.estado.vista && V.estado.vista !== "cerebro";
    const verCohorte = !!V.estado.cohorte;
    const mods = V.estado.moduladores || {};
    const sig =
      fid + "|" + curva + "|" + sel.join(",") + "|" + (verVision ? "v" : "") + "|" +
      (verDosis ? V.estado.cepaId + V.estado.gramos.toFixed(2) : "") + "|" +
      (verCohorte ? "c" + (V.estado.perfil || "") : "") + "|" +
      (mods.estomago || "") + (mods.prep || "") + (mods.irs || "") + (mods.ultima || "") +
      "|" + (V.estado.sesion || 1) + "|" + (V.estado.sala || "") + (V.estado.salaInfo ? "i" : "");
    if (!forzar && fichas.dataset.sig === sig) return;
    fichas.dataset.sig = sig;

    if (!curva && !sel.length && !verDosis && !verVision && !verCohorte) {
      fichas.hidden = true;
      fichas.innerHTML = "";
      return;
    }

    let html = "";
    if (verVision) html += cardVision();
    if (verDosis) html += cardDosis();
    if (verCohorte) html += cardCohorte();
    if (curva) html += cardVariable(curva, fid);
    if (sel.length > 1) html += cardCombo(sel, fid);
    if (sel.length) {
      html +=
        '<p class="fichas-nota">' +
        (sel.length > 2
          ? "Con tres o más redes el mapa queda libre: el detalle de cada una viene acá."
          : "El globo sobre el mapa cuenta qué le pasa en este minuto. Acá va el fondo.") +
        "</p>";
    }
    const compacto = sel.length > 2;
    sel.forEach(function (id) {
      html += cardRed(id, fid, compacto);
    });

    fichas.hidden = false;
    fichas.innerHTML = html;

    fichas.querySelectorAll("[data-cerrar='curva']").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.elegirCurva) V.elegirCurva(V.estado.curva);
      });
    });
    fichas.querySelectorAll("[data-cerrar='dosis']").forEach(function (b) {
      b.addEventListener("click", function () {
        V.estado.dosisInfo = false;
        pintar(true);
      });
    });
    fichas.querySelectorAll("[data-cerrar='cohorte']").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.estado.cohorte && V.toggleCohorte) V.toggleCohorte();
      });
    });
    fichas.querySelectorAll("[data-perfil]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.setPerfil) V.setPerfil(b.dataset.perfil);
      });
    });
    fichas.querySelectorAll("[data-red]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (V.alternarRed) V.alternarRed(b.dataset.red);
      });
    });
  }

  /* ── Ciclo ───────────────────────────────────────────────── */

  function pintar(forzar) {
    if (!listo || !V.estado || !V.fisio) return;
    const s = V.fisio.snapshot(V.estado.t);
    const fase = V.fases ? V.fases.en(V.estado.t) : null;
    const hayFicha = !!(
      V.estado.curva || V.estado.sel.length || V.estado.dosisInfo ||
      V.estado.cohorte || V.estado.sesion === 2 || V.estado.salaInfo ||
      (V.estado.vista && V.estado.vista !== "cerebro")
    );

    if (lectura) lectura.textContent = V.fisio.leerTiempo(V.estado.t);
    if (scrub && !dragging) {
      scrub.value = String(Math.round(V.fisio.tiempoASlider(V.estado.t) * 1000));
    }
    syncPlay();

    if (chips && fase) {
      const botones = chips.querySelectorAll("button");
      let activo = null;
      for (let i = 0; i < botones.length; i++) {
        const on = botones[i].dataset.id === fase.id;
        botones[i].classList.toggle("activa", on);
        if (on) activo = botones[i];
      }
      // La tira scrollea cuando no entran los seis: que la fase actual quede
      // siempre a la vista mientras corre.
      if (activo && faseVisible !== fase.id) {
        faseVisible = fase.id;
        if (chips.scrollWidth > chips.clientWidth + 1) {
          const centro = activo.offsetLeft - (chips.clientWidth - activo.offsetWidth) / 2;
          chips.scrollTo({ left: Math.max(0, centro), behavior: "smooth" });
        }
      }
    }

    if (panel && fase && (forzar || panel.dataset.id !== fase.id)) {
      panel.dataset.id = fase.id;
      const k = panel.querySelector(".kicker");
      const h = panel.querySelector("h2");
      const c = panel.querySelector(".cuerpo");
      if (k) k.textContent = fase.kicker;
      if (h) h.textContent = fase.nombre;
      if (c) c.textContent = fase.cuerpo;
      const cab = panel.querySelector(".pf-cab");
      if (cab) {
        cab.classList.remove("flash");
        void cab.offsetWidth;
        cab.classList.add("flash");
      }
    }
    if (panel) panel.classList.toggle("con-ficha", hayFicha);

    pintarDosis(forzar);
    pintarVelocidad();
    pintarVista();
    pintarFichas(fase, forzar);

    if (metricas) {
      for (let i = 0; i < KEYS.length; i++) {
        const k = KEYS[i];
        const el = metricas.querySelector('[data-k="' + k + '"]');
        if (!el) continue;
        const pct = Math.round(s[k] * 100);
        const bar = el.querySelector("i");
        const em = el.querySelector("em");
        if (bar) bar.style.width = pct + "%";
        if (em) em.textContent = pct + "%";
        const on = V.estado.curva === k;
        el.classList.toggle("on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      }
    }
  }

  V.ui = { montar: montar, pintar: pintar };
})(window);
