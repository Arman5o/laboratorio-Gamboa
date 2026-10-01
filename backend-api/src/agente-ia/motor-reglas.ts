/**
 * ═══════════════════════════════════════════════════════════════════
 *  MOTOR DE REGLAS DE AIDA — Agente Inteligente del Área
 *  Laboratorio Gamboa
 * ───────────────────────────────────────────────────────────────────
 *  Capacidades:
 *  ✅ Extracción de entidades del lenguaje natural (NLU)
 *  ✅ Llenado progresivo de slots (slot-filling)
 *  ✅ Memoria de sesión por conversación
 *  ✅ Razonamiento visible (chain-of-thought)
 *  ✅ Sin dependencias externas — 100% autónomo
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── TIPOS ──────────────────────────────────────────────────────────

export interface CitaSlots {
  examen?: string;
  fecha?: string;  // formato YYYY-MM-DD
  hora?: string;   // formato HH:MM
}

export interface ContextoSesion {
  nombre?: string;
  ultimaIntencion?: string;
  turno: number;
  temaActual?: string;         // 'cita' | undefined
  citaSlots?: CitaSlots;       // datos de cita acumulados
}

export interface ResultadoAgente {
  pensamiento: string;
  respuesta: string;
  intencion: string;
  // Cuando el agente tiene todos los datos para crear cita
  accion?: 'PEDIR_EXAMEN' | 'PEDIR_FECHA' | 'PEDIR_HORA' | 'CONFIRMAR_CITA';
  citaSlots?: CitaSlots;
  opcionesExamen?: string[];
}

// ─── CATÁLOGO DE EXÁMENES (mapeo de sinónimos → nombre oficial) ──────

const EXAMENES_CATALOGO: Record<string, string> = {
  // Sangre
  'sangre': 'Análisis de Sangre (Rutina)',
  'sangre completa': 'Análisis de Sangre (Rutina)',
  'hemograma': 'Análisis de Sangre (Rutina)',
  'biometria': 'Análisis de Sangre (Rutina)',
  'biometría': 'Análisis de Sangre (Rutina)',
  'rutina': 'Análisis de Sangre (Rutina)',
  'análisis de sangre': 'Análisis de Sangre (Rutina)',
  'examen de sangre': 'Análisis de Sangre (Rutina)',
  // PCR
  'pcr': 'Detección Molecular (PCR)',
  'molecular': 'Detección Molecular (PCR)',
  'covid': 'Detección Molecular (PCR)',
  'coronavirus': 'Detección Molecular (PCR)',
  'detección molecular': 'Detección Molecular (PCR)',
  // Orina
  'orina': 'Análisis de Orina (Completo)',
  'orina completa': 'Análisis de Orina (Completo)',
  'urinalisis': 'Análisis de Orina (Completo)',
  'análisis de orina': 'Análisis de Orina (Completo)',
  'examen de orina': 'Análisis de Orina (Completo)',
  // Lípidos
  'lipídico': 'Perfil Lipídico',
  'lipidico': 'Perfil Lipídico',
  'perfil lipídico': 'Perfil Lipídico',
  'colesterol': 'Perfil Lipídico',
  'triglicéridos': 'Perfil Lipídico',
  'trigliceridos': 'Perfil Lipídico',
  'lípidos': 'Perfil Lipídico',
  'lipidos': 'Perfil Lipídico',
  // Glucosa
  'glucosa': 'Prueba de Tolerancia a la Glucosa',
  'azúcar': 'Prueba de Tolerancia a la Glucosa',
  'azucar': 'Prueba de Tolerancia a la Glucosa',
  'glucemia': 'Prueba de Tolerancia a la Glucosa',
  'diabetes': 'Prueba de Tolerancia a la Glucosa',
  'tolerancia': 'Prueba de Tolerancia a la Glucosa',
  'tolerancia a la glucosa': 'Prueba de Tolerancia a la Glucosa',
};

const EXAMENES_OFICIALES = [
  'Análisis de Sangre (Rutina)',
  'Detección Molecular (PCR)',
  'Análisis de Orina (Completo)',
  'Perfil Lipídico',
  'Prueba de Tolerancia a la Glucosa',
];

// ─── EXTRACCIÓN DE ENTIDADES (NLU) ──────────────────────────────────

/**
 * Normaliza texto: minúsculas, sin tildes, sin signos
 */
function norm(t: string): string {
  return t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡]/g, '').trim();
}

/**
 * Extrae el examen del texto libre.
 * Busca sinónimos de mayor a menor especificidad.
 */
function extraerExamen(texto: string): string | null {
  const t = norm(texto);

  // Primero buscar frases exactas (más específicas)
  const sinonimosPorLongitud = Object.keys(EXAMENES_CATALOGO)
    .sort((a, b) => b.length - a.length);

  for (const sinonimo of sinonimosPorLongitud) {
    if (t.includes(norm(sinonimo))) {
      return EXAMENES_CATALOGO[sinonimo];
    }
  }
  return null;
}

/**
 * Extrae la fecha del texto libre.
 * Soporta: "hoy", "mañana", "pasado mañana", días de semana, fechas numéricas.
 * Retorna formato YYYY-MM-DD.
 */
function extraerFecha(texto: string, ahora: Date): string | null {
  const t = norm(texto);

  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  const formatFecha = (d: Date) => d.toISOString().split('T')[0];

  // Palabras de días relativos
  if (/\bhoy\b/.test(t)) return formatFecha(hoy);

  if (/\bmanana\b/.test(t) || /\bmañana\b/.test(norm(texto.toLowerCase()))) {
    const d = new Date(hoy); d.setDate(d.getDate() + 1); return formatFecha(d);
  }

  if (/pasado\s*manana/.test(t)) {
    const d = new Date(hoy); d.setDate(d.getDate() + 2); return formatFecha(d);
  }

  // Días de la semana
  const diasSemana: Record<string, number> = {
    'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4,
    'viernes': 5, 'sabado': 6, 'domingo': 0,
  };
  for (const [dia, num] of Object.entries(diasSemana)) {
    if (t.includes(dia)) {
      const d = new Date(hoy);
      const diaSemanaActual = d.getDay();
      let diff = num - diaSemanaActual;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return formatFecha(d);
    }
  }

  // Fechas numéricas: "el 20", "el 20 de septiembre", "20/09", "20-09"
  const meses: Record<string, number> = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
  };

  // "el 20 de septiembre" o "20 de septiembre"
  const matchDiaMes = t.match(/(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1]);
    const mesNombre = matchDiaMes[2];
    const mes = meses[mesNombre];
    if (mes) {
      const año = ahora.getFullYear();
      const d = new Date(año, mes - 1, dia);
      return formatFecha(d);
    }
  }

  // YYYY-MM-DD (Formato de input type="date")
  const matchISO = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchISO) {
    const d = new Date(parseInt(matchISO[1]), parseInt(matchISO[2]) - 1, parseInt(matchISO[3]));
    return formatFecha(d);
  }

  // "20/09" o "20-09"
  const matchNumerico = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (matchNumerico) {
    const dia = parseInt(matchNumerico[1]);
    const mes = parseInt(matchNumerico[2]);
    const año = matchNumerico[3] ? parseInt(matchNumerico[3]) : ahora.getFullYear();
    const añoCompleto = año < 100 ? 2000 + año : año;
    const d = new Date(añoCompleto, mes - 1, dia);
    return formatFecha(d);
  }

  // Solo "el 20" o "el 5"
  const matchSoloDia = t.match(/\bel\s+(\d{1,2})\b/);
  if (matchSoloDia) {
    const dia = parseInt(matchSoloDia[1]);
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), dia);
    // Si ya pasó este mes, ir al próximo
    if (d < hoy) d.setMonth(d.getMonth() + 1);
    return formatFecha(d);
  }

  return null;
}

/**
 * Extrae la hora del texto libre.
 * Soporta: "a las 10", "10:30", "10 y media", "3 de la tarde", "10am"
 * Retorna formato HH:MM.
 */
function extraerHora(texto: string): string | null {
  const t = norm(texto);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

  // "10:30" o "10:00"
  const matchExacta = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (matchExacta) {
    let h = parseInt(matchExacta[1]);
    const m = parseInt(matchExacta[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return fmt(h, m);
  }

  // "10am" o "10pm"
  const matchAmPm = t.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (matchAmPm) {
    let h = parseInt(matchAmPm[1]);
    if (matchAmPm[2] === 'pm' && h < 12) h += 12;
    if (matchAmPm[2] === 'am' && h === 12) h = 0;
    return fmt(h, 0);
  }

  // "las 3 de la tarde" / "3 de la tarde"
  const matchTarde = t.match(/\b(\d{1,2})\s+de\s+la\s+tarde\b/);
  if (matchTarde) {
    let h = parseInt(matchTarde[1]);
    if (h < 12) h += 12;
    return fmt(h, 0);
  }

  // "las 10 de la mañana" / "10 de la mañana"
  const matchManana = t.match(/\b(\d{1,2})\s+de\s+la\s+mañana\b/);
  if (matchManana || t.match(/\b(\d{1,2})\s+de\s+la\s+manana\b/)) {
    const m2 = matchManana || t.match(/\b(\d{1,2})\s+de\s+la\s+manana\b/);
    if (m2) return fmt(parseInt(m2[1]), 0);
  }

  // "a las 10 y media"
  const matchYMedia = t.match(/(?:a\s+las?\s+)?(\d{1,2})\s+y\s+media/);
  if (matchYMedia) {
    return fmt(parseInt(matchYMedia[1]), 30);
  }

  // "a las 10 y cuarto"
  const matchYCuarto = t.match(/(?:a\s+las?\s+)?(\d{1,2})\s+y\s+cuarto/);
  if (matchYCuarto) {
    return fmt(parseInt(matchYCuarto[1]), 15);
  }

  // "a las 10" / "las 10" / "a las diez"
  const matchSimple = t.match(/(?:a\s+)?las?\s+(\d{1,2})\b/);
  if (matchSimple) {
    const h = parseInt(matchSimple[1]);
    if (h >= 1 && h <= 23) return fmt(h, 0);
  }

  // Número solo al inicio si es hora válida (8-18): "10", "14"
  const matchSolo = t.match(/^\s*(\d{1,2})\s*$/);
  if (matchSolo) {
    const h = parseInt(matchSolo[1]);
    if (h >= 8 && h <= 18) return fmt(h, 0);
  }

  return null;
}

/**
 * Detecta si el mensaje parece intención de programar cita,
 * incluso sin keywords explícitas.
 */
function esProgramarCita(texto: string): boolean {
  const t = norm(texto);
  const patrones = [
    /(?:programe?|agenda|reserva?|quiero|necesito|haz?|haga).*(cita|turno|examen|análisis|analisis)/,
    /(?:cita|turno).*(para|el|hoy|mañana|manana|lunes|martes|miércoles|miercoles|jueves|viernes)/,
    /(?:para|el|hoy|mañana).*(cita|turno)/,
  ];
  return patrones.some(p => p.test(t));
}

/**
 * Formatea una fecha YYYY-MM-DD a texto legible.
 */
function formatearFechaLegible(fecha: string): string {
  const [año, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(año, mes - 1, dia);
  return d.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── MOTOR PRINCIPAL ─────────────────────────────────────────────────

function aleatorio<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Motor principal de AIDA.
 * Detecta intención, extrae entidades y gestiona el flujo de slots.
 */
export function procesarConMotorDeReglas(
  mensaje: string,
  contexto: ContextoSesion,
): ResultadoAgente {
  const ahora = new Date();
  const t = norm(mensaje);

  contexto.turno += 1;

  // ══════════════════════════════════════════════════════════
  // CASO 1: Estamos en flujo de cita — intentar extraer slots
  // ══════════════════════════════════════════════════════════
  const enFlujoCita = contexto.temaActual === 'cita';
  const intentaCita = esProgramarCita(mensaje);

  if (enFlujoCita || intentaCita) {
    return manejarFlujoCita(mensaje, contexto, ahora);
  }

  // ══════════════════════════════════════════════════════════
  // CASO 2: Intención libre — detectar y responder
  // ══════════════════════════════════════════════════════════
  return manejarIntencionLibre(mensaje, t, contexto);
}

/**
 * Gestiona el flujo progresivo de recopilación de datos para cita.
 */
function manejarFlujoCita(
  mensaje: string,
  contexto: ContextoSesion,
  ahora: Date,
): ResultadoAgente {
  // Inicializar slots si no existen
  if (!contexto.citaSlots) contexto.citaSlots = {};
  const slots = contexto.citaSlots;

  contexto.temaActual = 'cita';
  contexto.ultimaIntencion = 'programar_cita';

  // ── EXTRAER ENTIDADES del mensaje actual ──
  const examenExtractado = extraerExamen(mensaje);
  const fechaExtractada = extraerFecha(mensaje, ahora);
  const horaExtractada = extraerHora(mensaje);

  const hoyStr = ahora.toISOString().split('T')[0];
  const pad = (n: number) => n.toString().padStart(2, '0');
  const horaActualStr = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

  // Validar y acumular slots
  if (examenExtractado) slots.examen = examenExtractado;

  if (fechaExtractada) {
    if (fechaExtractada < hoyStr) {
      return {
        pensamiento: "El usuario dio una fecha en el pasado. La rechazo.",
        respuesta: "⚠️ Esa fecha ya pasó. Por favor dime una fecha de hoy en adelante:",
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots },
      };
    }
    slots.fecha = fechaExtractada;
  }

  if (horaExtractada) {
    if (slots.fecha === hoyStr && horaExtractada <= horaActualStr) {
      return {
        pensamiento: "El usuario dio una hora que ya pasó el día de hoy. La rechazo.",
        respuesta: `⚠️ La hora **${horaExtractada}** ya pasó hoy. Por favor elige un horario posterior a la hora actual:`,
        intencion: 'programar_cita',
        accion: 'PEDIR_HORA',
        citaSlots: { ...slots },
      };
    }
    slots.hora = horaExtractada;
  }

  // ── Construir pensamiento de razonamiento ──
  const pensamientoParts: string[] = [];
  pensamientoParts.push(`Analizando: "${mensaje.substring(0, 70)}".`);
  pensamientoParts.push('Estoy en flujo de programación de cita.');

  if (examenExtractado) pensamientoParts.push(`✓ Examen detectado: "${examenExtractado}".`);
  if (fechaExtractada) pensamientoParts.push(`✓ Fecha detectada: ${fechaExtractada}.`);
  if (horaExtractada) pensamientoParts.push(`✓ Hora detectada: ${horaExtractada}.`);

  const slotsFaltantes: string[] = [];
  if (!slots.examen) slotsFaltantes.push('examen');
  if (!slots.fecha) slotsFaltantes.push('fecha');
  if (!slots.hora) slotsFaltantes.push('hora');

  if (slotsFaltantes.length > 0) {
    pensamientoParts.push(`Faltan: [${slotsFaltantes.join(', ')}]. Debo pedir el primero faltante.`);
  } else {
    pensamientoParts.push('¡Tengo todos los datos! Puedo confirmar la cita.');
  }

  const pensamiento = pensamientoParts.join(' ');

  // ── DECISIÓN: ¿Qué falta? ──

  // Si falta el examen, pedirlo con opciones
  if (!slots.examen) {
    let intro = '';
    if (slots.fecha && slots.hora) {
      intro = `¡Perfecto! Para el **${formatearFechaLegible(slots.fecha)}** a las **${slots.hora}**.\n\n`;
    } else if (slots.fecha) {
      intro = `¡Anotado! Para el **${formatearFechaLegible(slots.fecha)}**.\n\n`;
    } else if (slots.hora) {
      intro = `¡Anotado! A las **${slots.hora}**.\n\n`;
    }

    return {
      pensamiento,
      respuesta: `${intro}¿Qué análisis necesitas hacerte?`,
      intencion: 'programar_cita',
      accion: 'PEDIR_EXAMEN',
      citaSlots: { ...slots },
      opcionesExamen: EXAMENES_OFICIALES,
    };
  }

  // Si falta la fecha, pedirla
  if (!slots.fecha) {
    return {
      pensamiento,
      respuesta: `Entendido, un **${slots.examen}**${slots.hora ? ` a las **${slots.hora}**` : ''}.\n\n¿Para qué fecha te agendo? (Ej: "hoy", "mañana", "el viernes")`,
      intencion: 'programar_cita',
      accion: 'PEDIR_FECHA',
      citaSlots: { ...slots },
    };
  }

  // Si falta la hora, pedirla
  if (!slots.hora) {
    return {
      pensamiento,
      respuesta: `¡Listo! **${slots.examen}** el **${formatearFechaLegible(slots.fecha)}**.\n\n¿A qué hora prefieres venir? Atendemos de 8am a 6pm.`,
      intencion: 'programar_cita',
      accion: 'PEDIR_HORA',
      citaSlots: { ...slots },
    };
  }

  // ¡TODOS LOS SLOTS COMPLETOS! → Confirmar
  const resumenCita = `📋 **Resumen de tu cita:**\n\n🔬 **Examen:** ${slots.examen}\n📅 **Fecha:** ${formatearFechaLegible(slots.fecha)}\n🕐 **Hora:** ${slots.hora}\n\n¿Todo correcto? ¿Confirmo la cita?`;

  return {
    pensamiento,
    respuesta: resumenCita,
    intencion: 'programar_cita',
    accion: 'CONFIRMAR_CITA',
    citaSlots: { ...slots },
  };
}

// ─── INTENCIONES LIBRES (sin flujo de cita) ──────────────────────────

interface ReglaSencilla {
  nombre: string;
  prioridad: number;
  patrones: RegExp[];
  palabrasClave: string[];
  pensamientos: string[];
  respuestas: string[];
}

const REGLAS: ReglaSencilla[] = [
  {
    nombre: 'saludo',
    prioridad: 10,
    patrones: [/^(hola|hello|hi|buenas|buenos|hey|que tal|saludos)/],
    palabrasClave: ['hola', 'hello', 'buenas', 'buenos dias', 'buenos tardes', 'buenos noches', 'hey', 'saludos', 'que tal', 'como estas'],
    pensamientos: [
      'El usuario me está saludando. Me presento rápidamente.',
    ],
    respuestas: [
      '¡Hola! 👋 Soy **AIDA**, tu agente del Lab. Gamboa.\n\n¿En qué te ayudo hoy?',
    ],
  },
  {
    nombre: 'horarios',
    prioridad: 15,
    patrones: [/(horario|hora|cuando|abierto|atienden|disponible)/],
    palabrasClave: ['horario', 'que hora', 'cuando abren', 'cuando atienden', 'dias de atencion', 'horario de atencion', 'estan abiertos'],
    pensamientos: [
      'Pregunta sobre horarios de atención. Respondo directo.',
    ],
    respuestas: [
      '🕐 Atendemos de **Lunes a Viernes de 08:00 a 18:00 hrs**.\n\n¿Quieres agendar algo?',
    ],
  },
  {
    nombre: 'preparacion_general',
    prioridad: 20,
    patrones: [/(preparar|preparacion|ayuno|antes).*(examen|analisis|estudio|prueba)/,
               /(como|que).*(debo|hago|hacer).*(antes|preparar)/],
    palabrasClave: ['como prepararme', 'preparacion', 'ayuno', 'que debo hacer antes', 'instrucciones'],
    pensamientos: [
      'Pregunta genérica sobre preparación. Le pido que especifique.',
    ],
    respuestas: [
      '📋 La preparación depende del examen. ¿Cuál te vas a hacer? (Ej: Sangre, Glucosa, Orina)',
    ],
  },
  {
    nombre: 'preparacion_sangre',
    prioridad: 25,
    patrones: [/(preparar|preparacion|ayuno).*(sangre|hemograma|biometria)/,
               /(sangre|hemograma).*(preparar|ayuno|antes|como)/],
    palabrasClave: ['sangre', 'hemograma', 'biometria', 'preparacion sangre', 'ayuno sangre'],
    pensamientos: ['Consulta sobre preparación para sangre.'],
    respuestas: [
      '🩸 Para sangre: Ayuno de **8 horas** (solo agua). Nada de alcohol ni ejercicio intenso 24h antes.\n\n¿Te agendo cita?',
    ],
  },
  {
    nombre: 'preparacion_lipidos',
    prioridad: 25,
    patrones: [/(preparar|preparacion).*(lipidico|lipidos|colesterol|trigliceridos)/,
               /(lipidico|colesterol|trigliceridos).*(preparar|ayuno|antes|como)/],
    palabrasClave: ['perfil lipidico', 'colesterol', 'trigliceridos', 'lipidos', 'preparacion colesterol'],
    pensamientos: ['Consulta sobre preparación lípidos.'],
    respuestas: [
      '🧬 Para perfil lipídico: Ayuno de **12 a 14 horas**. Cero alcohol y nada de grasas pesadas 72h antes.\n\n¿Te agendo?',
    ],
  },
  {
    nombre: 'preparacion_glucosa',
    prioridad: 25,
    patrones: [/(preparar|preparacion).*(glucosa|azucar|diabetes|tolerancia)/,
               /(glucosa|diabetes).*(preparar|ayuno|antes|como)/],
    palabrasClave: ['glucosa', 'azucar', 'diabetes', 'glicemia', 'tolerancia a la glucosa'],
    pensamientos: ['Consulta sobre preparación glucosa.'],
    respuestas: [
      '🩺 Para glucosa: Ayuno de **8 a 10 horas** y evita azúcares 2 días antes.\n\n¿Quieres programar tu cita?',
    ],
  },
  {
    nombre: 'preparacion_orina',
    prioridad: 25,
    patrones: [/(preparar|preparacion).*(orina|urina)/,
               /(orina).*(preparar|como|antes|que)/],
    palabrasClave: ['orina', 'analisis de orina', 'examen de orina', 'preparacion orina'],
    pensamientos: ['Consulta sobre preparación orina.'],
    respuestas: [
      '🧪 Para orina: Aseo genital previo, descarta el primer chorro y recolecta el resto en el frasco.\n\n¿Agendamos?',
    ],
  },
  {
    nombre: 'preparacion_pcr',
    prioridad: 25,
    patrones: [/(preparar|preparacion).*(pcr|molecular|covid)/,
               /(pcr|molecular|covid).*(preparar|antes|como)/],
    palabrasClave: ['pcr', 'molecular', 'covid', 'preparacion pcr'],
    pensamientos: ['Consulta sobre preparación PCR.'],
    respuestas: [
      '🦠 Para PCR: No comas ni bebas nada **2 horas antes** y ven con mascarilla.\n\n¿Te agendo tu turno?',
    ],
  },
  {
    nombre: 'resultados',
    prioridad: 20,
    patrones: [/(resultado|informe|reporte|pdf).*(examen|analisis|laboratorio)?/,
               /(donde|como|cuando).*(resultado|informe)/,
               /(estan|salieron|listos|disponibles).*(resultado|examen)/],
    palabrasClave: ['mis resultados', 'resultado', 'informe', 'reporte', 'pdf resultado', 'cuando salen', 'listos'],
    pensamientos: ['Consulta de resultados.'],
    respuestas: [
      '📊 ¡Tus resultados los descargas en la sección **"Resultados Clínicos"** de tu panel principal!',
    ],
  },
  {
    nombre: 'cancelar_cita',
    prioridad: 18,
    patrones: [/(cancelar|anular|eliminar).*(cita|turno)/,
               /(no puedo|no podre|imposible).*(ir|asistir)/],
    palabrasClave: ['cancelar cita', 'anular cita', 'no puedo ir', 'cancelar turno'],
    pensamientos: ['Quiere cancelar.'],
    respuestas: [
      '❌ Puedes cancelar desde la sección **"Mis Citas"** en tu panel principal. ¡Intenta hacerlo con 2h de anticipación!',
    ],
  },
  {
    nombre: 'examenes_disponibles',
    prioridad: 15,
    patrones: [/(que|cuales).*(examenes|analisis|estudios|pruebas).*(hacen|realizan|tienen|ofrecen)?/,
               /(catalogo|lista|tipos).*(examen|analisis)/],
    palabrasClave: ['que examenes', 'cuales analisis', 'servicios disponibles', 'que hacen', 'examenes disponibles'],
    pensamientos: ['Lista de exámenes.'],
    respuestas: [
      '🔬 Realizamos exámenes de: Sangre (Rutina), Perfil Lipídico, Glucosa, Orina y PCR.\n\nDime cuál necesitas y te agendo.',
    ],
  },
  {
    nombre: 'precios',
    prioridad: 12,
    patrones: [/(precio|costo|valor|cuanto|cuesta|cobran|tarifa)/],
    palabrasClave: ['precio', 'costo', 'cuanto cuesta', 'tarifa', 'cuanto cobran'],
    pensamientos: ['Pregunta precios.'],
    respuestas: [
      '💰 Los precios varían. Te darán el costo exacto en recepción cuando asistas a tu cita.\n\n¿Te agendo una?',
    ],
  },
  {
    nombre: 'consultar_citas',
    prioridad: 18,
    patrones: [/(mis|ver|consultar|revisar).*(citas|turnos)/,
               /(tengo|hay).*(cita|turno).*(programad|agendad)/,
               /cuando.*(cita|turno)/],
    palabrasClave: ['mis citas', 'ver citas', 'mis turnos', 'tengo cita', 'proxima cita'],
    pensamientos: ['Quiere ver sus citas.'],
    respuestas: [
      '🗓️ Entra a la sección **"Mis Citas"** de tu panel para ver tus turnos programados.',
    ],
  },
  {
    nombre: 'despedida',
    prioridad: 10,
    patrones: [/(gracias|adios|hasta luego|chao|bye|cuídate|cuiDate)/],
    palabrasClave: ['gracias', 'muchas gracias', 'hasta luego', 'adios', 'chao', 'bye', 'cuídate'],
    pensamientos: ['Despedida.'],
    respuestas: [
      '¡Con gusto! 👋 Si necesitas algo más, aquí estaré.',
    ],
  },
  {
    nombre: 'desconocido',
    prioridad: 0,
    patrones: [],
    palabrasClave: [],
    pensamientos: [
      'No entendí la intención.',
    ],
    respuestas: [
      'Hmm, no entendí. 🤔 Puedes pedirme agendar una cita, o consultarme sobre preparación y horarios.',
    ],
  },
];

function manejarIntencionLibre(
  _mensaje: string,
  textoNorm: string,
  contexto: ContextoSesion,
): ResultadoAgente {
  let mejorRegla: ReglaSencilla | null = null;
  let mejorPuntuacion = -1;

  for (const regla of REGLAS) {
    if (regla.nombre === 'desconocido') continue;

    let puntuacion = 0;
    for (const patron of regla.patrones) {
      if (patron.test(textoNorm)) puntuacion += 10 + regla.prioridad;
    }
    for (const kw of regla.palabrasClave) {
      if (textoNorm.includes(norm(kw))) puntuacion += 5;
    }

    if (puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion;
      mejorRegla = regla;
    }
  }

  if (!mejorRegla || mejorPuntuacion < 5) {
    mejorRegla = REGLAS.find(r => r.nombre === 'desconocido')!;
  }

  const pensamiento = `Analizando: "${_mensaje.substring(0, 60)}". Intención detectada → [${mejorRegla.nombre.toUpperCase()}] (puntuación: ${mejorPuntuacion}). ${aleatorio(mejorRegla.pensamientos)}`;

  contexto.ultimaIntencion = mejorRegla.nombre;

  return {
    pensamiento,
    respuesta: aleatorio(mejorRegla.respuestas),
    intencion: mejorRegla.nombre,
  };
}
