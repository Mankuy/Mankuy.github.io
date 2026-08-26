/* Anatomía: vista lateral izquierda, anterior a la izquierda.
   Coordenadas normalizadas: x −1 (polo frontal) → +1 (polo occipital),
   y −1 (inferior) → +1 (vértice).

   Cuatro piezas, no una: el lóbulo TEMPORAL va aparte, separado del resto por
   la cisura de Silvio. Ese hueco es lo que hace que un contorno se lea como
   cerebro y no como un huevo. Después cerebelo y tronco.

   Es esquemático, no un atlas. Lo que sí respeta es la TOPOGRAFÍA: cada red
   está donde está en un cerebro real, así que las distancias y los cruces que
   se ven en el mapa significan algo. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  /* Frontal + parietal + occipital. El borde de abajo es la cisura de Silvio. */
  const CEREBRO = [
    [-0.95, 0.10],
    [-0.88, 0.42],
    [-0.72, 0.65],
    [-0.48, 0.79],
    [-0.18, 0.86],
    [0.14, 0.85],
    [0.44, 0.75],
    [0.68, 0.58],
    [0.86, 0.34],
    [0.95, 0.08],
    [0.94, -0.14],
    [0.84, -0.32],
    [0.62, -0.30],
    [0.36, -0.20],
    [0.10, -0.10],
    [-0.16, -0.08],
    [-0.42, -0.10],
    [-0.66, -0.12],
    [-0.84, -0.06],
  ];

  /* Lóbulo temporal: cuelga debajo de la cisura y se mete hacia adelante. */
  const TEMPORAL = [
    [-0.70, -0.34],
    [-0.64, -0.52],
    [-0.48, -0.63],
    [-0.24, -0.68],
    [0.04, -0.66],
    [0.30, -0.58],
    [0.52, -0.46],
    [0.66, -0.34],
    [0.44, -0.28],
    [0.18, -0.20],
    [-0.10, -0.16],
    [-0.36, -0.18],
    [-0.58, -0.24],
  ];

  const CEREBELO = [
    [0.34, -0.52],
    [0.56, -0.50],
    [0.76, -0.56],
    [0.86, -0.70],
    [0.80, -0.86],
    [0.60, -0.93],
    [0.40, -0.86],
    [0.30, -0.70],
  ];

  const TRONCO = [
    [0.02, -0.58],
    [0.20, -0.56],
    [0.27, -0.76],
    [0.23, -0.95],
    [0.07, -0.96],
    [-0.01, -0.76],
  ];

  /* Surcos. El central y el precentral dan la lectura de "esto es corteza". */
  const SURCOS = [
    {
      id: "central",
      peso: 1,
      pts: [[0.10, 0.84], [0.02, 0.58], [-0.07, 0.32], [-0.14, 0.10], [-0.18, -0.04]],
    },
    {
      id: "precentral",
      peso: 0.7,
      pts: [[-0.14, 0.80], [-0.24, 0.54], [-0.33, 0.28], [-0.39, 0.06]],
    },
    {
      id: "postcentral",
      peso: 0.7,
      pts: [[0.30, 0.78], [0.22, 0.54], [0.14, 0.30], [0.08, 0.08]],
    },
    {
      id: "frontal-sup",
      peso: 0.45,
      pts: [[-0.86, 0.34], [-0.66, 0.44], [-0.46, 0.52]],
    },
    {
      id: "frontal-inf",
      peso: 0.45,
      pts: [[-0.88, 0.12], [-0.68, 0.18], [-0.50, 0.22]],
    },
    {
      id: "intraparietal",
      peso: 0.5,
      pts: [[0.26, 0.60], [0.46, 0.50], [0.64, 0.34]],
    },
    {
      id: "occipital-lat",
      peso: 0.4,
      pts: [[0.70, 0.28], [0.84, 0.12]],
    },
    {
      id: "temporal-sup",
      peso: 0.6,
      pts: [[-0.58, -0.40], [-0.32, -0.42], [-0.04, -0.40], [0.24, -0.36], [0.46, -0.34]],
    },
    {
      id: "temporal-inf",
      peso: 0.4,
      pts: [[-0.52, -0.55], [-0.24, -0.57], [0.06, -0.55], [0.32, -0.49]],
    },
  ];

  const FOLIOS = [
    [[0.34, -0.62], [0.56, -0.60], [0.80, -0.64]],
    [[0.34, -0.72], [0.56, -0.71], [0.81, -0.75]],
    [[0.38, -0.82], [0.56, -0.82], [0.74, -0.84]],
  ];

  /* Centroides REALES de cada estructura, calculados desde las mallas de
     BodyParts3D por scripts/construir_cerebro.py. Ya no son a ojo. */
  const HUBS = {
    dmn: [
      { x: -0.826, y: 0.301, z: -0.239, nombre: "prefrontal medial" },
      { x: 0.616, y: 0.387, z: -0.19, nombre: "cíngulo posterior / precúneo" },
    ],
    ejec: [
      { x: -0.67, y: 0.363, z: -0.038, nombre: "prefrontal dorsolateral" },
      { x: 0.586, y: 0.238, z: 0.074, nombre: "parietal posterior" },
    ],
    sal: [
      { x: -0.365, y: 0.169, z: -0.012, nombre: "ínsula anterior" },
      { x: -0.54, y: 0.231, z: -0.297, nombre: "cíngulo anterior" },
    ],
    vis: [
      { x: 0.676, y: -0.076, z: -0.173, nombre: "corteza occipital" },
      { x: 0.208, y: -0.175, z: -0.026, nombre: "vía ventral" },
    ],
    lim: [
      { x: -0.226, y: -0.1, z: -0.096, nombre: "amígdala" },
      { x: -0.015, y: -0.105, z: -0.075, nombre: "hipocampo" },
    ],
  };

  function dentroDe(x, y, poly) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        hit = !hit;
      }
    }
    return hit;
  }

  /* ¿Cae dentro de la masa cortical (cerebro o temporal)? */
  function dentro(x, y) {
    return dentroDe(x, y, CEREBRO) || dentroDe(x, y, TEMPORAL);
  }

  /* Catmull-Rom: pocos puntos de control, curva suave. */
  function suavizar(pts, pasos, cerrada) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const paso = pasos || 12;
    const out = [];
    const ultimo = cerrada ? n : n - 1;
    for (let i = 0; i < ultimo; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let s = 0; s < paso; s++) {
        const t = s / paso;
        const t2 = t * t;
        const t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    if (!cerrada) out.push(pts[n - 1].slice());
    return out;
  }

  /* Un cerebro lateral real es bastante más largo que alto (~1,4). Con los
     puntos de control tal cual queda en 1,23 — demasiado redondo. Se achata
     una sola vez acá, sobre los datos, para que contornos, surcos y hubs
     queden consistentes sin tocar a los consumidores. Los hubs NO se tocan:
     vienen del atlas y ya están en su escala. */
  const ESC_Y = 0.87;

  [CEREBRO, TEMPORAL, CEREBELO, TRONCO].forEach(function (poly) {
    poly.forEach(function (p) { p[1] *= ESC_Y; });
  });
  SURCOS.forEach(function (s) {
    s.pts.forEach(function (p) { p[1] *= ESC_Y; });
  });
  FOLIOS.forEach(function (f) {
    f.forEach(function (p) { p[1] *= ESC_Y; });
  });

  V.anatomia = {
    CEREBRO: CEREBRO,
    TEMPORAL: TEMPORAL,
    CEREBELO: CEREBELO,
    TRONCO: TRONCO,
    SURCOS: SURCOS,
    FOLIOS: FOLIOS,
    HUBS: HUBS,
    dentro: dentro,
    dentroDe: dentroDe,
    suavizar: suavizar,
  };
})(window);
