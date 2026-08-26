/* La cohorte: la misma dosis, cien personas.

   El motor es determinista: una dosis, una curva, una persona promedio. Pero
   nadie es la persona promedio. La exposición (cuánta psilocina llega) varía
   ~40 % entre personas y la sensibilidad de los receptores, otro tanto — es
   el orden de magnitud de la variabilidad que reporta la farmacocinética.

   Acá se corren 120 personas por la MISMA cadena del motor (V.fisio.cadena),
   con multiplicadores lognormales, y por cada variable se dibuja la banda
   donde cae el 80 % central (P10–P90) y la mediana.

   Dos decisiones que son parte del mensaje:
   - La semilla es FIJA: la cohorte no cambia entre cuadros. No es "ruido",
     es una población.
   - La ocupación varía poco (los receptores se saturan) pero la experiencia
     varía mucho: los umbrales subjetivos cortan la parte empinada. La misma
   microdosis que para la mediana no es nada, para el percentil 10 se nota.

   Los perfiles (mediana / sensible / templada) no son personas simuladas:
   son dónde se para la línea principal DENTRO de la banda. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const VARS = ["psilo", "entropia", "plasticidad", "priors"];

  const PERFILES = [
    {
      id: "promedio",
      nombre: "mediana",
      mult: { ec50: 1 },
      nota: "La persona del modelo: sobre ella está calibrado todo lo demás.",
    },
    {
      id: "sensible",
      nombre: "sensible",
      mult: { ec50: 0.62 },
      nota: "Le pega antes y más fuerte. No es mejor ni peor: es un extremo de la distribución, y en la práctica se dosifica distinto.",
    },
    {
      id: "templada",
      nombre: "experiencia",
      mult: { ec50: 1.45 },
      nota: "El otro extremo: misma exposición, menos efecto. Uso repetido, cuerpo, fármacos — no siempre se saben antes de la sesión.",
    },
    {
      id: "ansiosa",
      nombre: "expectativa",
      mult: { ec50: 0.78, ka: 1.12 },
      nota: "La ansiedad y la expectativa no cambian la molécula: cambian cuánto se siente la misma ocupación. Acá se modela como un EC50 más bajo. Ilustrativo, no es un diagnóstico.",
    },
  ];
  const POR_ID = {};
  PERFILES.forEach(function (p) {
    POR_ID[p.id] = p;
  });

  const N = 120;          // personas por corrida
  const CV_CMAX = 0.42;   // variabilidad de exposición entre personas
  const CV_EC50 = 0.30;   // variabilidad de sensibilidad de receptores
  const PUNTOS = 110;     // muestras sobre el eje del tiempo (u del slider)
  const SEMILLA = 42;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let cache = { sig: null, datos: null };

  function bandas() {
    const F = V.fisio;
    if (!F || !F.cadena) return null;
    // La banda refleja la variabilidad de PERSONAS alrededor del contexto
    // actual (moduladores sí, perfil no: el perfil elige un lugar en la banda).
    const mod = (V.modMult && V.modMult()) || { ka: 1, cmax: 1, ec50: 1 };
    const mg = F.info().mg;
    const sig = [mg, mod.ka, mod.cmax, mod.ec50, N, CV_CMAX, CV_EC50, PUNTOS].join("|");
    if (cache.sig === sig) return cache.datos;

    const rng = mulberry32(SEMILLA);
    const sdC = Math.sqrt(Math.log(1 + CV_CMAX * CV_CMAX));
    const sdE = Math.sqrt(Math.log(1 + CV_EC50 * CV_EC50));
    const us = [];
    const ts = [];
    for (let j = 0; j <= PUNTOS; j++) {
      const u = j / PUNTOS;
      us.push(u);
      ts.push(F.sliderATiempo(u));
    }

    const vals = {};
    VARS.forEach(function (k) {
      vals[k] = ts.map(function () { return []; });
    });

    for (let i = 0; i < N; i++) {
      // Box-Muller con la rng sembrada.
      const r1 = Math.max(1e-9, rng());
      const r2 = rng();
      const z1 = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
      const z2 = Math.sqrt(-2 * Math.log(r1)) * Math.sin(2 * Math.PI * r2);
      const persona = {
        ka: mod.ka,
        cmax: mod.cmax * Math.exp(z1 * sdC),
        ec50: mod.ec50 * Math.exp(z2 * sdE),
      };
      const cadena = F.cadena(mg, persona);
      VARS.forEach(function (k) {
        for (let j = 0; j <= PUNTOS; j++) {
          vals[k][j].push(cadena[k](ts[j]));
        }
      });
    }

    function pct(arr, p) {
      const ordenado = arr.slice().sort(function (a, b) { return a - b; });
      return ordenado[Math.min(ordenado.length - 1, Math.round(p * (ordenado.length - 1)))];
    }

    const datos = { us: us, ts: ts, vars: {} };
    VARS.forEach(function (k) {
      const banda = { p10: [], p25: [], p50: [], p75: [], p90: [] };
      for (let j = 0; j <= PUNTOS; j++) {
        banda.p10.push(pct(vals[k][j], 0.10));
        banda.p25.push(pct(vals[k][j], 0.25));
        banda.p50.push(pct(vals[k][j], 0.50));
        banda.p75.push(pct(vals[k][j], 0.75));
        banda.p90.push(pct(vals[k][j], 0.90));
      }
      datos.vars[k] = banda;
    });

    cache.sig = sig;
    cache.datos = datos;
    return datos;
  }

  /* Percentiles interpolados en un punto cualquiera del slider (para el
     tooltip y la tarjeta). */
  function percentilEn(k, u) {
    const d = bandas();
    if (!d || !d.vars[k]) return null;
    const x = Math.max(0, Math.min(1, u)) * PUNTOS;
    const j = Math.min(PUNTOS - 1, Math.floor(x));
    const f = x - j;
    const b = d.vars[k];
    function lerp(arr) {
      return arr[j] + (arr[j + 1] - arr[j]) * f;
    }
    return { p10: lerp(b.p10), p25: lerp(b.p25), p50: lerp(b.p50), p75: lerp(b.p75), p90: lerp(b.p90) };
  }

  V.cohorte = {
    PERFILES: PERFILES,
    perfiles: POR_ID,
    bandas: bandas,
    percentilEn: percentilEn,
    N: N,
    vars: VARS,
  };
})(window);
