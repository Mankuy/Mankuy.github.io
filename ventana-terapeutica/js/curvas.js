/* Las cuatro curvas. Ejes con unidades reales, curvas clickeables
   y tooltip que dice qué estás mirando. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const KEYS = ["psilo", "entropia", "plasticidad", "priors"];
  const COLORES = {
    psilo: "#8b6cff",
    entropia: "#ff5c8a",
    plasticidad: "#3ddc97",
    priors: "#f5c14c",
  };
  const LABELS = {
    psilo: "ocupación",
    entropia: "entropía",
    plasticidad: "plasticidad",
    priors: "priors",
  };

  /* Marcas del eje temporal, en minutos. */
  const TICKS = [30, 60, 120, 240, 480, 1440 * 3, 1440 * 7, 1440 * 14];

  const PAD = { l: 30, r: 74, t: 16, b: 20 };

  let canvas, ctx, tip;
  let hoverK = null;
  let hoverXY = null;
  let yEtiqueta = {};

  function fns() {
    const F = V.fisio;
    return {
      psilo: F.fPsilo,
      entropia: F.fEntropia,
      plasticidad: F.fPlasticidad,
      priors: F.fPriors,
    };
  }

  function caja() {
    const r = canvas.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      x0: PAD.l,
      x1: r.width - PAD.r,
      y0: PAD.t,
      y1: r.height - PAD.b,
    };
  }

  function xDeU(b, u) {
    return b.x0 + u * (b.x1 - b.x0);
  }

  function uDeX(b, x) {
    return Math.max(0, Math.min(1, (x - b.x0) / Math.max(1, b.x1 - b.x0)));
  }

  function yDeVal(b, v) {
    return b.y1 - v * (b.y1 - b.y0);
  }

  function montar() {
    canvas = document.getElementById("lienzoCurvas");
    tip = document.getElementById("tooltipCurva");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerleave", function () {
      V.estado.hoverU = null;
      hoverK = null;
      hoverXY = null;
      canvas.style.cursor = "crosshair";
      if (tip) tip.hidden = true;
    });
    canvas.style.cursor = "crosshair";
    const btnCohorte = document.getElementById("btnCohorte");
    if (btnCohorte && V.toggleCohorte) {
      btnCohorte.addEventListener("click", function () {
        V.toggleCohorte();
      });
    }
    medir();
  }

  function medir() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, g.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* Qué curva está bajo el puntero (si alguna).
     En el tramo de la ventana varias curvas se apilan cerca de cero: si hay
     empate no adivinamos, devolvemos null y el clic mueve el tiempo. */
  function curvaEn(px, py) {
    const F = V.fisio;
    const b = caja();

    // Margen derecho: los nombres dibujados al final de cada curva son botones.
    if (px > b.x1) {
      let elegido = null;
      let mejor = 10;
      KEYS.forEach(function (k) {
        const y = yEtiqueta[k];
        if (y == null) return;
        const d = Math.abs(y - py);
        if (d < mejor) {
          mejor = d;
          elegido = k;
        }
      });
      return elegido;
    }

    const s = F.snapshot(F.sliderATiempo(uDeX(b, px)));
    const dist = KEYS.map(function (k) {
      return { k: k, d: Math.abs(yDeVal(b, s[k]) - py) };
    }).sort(function (a, c) {
      return a.d - c.d;
    });
    if (dist[0].d > 9) return null;
    if (dist[1] && dist[1].d < dist[0].d + 6) return null;
    return dist[0].k;
  }

  function onMove(ev) {
    const F = V.fisio;
    const r = canvas.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const py = ev.clientY - r.top;
    const u = uDeX(caja(), px);
    V.estado.hoverU = u;
    hoverK = curvaEn(px, py);
    hoverXY = { x: ev.clientX, y: ev.clientY };
    canvas.style.cursor = hoverK ? "pointer" : "crosshair";
    mostrarTip(F.sliderATiempo(u));
  }

  function mostrarTip(t) {
    if (!tip || !hoverXY) return;
    const F = V.fisio;
    const s = F.snapshot(t);
    const foco = hoverK || V.estado.curva;
    const filas = KEYS.map(function (k) {
      const on = foco === k;
      return (
        '<span class="tc-fila' + (on ? " on" : "") + '">' +
        '<i style="background:' + COLORES[k] + '"></i>' +
        '<b>' + LABELS[k] + "</b>" +
        "<em>" + Math.round(s[k] * 100) + "%</em>" +
        "</span>"
      );
    }).join("");
    let bandaTxt = "";
    if (V.estado.cohorte && foco && V.cohorte && V.cohorte.percentilEn) {
      const u = V.estado.hoverU != null ? V.estado.hoverU : F.tiempoASlider(t);
      const pc = V.cohorte.percentilEn(foco, u);
      if (pc) {
        bandaTxt =
          '<div class="tc-banda">' + LABELS[foco] + " en la cohorte — 8 de cada 10 personas: " +
          Math.round(pc.p10 * 100) + "–" + Math.round(pc.p90 * 100) + "%" +
          " · mediana " + Math.round(pc.p50 * 100) + "%</div>";
      }
    }
    tip.hidden = false;
    tip.style.left = hoverXY.x + "px";
    tip.style.top = hoverXY.y + "px";
    tip.innerHTML =
      '<div class="tc-t">' + F.leerTiempo(t) + "</div>" +
      '<div class="tc-grid">' + filas + "</div>" +
      bandaTxt +
      '<div class="tc-hint">' +
      (hoverK ? "clic: ver qué mide " + LABELS[hoverK] : "clic: mover el tiempo acá") +
      "</div>";
  }

  function onDown(ev) {
    const F = V.fisio;
    const r = canvas.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const py = ev.clientY - r.top;
    const k = curvaEn(px, py);
    if (k) {
      if (V.elegirCurva) V.elegirCurva(k);
      return;
    }
    V.irSuave(F.sliderATiempo(uDeX(caja(), px)));
  }

  /* ── Dibujo ──────────────────────────────────────────────── */

  function trazar(b, fn, opts) {
    const F = V.fisio;
    const n = 260;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push({ x: xDeU(b, u), y: yDeVal(b, fn(F.sliderATiempo(u))) });
    }
    if (opts.relleno) {
      const grd = ctx.createLinearGradient(0, b.y0, 0, b.y1);
      grd.addColorStop(0, opts.relleno);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.moveTo(pts[0].x, b.y1);
      pts.forEach(function (p) { ctx.lineTo(p.x, p.y); });
      ctx.lineTo(pts[pts.length - 1].x, b.y1);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();
    }
    ctx.beginPath();
    pts.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.ancho;
    ctx.lineJoin = "round";
    ctx.stroke();
    return pts[pts.length - 1];
  }

  function ejes(b) {
    const F = V.fisio;
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i++) {
      const v = 1 - i / 4;
      const y = yDeVal(b, v);
      ctx.strokeStyle = i === 4 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.055)";
      ctx.beginPath();
      ctx.moveTo(b.x0, y);
      ctx.lineTo(b.x1, y);
      ctx.stroke();
      if (i === 0 || i === 2 || i === 4) {
        ctx.fillStyle = "rgba(232,228,216,0.34)";
        ctx.textAlign = "right";
        ctx.fillText(Math.round(v * 100) + "%", b.x0 - 6, y);
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    TICKS.forEach(function (min) {
      const u = F.tiempoASlider(min);
      const x = xDeU(b, u);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(x, b.y0);
      ctx.lineTo(x, b.y1);
      ctx.stroke();
      ctx.fillStyle = "rgba(232,228,216,0.38)";
      ctx.fillText(F.leerTiempo(min), x, b.y1 + 5);
    });

    const xc = xDeU(b, 0.55);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(xc, b.y0 - 4);
    ctx.lineTo(xc, b.y1);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(232,228,216,0.42)";
    ctx.fillText("la sesión", b.x0 + 3, b.y0 - 5);
    ctx.fillText("la ventana (días)", xc + 5, b.y0 - 5);
  }

  /* La banda de la cohorte: P10–P90 suave y P25–P75 más presente, pintadas
     antes de las curvas para que la persona (la línea) quede encima. */
  function banda(b, arrLo, arrHi, color, alpha) {
    if (!arrLo || !arrHi) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    const d = V.cohorte.bandas();
    for (let j = 0; j < d.us.length; j++) {
      const x = xDeU(b, d.us[j]);
      const y = yDeVal(b, arrHi[j]);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let j = d.us.length - 1; j >= 0; j--) {
      ctx.lineTo(xDeU(b, d.us[j]), yDeVal(b, arrLo[j]));
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function dibujarCohorte(b, foco) {
    if (!V.estado.cohorte || !V.cohorte || !V.cohorte.bandas()) return;
    const d = V.cohorte.bandas();
    KEYS.forEach(function (k) {
      const atenuada = foco && foco !== k ? 0.38 : 1;
      const vd = d.vars[k];
      banda(b, vd.p10, vd.p90, COLORES[k], 0.07 * atenuada);
      banda(b, vd.p25, vd.p75, COLORES[k], 0.11 * atenuada);
      // Si la persona no es la mediana, mostrar dónde cae la mediana: la
      // línea principal es TU persona, no la del promedio.
      if (V.estado.perfil && V.estado.perfil !== "promedio") {
        ctx.globalAlpha = 0.22 * atenuada;
        ctx.strokeStyle = COLORES[k];
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        for (let j = 0; j < d.us.length; j++) {
          const x = xDeU(b, d.us[j]);
          const y = yDeVal(b, vd.p50[j]);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    });
  }

  /* Referencia en punteado: la misma persona sin el modificador del día.
     Responde "¿qué habría pasado con el estómago vacío / sin el IRS?". */
  function dibujarReferencia(b, foco) {
    if (!V.modAlterado || !V.modAlterado() || !V.fisio.cadena || !V.perfilMult) return;
    const base = V.fisio.cadena(V.fisio.info().mg, V.perfilMult());
    KEYS.forEach(function (k) {
      const atenuada = foco && foco !== k ? 0.3 : 0.55;
      ctx.globalAlpha = atenuada;
      ctx.strokeStyle = COLORES[k];
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      let primero = true;
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const y = yDeVal(b, base[k](V.fisio.sliderATiempo(u)));
        const x = xDeU(b, u);
        if (primero) { ctx.moveTo(x, y); primero = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
  }

  function pintar() {
    if (!ctx || !canvas) return;
    const F = V.fisio;
    const b = caja();
    const foco = V.estado.curva;
    ctx.clearRect(0, 0, b.w, b.h);
    ejes(b);
    dibujarCohorte(b, foco);
    dibujarReferencia(b, foco);

    const btnCohorte = document.getElementById("btnCohorte");
    if (btnCohorte) {
      btnCohorte.classList.toggle("on", !!V.estado.cohorte);
      btnCohorte.setAttribute("aria-pressed", V.estado.cohorte ? "true" : "false");
    }

    const FNS = fns();
    const finales = {};
    KEYS.forEach(function (k) {
      const on = !foco || foco === k;
      const destacada = foco === k;
      finales[k] = trazar(b, FNS[k], {
        color: on ? COLORES[k] : "rgba(232,228,216,0.16)",
        ancho: destacada ? 3.1 : on ? 2.1 : 1.2,
        relleno: destacada ? COLORES[k] + "44" : null,
      });
    });

    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const usados = [];
    KEYS.forEach(function (k) {
      let y = finales[k].y;
      // Separar etiquetas que se pisan al final del recorrido.
      usados.forEach(function (u) {
        if (Math.abs(u - y) < 11) y = u + 11;
      });
      usados.push(y);
      y = Math.max(b.y0, Math.min(b.y1, y));
      yEtiqueta[k] = y;
      const on = !foco || foco === k;
      ctx.fillStyle = on ? COLORES[k] : "rgba(232,228,216,0.2)";
      ctx.fillText(LABELS[k], b.x1 + 7, y);
    });

    const u = F.tiempoASlider(V.estado.t);
    const xNow = xDeU(b, u);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xNow, b.y0 - 4);
    ctx.lineTo(xNow, b.y1 + 3);
    ctx.stroke();

    const s = F.snapshot(V.estado.t);
    KEYS.forEach(function (k) {
      const on = !foco || foco === k;
      const y = yDeVal(b, s[k]);
      ctx.beginPath();
      ctx.arc(xNow, y, foco === k ? 4.6 : 3.4, 0, Math.PI * 2);
      ctx.fillStyle = on ? COLORES[k] : "rgba(232,228,216,0.2)";
      ctx.fill();
      if (foco === k) {
        ctx.beginPath();
        ctx.arc(xNow, y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = COLORES[k] + "77";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    });

    if (V.estado.hoverU != null) {
      const xh = xDeU(b, V.estado.hoverU);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xh, b.y0);
      ctx.lineTo(xh, b.y1);
      ctx.stroke();
    }
  }

  function sincronizar() {
    if (tip && !tip.hidden && hoverXY && V.estado.hoverU != null) {
      mostrarTip(V.fisio.sliderATiempo(V.estado.hoverU));
    }
  }

  V.curvas = {
    montar: montar,
    pintar: pintar,
    sincronizar: sincronizar,
    colores: COLORES,
    labels: LABELS,
    keys: KEYS,
  };
})(window);
