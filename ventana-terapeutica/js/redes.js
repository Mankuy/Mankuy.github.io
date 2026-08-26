(function (g) {
  const V = (g.Ventana = g.Ventana || {});

  const REDES = [
    {
      id: "dmn",
      nombre: "Default Mode (DMN)",
      corto: "DMN",
      apodo: "el narrador",
      resumen: "Arma y sostiene la historia de quién sos.",
      color: "#f5c14c",
      que:
        "Es la red del yo narrativo: recuerdos autobiográficos, rumia, el mapa interno de “quién soy”. En reposo suele dominar; con 5-HT2A se desacopla y deja de ser el director del teatro.",
      porque:
        "Si el DMN afloja, la historia rígida (culpa, identidad fija, “siempre fui así”) pierde autoridad. Eso no borra el yo: lo vuelve editable.",
      ahora: {
        base:
          "Está cerrado y eficiente. Predice el mundo con el mismo libreto de siempre. Poca comunicación con saliencia y ejecutiva: cada una en su cuarto.",
        umbral:
          "Los 5-HT2A corticales empiezan a ocuparse. El DMN todavía manda, pero aparecen microfisuras: una sensación de extrañeza, como si la habitación conocida tuviera otra luz.",
        ascenso:
          "Cae la integridad interna del DMN. Precúneo, cingulado posterior y corteza prefrontal medial se desincronizan. El “yo” deja de sentirse compacto.",
        pico:
          "Máxima desintegración y, a la vez, hiperconexión con el resto. El coral del grafo: el DMN ya no es una isla. Es el momento en que una imagen puede reescribir un prior identitario.",
        descenso:
          "Se reensambla, pero no igual. La molécula baja; la red vuelve a tener forma, más porosa. Acá se nombra lo que se vio, sin forzar el cierre.",
        ventana:
          "Días después el DMN puede reconsolidarse con otro peso. Hábitos de rumia y autoimagen están blandos: terapia, vínculo y rutina escriben encima.",
      },
    },
    {
      id: "ejec",
      nombre: "Red ejecutiva",
      corto: "Ejecutiva",
      apodo: "el volante",
      resumen: "Decide a qué prestás atención y planifica.",
      color: "#5ee0c8",
      que:
        "Frontoparietal: atención dirigida, plan, working memory. Es el volante consciente. Trabaja en antigiro con el DMN: cuando una sube, la otra suele bajar.",
      porque:
        "Sin un poco de ejecutiva no hay integración: solo caos. Con demasiada, no hay viaje. El arte clínico es no secuestrar el volante en el pico y sí usarlo en la ventana.",
      ahora: {
        base:
          "Firme, económica. Mantiene metas y filtra ruido. El control cognitivo está “en default laboral”: útil, un poco rígido.",
        umbral:
          "Todavía sostiene el marco (“estoy en un experimento, esto es seguro”). Empieza a negociar con la saliencia, que pide más ancho de banda para lo interoceptivo.",
        ascenso:
          "Suelta el volante un grado. Baja el control de arriba hacia abajo. Aparece pensamiento más asociativo: menos checklist, más metáfora.",
        pico:
          "La frontera con el DMN se vuelve permeable (fenómeno clásico de Carhart-Harris). Planificar se siente extraño; conviene no exigir tareas: sostén, no dirección.",
        descenso:
          "Vuelve la capacidad de ordenar. Es el momento de anclar: una frase, un dibujo, un acuerdo. La ejecutiva cosecha lo que el pico destapó.",
        ventana:
          "Acá sí se entrena. Plasticidad alta + control de vuelta = se pueden instalar hábitos nuevos y desarmar compulsiones con práctica, no con insight suelto.",
      },
    },
    {
      id: "sal",
      nombre: "Red de saliencia",
      corto: "Saliencia",
      apodo: "el portero",
      resumen: "Marca qué importa: cuerpo, emoción, alarma.",
      color: "#ff5c8a",
      que:
        "Ínsula y cingulado anterior. Decide qué importa: un latido, una emoción, una amenaza, una persona. Es el portero entre el mundo interno y el externo.",
      porque:
        "Si la saliencia se atasca en amenaza, todo es alarma. Si se abre con cuidado, el cuerpo vuelve a ser información y no enemigo. Puente terapéutico número uno.",
      ahora: {
        base:
          "Filtra en piloto automático. Mucho de lo corporal ni llega a conciencia. Prioriza lo ya etiquetado como urgente (mail, juicio, hambre).",
        umbral:
          "Se asoma. Pregunta si esto que empieza importa. Calor, ancho del cuerpo, un click atencional: la puerta, no el viaje.",
        ascenso:
          "Sube la ganancia interoceptiva. Latidos, respiración y emoción se vuelven figura. Puede sentirse intenso: no es peligro per se, es el portero abriendo los ojos.",
        pico:
          "Puede inundar. Todo parece significado. El trabajo es discriminar: ¿esto es insight o es saliencia al mango? Presencia quieta > interpretación rápida.",
        descenso:
          "La ganancia baja. Se puede etiquetar con más honestidad qué fue relevante de verdad. El cuerpo pide agua; la red pide sentido, no más estímulo.",
        ventana:
          "Se reentrena el filtro. Exposición suave, mindfulness, vínculo seguro: enseñarle al portero que no todo es fuego. Dura días, no minutos.",
      },
    },
    {
      id: "vis",
      nombre: "Red visual",
      corto: "Visual",
      apodo: "el proyector",
      resumen: "No solo ve: construye lo que ves.",
      color: "#8b6cff",
      que:
        "Occipital y vías ventrales/dorsales. No solo “ve”: construye. Con psilocina hay acoplamiento anómalo corteza visual–asociativa: el ojo interno se enciende.",
      porque:
        "Las visiones no son el objetivo terapéutico, pero son laboratorio perceptual: muestran que el mundo visto también es hipótesis. Eso afloja dogmas, no solo colores.",
      ahora: {
        base:
          "Estable, predictiva. El cerebro rellena más de lo que mide. Poca entropía: las paredes se quedan quietas.",
        umbral:
          "Primera porosidad: bordes más vivos, afterimages, un pulso en la periferia. Todavía podés negar que “empezó”.",
        ascenso:
          "Sube el acoplamiento visual-asociativo. Patrones, geometría, caras en la madera. La red deja de ser cámara y se vuelve sintetizador.",
        pico:
          "Máxima entropía perceptual. Ojos cerrados pueden ser más intensos que abiertos. No pelear la imagen: es cortex predictivo sin freno, no un oráculo literal.",
        descenso:
          "Las formas se apagan. Queda la memoria de que la percepción es plástica. Útil para hablar después de sesgos, no para coleccionar visiones.",
        ventana:
          "Casi no hay visuales. Lo que queda es la lección: ver es inferir. Se puede usar en terapia para cuestionar “lo que vi / lo que soy” como hecho cerrado.",
      },
    },
    {
      id: "lim",
      nombre: "Red límbica",
      corto: "Límbica",
      apodo: "la emoción",
      resumen: "Le pone color emocional y memoria a todo.",
      color: "#ff8a4c",
      que:
        "Amígdala, hipocampo, estriado ventral: afecto, memoria emocional, valencia. Es el color de lo que pasa, no el subtítulo.",
      porque:
        "El material que importa (duelo, apego, miedo) vive acá. Si se abre con sostén, se puede reconsolidar. Si se empuja, se re-traumatiza. Ritmo > profundidad forzada.",
      ahora: {
        base:
          "Los valences están catalogados. Lo que asusta asusta; lo que se evita se evita. El hipocampo archiva con la etiqueta de siempre.",
        umbral:
          "Primera humedad afectiva. Puede aparecer ternura o ansiedad sin objeto. La amígdala registra novedad: “esto no está en el catálogo”.",
        ascenso:
          "Sube el acceso a memoria emocional. Escenas viejas vuelven con cuerpo. No es regresión mágica: es desinhibición de circuitos habitualmente tapados por el DMN.",
        pico:
          "Alta plasticidad afectiva. Una mirada o un silencio pueden recablear el peso de un recuerdo. Acá se sostiene, no se interpreta encima. Seguridad primero.",
        descenso:
          "El oleaje baja. Es el momento de anclar el afecto en palabras simples, no en teoría. El cuerpo cierra lo que la corteza todavía quiere explicar.",
        ventana:
          "Nardou: la criticidad límbica sigue abierta. Exposición, apego, duelo trabajado — ahora pegan distinto. El viaje destapó; estos días recablean.",
      },
    },
  ];

  /* Pares: qué pasa cuando dos redes se miran. Clave = ids en el orden de REDES. */
  const PARES = {
    "dmn+ejec": {
      titulo: "Narrador × Volante",
      texto:
        "Se turnan: cuando una sube, la otra baja. Es el eje del control. En el pico la frontera se vuelve porosa y planificar se siente raro; en la ventana, con el volante de vuelta y la historia todavía blanda, es cuando se puede reescribir de verdad.",
    },
    "dmn+sal": {
      titulo: "Narrador × Portero",
      texto:
        "El portero decide qué entra; el narrador decide qué significa. Si el portero marca todo como urgente y el narrador lo explica con el libreto viejo, se refuerza la rumia. Acá se rompe ese circuito: entra material nuevo antes de que la historia lo etiquete.",
    },
    "dmn+vis": {
      titulo: "Narrador × Proyector",
      texto:
        "Los dos rellenan más de lo que miden. Ver que la imagen se inventa sola es la puerta más barata para sospechar que la autobiografía también. La lección no son los colores: es que percibir es apostar.",
    },
    "dmn+lim": {
      titulo: "Narrador × Emoción",
      texto:
        "Un recuerdo con carga afectiva vuelve, y el narrador ya no lo puede archivar con la etiqueta de siempre. Esa ventana entre que la escena aparece y que se guarda de nuevo es donde el peso de un recuerdo cambia.",
    },
    "ejec+sal": {
      titulo: "Volante × Portero",
      texto:
        "Negocian el ancho de banda. El portero pide atención para el cuerpo, el volante quiere sostener el marco. El equilibrio clínico es dejar entrar sin perder el hilo de que esto es seguro y va a terminar.",
    },
    "ejec+vis": {
      titulo: "Volante × Proyector",
      texto:
        "El volante quiere entender la imagen; el proyector no da explicaciones. Interpretar en caliente casi siempre inventa. Anotar y volver después es lo que sirve.",
    },
    "ejec+lim": {
      titulo: "Volante × Emoción",
      texto:
        "La pareja del trabajo terapéutico. Sola, la emoción inunda; solo, el volante intelectualiza. Juntos: sentir con suficiente cabeza como para poder nombrarlo. Ese cruce es más útil en el descenso y en los días de la ventana que en el pico.",
    },
    "sal+vis": {
      titulo: "Portero × Proyector",
      texto:
        "Cuando el portero le pone importancia a lo que el proyector inventa, cualquier patrón parece un mensaje. Es lindo y es una trampa: intensidad no es evidencia.",
    },
    "sal+lim": {
      titulo: "Portero × Emoción",
      texto:
        "El circuito del miedo y del alivio. El portero abre, la emoción llega con cuerpo. Con sostén se reconsolida; sin sostén se re-traumatiza. Acá el ritmo importa más que la profundidad.",
    },
    "vis+lim": {
      titulo: "Proyector × Emoción",
      texto:
        "Imagen y afecto pegados: una escena que además se siente. Por eso las visiones cargadas se recuerdan tanto. El valor no está en la imagen sino en el afecto que destapó.",
    },
  };

  /* Clima sistémico por fase: cómo está el conjunto, no cada parte. */
  const CLIMA = {
    base: "Cada red en su cuarto. Comunicación baja y previsible: el cerebro gasta poco porque ya sabe qué esperar.",
    umbral: "Empiezan a escucharse entre sí. Nada dramático todavía: es la puerta abriéndose.",
    ascenso: "Caen los muros entre redes. Aparecen conexiones que en sobriedad no existen.",
    pico: "Máxima mezcla. Redes que normalmente se ignoran quedan cableadas entre sí — el coral del grafo.",
    descenso: "Cada red vuelve a su forma, pero las fronteras quedaron más finas. Momento de ordenar, no de destapar.",
    ventana: "Vuelve la arquitectura normal con las conexiones todavía blandas. Lo que se practique estos días se graba con menos resistencia.",
  };

  /* Lectura de conjunto cuando están las cinco. */
  const TODAS = {
    base:
      "Retrato de sobriedad: el narrador manda, el volante ejecuta, el portero filtra en automático, el proyector predice y la emoción está catalogada. Eficiente y rígido — es el punto de partida contra el que se mide todo lo demás.",
    umbral:
      "La molécula ocupa receptores y el sistema entero cambia de tono. Todavía podés dudar de que empezó. Todo lo que viene ya está en marcha, solo que en voz baja.",
    ascenso:
      "El sistema se afloja de arriba hacia abajo: menos control, más asociación, más cuerpo, más memoria disponible. Es la subida real, y conviene no pelearla.",
    pico:
      "Las cinco redes hablando a la vez. Máxima entropía y máxima oportunidad: una frase o un silencio pesan acá lo que en otro momento no pesarían. Sostén, no interpretación.",
    descenso:
      "El sistema se reordena con el material afuera. La cabeza vuelve a poder ordenar y el cuerpo pide cierre. Es la mejor hora para poner en palabras simples lo que pasó.",
    ventana:
      "La molécula ya no está y la arquitectura sí volvió, pero blanda. Los cinco sistemas aceptan reescritura con menos pelea: terapia, hábitos, vínculo. El viaje fue la llave; esto es la casa.",
  };

  const POR_ID = {};
  const ORDEN = {};
  REDES.forEach(function (r, i) {
    POR_ID[r.id] = r;
    ORDEN[r.id] = i;
  });

  function de(id) {
    return POR_ID[id] || null;
  }

  function ordenar(ids) {
    return (ids || [])
      .filter(function (id) {
        return !!POR_ID[id];
      })
      .sort(function (a, b) {
        return ORDEN[a] - ORDEN[b];
      });
  }

  function ficha(id, faseId) {
    const r = de(id);
    if (!r) return null;
    const fid = faseId || "base";
    return {
      id: r.id,
      nombre: r.nombre,
      corto: r.corto,
      apodo: r.apodo,
      resumen: r.resumen,
      color: r.color,
      que: r.que,
      porque: r.porque,
      ahora: r.ahora[fid] || r.ahora.base,
    };
  }

  function par(a, b) {
    const k = ORDEN[a] < ORDEN[b] ? a + "+" + b : b + "+" + a;
    return PARES[k] || null;
  }

  /* Tarjeta de combinación. Con 2 redes: el par. Con 3+: los pares del conjunto.
     Con las 5: la lectura completa. Siempre con el clima de la fase. */
  function combo(ids, faseId) {
    const lista = ordenar(ids);
    if (lista.length < 2) return null;
    const fid = faseId || "base";
    const nombres = lista.map(function (id) {
      return POR_ID[id].corto;
    });
    const todas = lista.length === REDES.length;
    const lineas = [];
    if (todas) {
      lineas.push({ titulo: "El cerebro entero", texto: TODAS[fid] || TODAS.base });
    }
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const p = par(lista[i], lista[j]);
        if (p) lineas.push(p);
      }
    }
    return {
      ids: lista,
      todas: todas,
      titulo: todas ? "Las cinco juntas" : nombres.join(" + "),
      colores: lista.map(function (id) {
        return POR_ID[id].color;
      }),
      clima: CLIMA[fid] || CLIMA.base,
      lineas: lineas,
    };
  }

  V.redes = {
    lista: REDES,
    de: de,
    ficha: ficha,
    combo: combo,
    ordenar: ordenar,
    clima: function (fid) {
      return CLIMA[fid] || CLIMA.base;
    },
  };
})(window);
