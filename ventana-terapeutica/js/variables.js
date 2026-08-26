/* Las cuatro curvas, en castellano. Lo que mide cada una, por qué importa
   y qué está haciendo en la fase actual. */
(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const VARS = [
    {
      id: "psilo",
      nombre: "Ocupación 5-HT2A",
      apodo: "cuántos receptores tiene tomados la molécula",
      color: "#8b6cff",
      que:
        "Porcentaje de receptores de serotonina 2A corticales ocupados por psilocina, el metabolito activo de la psilocibina. Se calcula a partir de la psilocina en sangre con el modelo de sitio único de Madsen 2019: mitad de ocupación cerca de 2 µg/L, techo alrededor del 77 %.",
      porque:
        "Es el eslabón entre la dosis y todo lo demás, y explica lo que más se malentiende: los receptores se saturan. Duplicar los gramos no duplica el efecto — 25 mg ya ocupan cerca del 70 %, y de ahí para arriba lo que crece es la duración, no la profundidad. Fijate también que esta curva cae mucho antes que la plasticidad: la molécula se va y el trabajo recién empieza.",
      ahora: {
        base: "En cero. Los receptores están libres.",
        umbral: "Subiendo rápido: la psilocina empieza a ocupar receptores corticales.",
        ascenso: "Ocupación alta y todavía creciendo, cerca de la zona de saturación.",
        pico: "En el máximo posible para esta dosis.",
        descenso: "Bajando con la eliminación. Los receptores se van liberando.",
        ventana: "Prácticamente cero. Que no haya molécula no significa que no pase nada.",
      },
    },
    {
      id: "entropia",
      nombre: "Entropía",
      apodo: "cuán desordenada está la actividad",
      color: "#ff5c8a",
      que:
        "Cuánta variedad hay en la actividad cerebral momento a momento. Baja entropía = estados repetidos y previsibles. Alta = el cerebro visita configuraciones que en sobriedad casi no aparecen.",
      porque:
        "Es el mejor correlato de la intensidad subjetiva. Ojo con el atajo: más entropía no es mejor. Va unos minutos atrás de la molécula, así que el pico de la experiencia llega después del pico en sangre.",
      ahora: {
        base: "Baja. El cerebro repite estados conocidos.",
        umbral: "Empieza a moverse, con retraso respecto de la molécula.",
        ascenso: "Subiendo fuerte. Aparecen configuraciones inusuales.",
        pico: "Máxima. Acá es donde la experiencia se siente más rara y más abierta.",
        descenso: "Bajando. La actividad se vuelve a ordenar.",
        ventana: "De vuelta cerca de la basal. La flexibilidad que queda ya no es entropía: es plasticidad.",
      },
    },
    {
      id: "plasticidad",
      nombre: "Plasticidad",
      apodo: "cuán moldeable está el cableado",
      color: "#3ddc97",
      que:
        "Facilidad para formar y podar sinapsis. Se abre durante la sesión y, según Nardou 2023, sigue abierta días después — con una duración que depende del compuesto y no del largo del viaje.",
      porque:
        "Es la curva del efecto terapéutico. Se separa de las otras tres: cuando la molécula ya no está y la entropía volvió a lo normal, esta sigue arriba. Ahí es donde la terapia hace su trabajo.",
      ahora: {
        base: "Basal. El cerebro cambia al ritmo de siempre.",
        umbral: "Se asoma, empujada por la ocupación de receptores.",
        ascenso: "Subiendo, todavía atada a la molécula.",
        pico: "Alta. Empieza a despegarse de la farmacocinética.",
        descenso: "Sigue subiendo mientras la molécula baja. Acá se ve la disociación.",
        ventana: "Meseta alta y después descenso lento. Este tramo, de días, es el que importa clínicamente.",
      },
    },
    {
      id: "priors",
      nombre: "Priors",
      apodo: "cuánto manda lo que ya creías",
      color: "#f5c14c",
      que:
        "El peso de las expectativas previas sobre lo que llega de los sentidos. El cerebro predice constantemente; los priors son cuánta autoridad tienen esas predicciones. Es la curva de REBUS: relaxed beliefs under psychedelics.",
      porque:
        "Es la única que baja. Con priors firmes, la evidencia nueva rebota. Cuando aflojan, una experiencia puede corregir una creencia — sobre uno mismo, sobre los demás, sobre lo que es posible. Eso es lo que hace que una sesión cambie algo.",
      ahora: {
        base: "Firmes. El mundo se predice más de lo que se mira.",
        umbral: "Primer aflojamiento. Lo conocido se siente apenas distinto.",
        ascenso: "Bajando. Lo familiar se vuelve poroso.",
        pico: "En el mínimo. Casi cualquier creencia queda abierta a revisión.",
        descenso: "Empiezan a reafirmarse, pero no en la misma posición.",
        ventana: "Blandos durante días. Por eso lo que se practique ahora pesa distinto.",
      },
    },
  ];

  const POR_ID = {};
  VARS.forEach(function (v) {
    POR_ID[v.id] = v;
  });

  function de(id) {
    return POR_ID[id] || null;
  }

  function ficha(id, faseId) {
    const v = de(id);
    if (!v) return null;
    const fid = faseId || "base";
    return {
      id: v.id,
      nombre: v.nombre,
      apodo: v.apodo,
      color: v.color,
      que: v.que,
      porque: v.porque,
      ahora: v.ahora[fid] || v.ahora.base,
    };
  }

  V.variables = { lista: VARS, de: de, ficha: ficha, orden: VARS.map(function (v) { return v.id; }) };
})(window);
