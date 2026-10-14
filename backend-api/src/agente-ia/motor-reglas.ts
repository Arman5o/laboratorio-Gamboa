/**
 * ═══════════════════════════════════════════════════════════════════
 *  MOTOR DE REGLAS Y RAZONAMIENTO COGNITIVO DE AIDA
 *  Agente Inteligente del Laboratorio Gamboa (Dr. Armando Gamboa)
 * ───────────────────────────────────────────────────────────────────
 *  Capacidades de Inteligencia y Razonamiento:
 *  ✅ Extracción NLU multiidioma (Español, Chino 中文, Inglés)
 *  ✅ Corrección de palabras mezcladas, errores de tipeo y abreviaciones (Fuzzy Matching & Levenshtein)
 *  ✅ Diálogo natural e interacción completa ("responde a cualquier cosa")
 *  ✅ Pensamiento razonable visible paso a paso (Chain-of-Thought)
 *  ✅ Llenado progresivo de slots para citas (slot-filling clínico)
 *  ✅ Base de conocimiento clínico integral del laboratorio
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── TIPOS DE DATOS ──────────────────────────────────────────────────

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
  idiomaDetectado?: string;
}

export interface ResultadoAgente {
  pensamiento: string;
  respuesta: string;
  intencion: string;
  accion?: 'PEDIR_EXAMEN' | 'PEDIR_FECHA' | 'PEDIR_HORA' | 'CONFIRMAR_CITA';
  citaSlots?: CitaSlots;
  opcionesExamen?: string[];
}

export const EXAMENES_OFICIALES = [
  'Análisis de Sangre (Rutina)',
  'Detección Molecular (PCR)',
  'Análisis de Orina (Completo)',
  'Perfil Lipídico',
  'Prueba de Tolerancia a la Glucosa',
];

// ─── DICCIONARIOS DE EXÁMENES MULTIIDIOMA ──────────────────────────

const EXAMENES_CATALOGO: Record<string, string> = {
  // Sangre (Español, Chino, Inglés)
  'sangre': 'Análisis de Sangre (Rutina)',
  'sangre completa': 'Análisis de Sangre (Rutina)',
  'hemograma': 'Análisis de Sangre (Rutina)',
  'biometria': 'Análisis de Sangre (Rutina)',
  'biometría': 'Análisis de Sangre (Rutina)',
  'rutina': 'Análisis de Sangre (Rutina)',
  'análisis de sangre': 'Análisis de Sangre (Rutina)',
  'examen de sangre': 'Análisis de Sangre (Rutina)',
  'blood': 'Análisis de Sangre (Rutina)',
  'blood test': 'Análisis de Sangre (Rutina)',
  'cbc': 'Análisis de Sangre (Rutina)',
  '血液': 'Análisis de Sangre (Rutina)',
  '验血': 'Análisis de Sangre (Rutina)',
  '血液检查': 'Análisis de Sangre (Rutina)',
  '血常规': 'Análisis de Sangre (Rutina)',
  '抽血': 'Análisis de Sangre (Rutina)',

  // PCR / Molecular
  'pcr': 'Detección Molecular (PCR)',
  'molecular': 'Detección Molecular (PCR)',
  'covid': 'Detección Molecular (PCR)',
  'coronavirus': 'Detección Molecular (PCR)',
  'hisopado': 'Detección Molecular (PCR)',
  'detección molecular': 'Detección Molecular (PCR)',
  'covid test': 'Detección Molecular (PCR)',
  'molecular test': 'Detección Molecular (PCR)',
  '核酸': 'Detección Molecular (PCR)',
  '核酸检测': 'Detección Molecular (PCR)',
  '新冠': 'Detección Molecular (PCR)',
  '新冠检测': 'Detección Molecular (PCR)',
  '分子检测': 'Detección Molecular (PCR)',

  // Orina
  'orina': 'Análisis de Orina (Completo)',
  'orina completa': 'Análisis de Orina (Completo)',
  'urinalisis': 'Análisis de Orina (Completo)',
  'análisis de orina': 'Análisis de Orina (Completo)',
  'examen de orina': 'Análisis de Orina (Completo)',
  'urine': 'Análisis de Orina (Completo)',
  'urine test': 'Análisis de Orina (Completo)',
  'urinalysis': 'Análisis de Orina (Completo)',
  '尿': 'Análisis de Orina (Completo)',
  '尿检': 'Análisis de Orina (Completo)',
  '尿常规': 'Análisis de Orina (Completo)',
  '验尿': 'Análisis de Orina (Completo)',

  // Perfil Lipídico
  'lipídico': 'Perfil Lipídico',
  'lipidico': 'Perfil Lipídico',
  'perfil lipídico': 'Perfil Lipídico',
  'colesterol': 'Perfil Lipídico',
  'triglicéridos': 'Perfil Lipídico',
  'trigliceridos': 'Perfil Lipídico',
  'lípidos': 'Perfil Lipídico',
  'lipidos': 'Perfil Lipídico',
  'lipid': 'Perfil Lipídico',
  'lipid profile': 'Perfil Lipídico',
  'cholesterol': 'Perfil Lipídico',
  'triglycerides': 'Perfil Lipídico',
  '血脂': 'Perfil Lipídico',
  '胆固醇': 'Perfil Lipídico',
  '甘油三酯': 'Perfil Lipídico',
  '血脂全套': 'Perfil Lipídico',

  // Glucosa
  'glucosa': 'Prueba de Tolerancia a la Glucosa',
  'azúcar': 'Prueba de Tolerancia a la Glucosa',
  'azucar': 'Prueba de Tolerancia a la Glucosa',
  'glucemia': 'Prueba de Tolerancia a la Glucosa',
  'glicemia': 'Prueba de Tolerancia a la Glucosa',
  'diabetes': 'Prueba de Tolerancia a la Glucosa',
  'tolerancia': 'Prueba de Tolerancia a la Glucosa',
  'tolerancia a la glucosa': 'Prueba de Tolerancia a la Glucosa',
  'glucose': 'Prueba de Tolerancia a la Glucosa',
  'glucose tolerance': 'Prueba de Tolerancia a la Glucosa',
  'blood sugar': 'Prueba de Tolerancia a la Glucosa',
  '血糖': 'Prueba de Tolerancia a la Glucosa',
  '糖耐量': 'Prueba de Tolerancia a la Glucosa',
  '糖尿病': 'Prueba de Tolerancia a la Glucosa',
  '葡萄糖耐量': 'Prueba de Tolerancia a la Glucosa',
};

// ─── ALGORITMOS DE FUZZY MATCHING & DISTANCIA DE EDICIÓN ───────────

/**
 * Normaliza texto eliminando acentos, caracteres repetidos excesivos y signos.
 */
function norm(t: string): string {
  if (!t) return '';
  return t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡!?.,;:()_"-]/g, ' ')
    // Reduce más de 2 caracteres repetidos: "hooooola" -> "hola"
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distancia Damerau-Levenshtein: calcula inserciones, eliminaciones,
 * sustituciones y transposiciones de letras adyacentes (letras mezcladas).
 */
function distanciaDamerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matriz: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matriz[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,      // Eliminación
        matriz[i][j - 1] + 1,      // Inserción
        matriz[i - 1][j - 1] + costo // Sustitución
      );

      // Transposición de letras adyacentes ("snagre" vs "sangre")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matriz[i][j] = Math.min(matriz[i][j], matriz[i - 2][j - 2] + 1);
      }
    }
  }
  return matriz[al][bl];
}

/**
 * Similitud entre 0.0 (totalmente diferente) y 1.0 (idéntico).
 */
function calcularSimilitud(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = distanciaDamerauLevenshtein(a, b);
  return Math.max(0, (maxLen - dist) / maxLen);
}

// Diccionario de corrección rápida para abreviaciones de chat y errores comunes
const MAPA_CORRECCIONES_RAPIDAS: Record<string, string> = {
  'hla': 'hola', 'ola': 'hola', 'holla': 'hola', 'hi': 'hola', 'hello': 'hola',
  'q': 'que', 'k': 'que', 'ke': 'que', 'qe': 'que',
  'q tal': 'que tal', 'qtal': 'que tal', 'ktal': 'que tal',
  'bns': 'buenas', 'bens': 'buenas', 'bueans': 'buenas', 'buens': 'buenas',
  'bns dias': 'buenos dias', 'bns noches': 'buenas noches', 'bns tardes': 'buenas tardes',
  'qiero': 'quiero', 'kiero': 'quiero', 'kero': 'quiero', 'quiro': 'quiero',
  'nesecito': 'necesito', 'nesesito': 'necesito', 'nececito': 'necesito', 'necesto': 'necesito',
  'cta': 'cita', 'ctia': 'cita', 'sitah': 'cita', 'sita': 'cita', 'turnoo': 'turno', 'truno': 'turno',
  'agndar': 'agendar', 'agendr': 'agendar', 'ajendar': 'agendar', 'agendarte': 'agendar',
  'progrmar': 'programar', 'pogramar': 'programar', 'progamar': 'programar',
  'resrvar': 'reservar', 'rezervar': 'reservar',
  'sngre': 'sangre', 'snagre': 'sangre', 'sangr': 'sangre', 'hemogrma': 'hemograma',
  'biometra': 'biometria', 'bometria': 'biometria',
  'analsis': 'analisis', 'analss': 'analisis', 'análisis': 'analisis',
  'exmen': 'examen', 'exman': 'examen', 'examn': 'examen', 'examenes': 'examen',
  'dctor': 'doctor', 'dotor': 'doctor', 'doctol': 'doctor', 'medico': 'doctor',
  'ayno': 'ayuno', 'aynar': 'ayunar', 'desayuno': 'desayuno',
  'perfl': 'perfil', 'lpidico': 'lipidico', 'lipidco': 'lipidico', 'colestrol': 'colesterol', 'colesterl': 'colesterol',
  'trigliseridos': 'trigliceridos', 'triglicerids': 'trigliceridos',
  'glcosa': 'glucosa', 'glucoza': 'glucosa', 'azukr': 'azucar', 'azucr': 'azucar', 'diabtes': 'diabetes',
  'orna': 'orina', 'orinaa': 'orina', 'urina': 'orina',
  'pcrr': 'pcr', 'covi': 'covid', 'covd': 'covid', 'moleculr': 'molecular',
  'horaro': 'horario', 'orario': 'horario', 'horarios': 'horario',
  'precyo': 'precio', 'precios': 'precio', 'presio': 'precio', 'kosto': 'costo', 'kuanto': 'cuanto',
  'resltados': 'resultados', 'resulados': 'resultados', 'reusltados': 'resultados',
  'grcias': 'gracias', 'grasias': 'gracias', 'grx': 'gracias', 'grax': 'gracias', 'thx': 'gracias',
  'chaoo': 'chao', 'xao': 'chao', 'adios': 'adios', 'adio': 'adios', 'bye': 'adios'
};

/**
 * Interpreta texto con palabras mezcladas o errores de tipeo y retorna el texto corregido
 * junto con la lista de correcciones detectadas para el razonamiento.
 */
function interpretarTextoConFuzzy(texto: string): { textoNormalizado: string, correcciones: string[] } {
  const palabras = norm(texto).split(' ');
  const correcciones: string[] = [];

  const palabrasProcesadas = palabras.map(palabra => {
    if (palabra.length <= 1) return palabra;

    // 1. Revisión de mapa rápido
    if (MAPA_CORRECCIONES_RAPIDAS[palabra]) {
      const correccion = MAPA_CORRECCIONES_RAPIDAS[palabra];
      if (correccion !== palabra) {
        correcciones.push(`"${palabra}" → "${correccion}"`);
      }
      return correccion;
    }

    // 2. Fuzzy matching contra el catálogo de términos clínicos
    let mejorPalabra = palabra;
    let mejorSimilitud = 0;

    for (const terminoClave of Object.keys(MAPA_CORRECCIONES_RAPIDAS)) {
      const sim = calcularSimilitud(palabra, terminoClave);
      if (sim > 0.72 && sim > mejorSimilitud) {
        mejorSimilitud = sim;
        mejorPalabra = MAPA_CORRECCIONES_RAPIDAS[terminoClave];
      }
    }

    if (mejorSimilitud > 0.72 && mejorPalabra !== palabra) {
      correcciones.push(`"${palabra}" → "${mejorPalabra}" (similitud: ${(mejorSimilitud * 100).toFixed(0)}%)`);
      return mejorPalabra;
    }

    return palabra;
  });

  return {
    textoNormalizado: palabrasProcesadas.join(' '),
    correcciones
  };
}

// ─── DETECCIÓN DE IDIOMAS ──────────────────────────────────────────

function detectarIdioma(texto: string): { esChino: boolean, esIngles: boolean, esEspanol: boolean, esMixto: boolean, descripcion: string } {
  const tieneChino = /[\u4e00-\u9fa5]/.test(texto);
  const textoMinuscula = texto.toLowerCase();
  
  const tokensIngles = ['hello', 'hi', 'blood', 'test', 'appointment', 'doctor', 'hours', 'price', 'cost', 'results', 'urine', 'fasting', 'please', 'thank', 'thanks'];
  const tieneIngles = tokensIngles.some(w => new RegExp(`\\b${w}\\b`).test(textoMinuscula));
  
  const tokensEspanol = ['hola', 'buenos', 'cita', 'sangre', 'orina', 'doctor', 'horario', 'precio', 'gracias', 'quiero', 'cuanto', 'como'];
  const tieneEspanol = tokensEspanol.some(w => new RegExp(`\\b${w}\\b`).test(textoMinuscula)) || (!tieneChino && !tieneIngles);

  const esMixto = (tieneChino && (tieneEspanol || tieneIngles)) || (tieneIngles && tieneEspanol);

  let descripcion = 'Español';
  if (tieneChino && tieneEspanol) descripcion = 'Bilingüe (Chino y Español 中西双语)';
  else if (tieneChino) descripcion = 'Chino (中文)';
  else if (tieneIngles && tieneEspanol) descripcion = 'Bilingüe (Inglés y Español)';
  else if (tieneIngles) descripcion = 'Inglés (English)';

  return { esChino: tieneChino, esIngles: tieneIngles, esEspanol: tieneEspanol, esMixto, descripcion };
}

// ─── EXTRACCIÓN DE ENTIDADES (EXAMEN, FECHA, HORA) ─────────────────

function extraerExamen(texto: string): string | null {
  const t = norm(texto);

  // Buscar primero coincidencias exactas o en chino
  const clavesOrdenadas = Object.keys(EXAMENES_CATALOGO).sort((a, b) => b.length - a.length);
  for (const clave of clavesOrdenadas) {
    if (texto.includes(clave) || t.includes(norm(clave))) {
      return EXAMENES_CATALOGO[clave];
    }
  }

  // Buscar con fuzzy match para palabras con letras mezcladas ("analsis de sngre", "perfl lpidico")
  const { textoNormalizado } = interpretarTextoConFuzzy(texto);
  for (const clave of clavesOrdenadas) {
    if (textoNormalizado.includes(norm(clave))) {
      return EXAMENES_CATALOGO[clave];
    }
  }

  return null;
}

function extraerFecha(texto: string, ahora: Date): string | null {
  const t = norm(texto);
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  const formatFecha = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Español, Chino e Inglés: hoy / 今天 / today
  if (/\bhoy\b/.test(t) || texto.includes('今天') || /\btoday\b/.test(t)) {
    return formatFecha(hoy);
  }

  // mañana / 明天 / tomorrow
  if (/\bmanana\b/.test(t) || texto.includes('明天') || /\btomorrow\b/.test(t)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return formatFecha(d);
  }

  // pasado mañana / 后天 / day after tomorrow
  if (/pasado\s*manana/.test(t) || texto.includes('后天')) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return formatFecha(d);
  }

  // Días de la semana en español, chino e inglés
  const diasSemana: Record<string, number> = {
    'lunes': 1, 'monday': 1, '周一': 1, '星期一': 1,
    'martes': 2, 'tuesday': 2, '周二': 2, '星期二': 2,
    'miercoles': 3, 'wednesday': 3, '周三': 3, '星期三': 3,
    'jueves': 4, 'thursday': 4, '周四': 4, '星期四': 4,
    'viernes': 5, 'friday': 5, '周五': 5, '星期五': 5,
    'sabado': 6, 'saturday': 6, '周六': 6, '星期六': 6,
    'domingo': 0, 'sunday': 0, '周日': 0, '星期日': 0,
  };

  for (const [diaStr, num] of Object.entries(diasSemana)) {
    if (t.includes(diaStr) || texto.includes(diaStr)) {
      const d = new Date(hoy);
      const diaActual = d.getDay();
      let diff = num - diaActual;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return formatFecha(d);
    }
  }

  // Fechas en formato ISO: YYYY-MM-DD
  const matchISO = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchISO) {
    return matchISO[0];
  }

  // Fechas en formato Chino: 10月15日 o 2026年10月15日
  const matchChino = texto.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?/);
  if (matchChino) {
    const año = matchChino[1] ? parseInt(matchChino[1]) : ahora.getFullYear();
    const mes = parseInt(matchChino[2]);
    const dia = parseInt(matchChino[3]);
    const d = new Date(año, mes - 1, dia);
    return formatFecha(d);
  }

  // Fechas numéricas: "15/10", "15-10", "15/10/2026"
  const matchNumerico = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (matchNumerico) {
    const dia = parseInt(matchNumerico[1]);
    const mes = parseInt(matchNumerico[2]);
    const año = matchNumerico[3] ? parseInt(matchNumerico[3]) : ahora.getFullYear();
    const añoFull = año < 100 ? 2000 + año : año;
    const d = new Date(añoFull, mes - 1, dia);
    return formatFecha(d);
  }

  // Texto español: "el 15 de octubre"
  const meses: Record<string, number> = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
  };
  const matchDiaMes = t.match(/(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1]);
    const mesNombre = matchDiaMes[2];
    const mes = meses[mesNombre];
    if (mes) {
      const d = new Date(ahora.getFullYear(), mes - 1, dia);
      return formatFecha(d);
    }
  }

  return null;
}

function extraerHora(texto: string): string | null {
  const t = norm(texto);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

  // Formato chino: 上午8点, 下午3点, 8点30, 8点半
  const matchChino = texto.match(/(上午|下午|早上|晚上)?\s*(\d{1,2})\s*点(?:\s*(半)|(\d{1,2})\s*分?)?/);
  if (matchChino) {
    const periodo = matchChino[1];
    let h = parseInt(matchChino[2]);
    let m = 0;
    if (matchChino[3] === '半') m = 30;
    else if (matchChino[4]) m = parseInt(matchChino[4]);

    if ((periodo === '下午' || periodo === '晚上') && h < 12) h += 12;
    return fmt(h, m);
  }

  // "10:30" o "08:00"
  const matchExacta = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (matchExacta) {
    const h = parseInt(matchExacta[1]);
    const m = parseInt(matchExacta[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return fmt(h, m);
  }

  // "8am" / "3pm"
  const matchAmPm = t.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (matchAmPm) {
    let h = parseInt(matchAmPm[1]);
    if (matchAmPm[2] === 'pm' && h < 12) h += 12;
    if (matchAmPm[2] === 'am' && h === 12) h = 0;
    return fmt(h, 0);
  }

  // "a las 10 y media"
  const matchYMedia = t.match(/(?:a\s+las?\s+)?(\d{1,2})\s+y\s+media/);
  if (matchYMedia) {
    return fmt(parseInt(matchYMedia[1]), 30);
  }

  // "a las 8" / "las 8"
  const matchSimple = t.match(/(?:a\s+)?las?\s+(\d{1,2})\b/);
  if (matchSimple) {
    const h = parseInt(matchSimple[1]);
    if (h >= 7 && h <= 18) return fmt(h, 0);
  }

  // Número solo entre 7 y 18
  const matchSolo = t.match(/^\s*(\d{1,2})\s*$/);
  if (matchSolo) {
    const h = parseInt(matchSolo[1]);
    if (h >= 7 && h <= 18) return fmt(h, 0);
  }

  return null;
}

function esIntencionCita(texto: string, textoFuzzy: string): boolean {
  const t = `${norm(texto)} ${textoFuzzy}`;

  // Si el usuario pregunta por información ("quiero saber", "quisiera consultar", "想了解"), no es intento directo de agendar
  if (/quiero\s+saber|quisiera\s+saber|deseo\s+saber|quiero\s+consultar|quiero\s+averiguar|想了解|想知道|quiero\s+informacion/i.test(t)) {
    return false;
  }

  const palabrasCita = [
    'cita', 'turno', 'agendar', 'programar', 'reservar', 'apartar',
    '预约', '挂号', '约时间', '想约',
    'book', 'appointment', 'schedule'
  ];
  if (palabrasCita.some(p => t.includes(norm(p)) || texto.includes(p))) {
    return true;
  }

  // Detectar deseo explícito de examen ("quiero un analisis de sangre", "necesito hacerme un pcr", "想做血常规")
  const verbosDeseo = [
    'quiero un', 'quiero una', 'necesito un', 'necesito una',
    'deseo hacerme', 'quisiera hacerme', 'hacerme un', 'hacerme una',
    'tomarme un', 'tomarme una', 'realizarme un', 'realizarme una',
    'me gustaria hacerme', '想做', '想查', '要验', '要测'
  ];
  const tieneDeseo = verbosDeseo.some(v => t.includes(v) || texto.includes(v));
  const examenEncontrado = extraerExamen(texto) || extraerExamen(textoFuzzy);
  if (tieneDeseo && examenEncontrado) {
    return true;
  }

  return false;
}

function formatearFechaLegible(fecha: string): string {
  const [año, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(año, mes - 1, dia);
  return d.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── BASE DE CONOCIMIENTO Y REGLAS DE RESPUESTA INTELIGENTE ────────

interface ReglaInteligente {
  categoria: string;
  palabrasClave: string[];
  patrones: RegExp[];
  palabrasChinas: string[];
  palabrasIngles: string[];
  generarRespuesta: (idioma: ReturnType<typeof detectarIdioma>, nombre?: string) => { respuesta: string, razonamiento: string };
}

const REGLAS_CLINICAS: ReglaInteligente[] = [
  // 1. SALUDOS E INTERACCIÓN INICIAL
  {
    categoria: 'SALUDO',
    palabrasClave: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'saludos', 'hey'],
    patrones: [/^(hola|buenas|buenos|que tal|saludos|hey)/],
    palabrasChinas: ['你好', '您好', '早上好', '下午好', '晚上好', '嗨'],
    palabrasIngles: ['hello', 'hi', 'good morning', 'good afternoon', 'hey'],
    generarRespuesta: (idioma, nombre) => {
      const saludoNombre = nombre ? ` ${nombre}` : '';
      if (idioma.esChino) {
        return {
          razonamiento: `El paciente envía un saludo en idioma chino/mixto. Respondo con cortesía bilingüe presentándome como AIDA del Laboratorio Gamboa.`,
          respuesta: `您好！👋 我是甘博亚实验室（Lab. Gamboa）的智能医疗助理 **AIDA**。\n\n¡Hola${saludoNombre}! Soy **AIDA**, asistente virtual del Laboratorio Clínico Gamboa.\n\n我可以帮您预约检查、查询注意事项、营业时间或化验报告。\n¿En qué te puedo ayudar hoy? (Agendar citas, preparación para exámenes, horarios o resultados).`
        };
      }
      if (idioma.esIngles && !idioma.esEspanol) {
        return {
          razonamiento: `The user greets in English. Responding cordially as AIDA from Lab Gamboa with English/Spanish assistance.`,
          respuesta: `Hello${saludoNombre}! 👋 I'm **AIDA**, your AI clinical assistant at Lab. Gamboa.\n\nHow can I assist you today? You can ask me to schedule an appointment, check lab hours, exam prep guidelines, or lab results!`
        };
      }
      return {
        razonamiento: `El usuario inició la conversación con un saludo amigable. Me presento como AIDA y ofrezco las opciones principales de atención médica.`,
        respuesta: `¡Hola${saludoNombre}! 👋 Qué gusto saludarte. Soy **AIDA**, la asistente inteligente del **Laboratorio Clínico Gamboa**.\n\n¿En qué te puedo colaborar el día de hoy? Puedo ayudarte a:\n• 🩺 **Agendar una nueva cita** para tus exámenes.\n• 📋 **Consultar preparación y requisitos de ayuno**.\n• 🕐 **Informarte sobre nuestros horarios y ubicación**.\n• 📊 **Guiarte para ver tus resultados clínicos**.`
      };
    }
  },

  // 2. ESTADO DE ÁNIMO ("¿CÓMO ESTÁS?")
  {
    categoria: 'ESTADO_ANIMO',
    palabrasClave: ['como estas', 'como te va', 'que tal todo', 'como andas', 'todo bien'],
    patrones: [/como (estas|te va|andas)/, /todo bien/],
    palabrasChinas: ['你好吗', '怎么样', '过得好吗'],
    palabrasIngles: ['how are you', 'how is it going', 'how are you doing'],
    generarRespuesta: (idioma, nombre) => {
      if (idioma.esChino) {
        return {
          razonamiento: `El usuario pregunta por mi estado en chino/mixto. Respondo amablemente y pregunto por su salud.`,
          respuesta: `我很好，谢谢您的关心！😊 我时刻准备好为您提供最优质的实验室服务。\n\n¡Muy bien, gracias por preguntar! Siempre lista y atenta para ayudarte con tus análisis clínicos en el Lab. Gamboa. ¿Qué consulta o examen tienes en mente?`
        };
      }
      return {
        razonamiento: `El usuario consulta por mi estado. Respondo con calidez humana y empatía profesional, invitándolo a consultar su salud.`,
        respuesta: `¡Excelente, gracias por preguntar${nombre ? `, ${nombre}` : ''}! 😊 Estoy activa y con toda la energía para ayudarte a cuidar tu salud en el **Laboratorio Gamboa**.\n\n¿Cómo te encuentras tú? ¿Hay algún análisis o consulta que desees resolver hoy?`
      };
    }
  },

  // 3. IDENTIDAD Y CAPACIDADES DE AIDA
  {
    categoria: 'IDENTIDAD',
    palabrasClave: ['quien eres', 'que eres', 'como te llamas', 'que haces', 'que puedes hacer', 'eres un robot', 'eres ia', 'eres bot'],
    patrones: [/quien eres/, /como te llamas/, /que (haces|puedes hacer)/, /eres (ia|bot|robot|humano)/],
    palabrasChinas: ['你是谁', '你叫什么', '你能做什么', '你是机器人吗', '你的功能'],
    palabrasIngles: ['who are you', 'what can you do', 'what is your name', 'are you ai', 'are you a robot'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `El usuario pregunta por mi identidad en chino/mixto. Explico mis funciones clínicas en Lab Gamboa.`,
          respuesta: `我是 **AIDA**（智能医疗助理），甘博亚实验室的专属AI。👨‍⚕️🔬\n\n我的核心能力包括：\n1. 📅 自动为您智能安排化验时间。\n2. 🩸 详细告知抽血、验尿、PCR等检查的空腹与禁忌。\n3. 📊 协助查询检测报告与状态。\n\nSoy **AIDA**, la inteligencia artificial médica del Laboratorio Gamboa. ¡Dime qué necesitas y te ayudo de inmediato!`
        };
      }
      return {
        razonamiento: `El paciente pregunta por mi identidad y funciones. Detallo mis capacidades clínicas y apoyo al Dr. Armando Gamboa.`,
        respuesta: `Soy **AIDA** (Asistente Inteligente de Diagnóstico y Agenda) del **Laboratorio Gamboa**, dirigida bajo la supervisión médica del **Dr. Armando Gamboa Orellana** 👨‍⚕️.\n\nEstoy capacitada para:\n1. 🩺 **Agendar citas automáticamente** analizando horarios y protocolos de ayuno.\n2. 🩸 **Explicarte la preparación exacta** para sangre, orina, PCR, lípidos y glucosa.\n3. 🔍 **Comprender tus mensajes** incluso si escribes rápido, con errores de tipeo o en otros idiomas como chino o inglés.\n4. 📊 **Guiarte en la entrega y descarga** de tus resultados clínicos en PDF.`
      };
    }
  },

  // 4. DIRECTOR MÉDICO (DR. ARMANDO GAMBOA)
  {
    categoria: 'DIRECTOR_MEDICO',
    palabrasClave: ['doctor', 'dr armando', 'gamboa', 'director', 'quien atiende', 'medico', 'profesional'],
    patrones: [/(doctor|medico|dr|responsable|director).*(gamboa|laboratorio)?/],
    palabrasChinas: ['医生', '甘博亚医生', '主任', '谁负责'],
    palabrasIngles: ['doctor', 'dr gamboa', 'who is the doctor'],
    generarRespuesta: (idioma) => {
      return {
        razonamiento: `El usuario consulta por el equipo médico o el Dr. Armando Gamboa. Proporciono información de respaldo profesional y confianza clínica.`,
        respuesta: `👨‍⚕️ El director y especialista a cargo es el **Dr. Armando Gamboa Orellana**, profesional bioquímico-clínico con amplia trayectoria en diagnóstico de laboratorio, hematología y biología molecular.\n\nTodos los análisis y resultados procesados en nuestro laboratorio cuentan con su validación y los más estrictos controles de calidad biológica.`
      };
    }
  },

  // 5. HORARIOS DE ATENCIÓN
  {
    categoria: 'HORARIOS',
    palabrasClave: ['horario', 'hora', 'cuando abren', 'cuando atienden', 'a que hora', 'estan abiertos', 'dias atienden', 'feriados', 'sabado'],
    patrones: [/(horario|hora|cuando|abierto|atienden|disponible|abren|cierran)/],
    palabrasChinas: ['营业时间', '上班时间', '几点开门', '几点关门', '工作时间', '周末开门吗'],
    palabrasIngles: ['hours', 'opening hours', 'what time', 'when are you open', 'schedule'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `El usuario consulta los horarios en chino/mixto. Proporciono el horario exacto del laboratorio de 07:30 a 18:00.`,
          respuesta: `🕐 **甘博亚实验室营业时间 / Horario de Atención:**\n\n• **周一至周五 / Lunes a Viernes:** 07:30 - 18:00 hrs.\n• **抽血建议时间 / Toma de muestras:** 07:30 - 11:30 hrs（保证空腹准确性 / por protocolo de ayuno）.\n\n您想在哪个时间段预约？¿Deseas que te agende una cita en nuestro horario laboral?`
        };
      }
      return {
        razonamiento: `El paciente consulta los horarios del laboratorio. Explico el horario regular y el bloque matutino recomendado para muestras en ayunas.`,
        respuesta: `🕐 **Horarios de Atención — Laboratorio Clínico Gamboa:**\n\n• **Lunes a Viernes:** 07:30 a 18:00 hrs (jornada continua).\n• **Toma de muestras en ayuno (sangre, lípidos, glucosa):** Se recomienda de **07:30 a 11:30 hrs** para garantizar la estabilidad de los parámetros biológicos.\n\n¿Te gustaría programar tu turno para hoy o algún día de esta semana?`
      };
    }
  },

  // 6. UBICACIÓN Y CONTACTO
  {
    categoria: 'UBICACION_CONTACTO',
    palabrasClave: ['donde estan', 'direccion', 'donde queda', 'ubicacion', 'como llegar', 'telefono', 'whatsapp', 'contacto'],
    patrones: [/(donde|direccion|ubicacion|como llegar|telefono|contacto|donde quedan)/],
    palabrasChinas: ['地址', '在哪里', '位置', '怎么走', '电话', '联系方式'],
    palabrasIngles: ['where are you', 'address', 'location', 'phone', 'contact'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Consulta de dirección o contacto en chino/mixto. Respondo con los canales oficiales y ubicación.`,
          respuesta: `📍 **实验室地址与联系方式 / Ubicación y Contacto:**\n\n• **地址 / Dirección:** Laboratorio Clínico Gamboa, Centro Médico Central.\n• **电话 / Teléfono & WhatsApp:** Contacto disponible a través del sistema web y recepción.\n• **营业时间 / Horario:** Lunes a Viernes 07:30 a 18:00 hrs.\n\n如果您需要前来检查，我可以先帮您预约好时间！`
        };
      }
      return {
        razonamiento: `El usuario pregunta por la ubicación o contacto del laboratorio. Brindo los detalles de localización y canales.`,
        respuesta: `📍 **Ubicación y Contacto — Laboratorio Gamboa:**\n\n• **Instalaciones Centrales:** Edificio de Diagnóstico Clínico Gamboa.\n• **Atención:** Lunes a Viernes de 07:30 a 18:00 hrs.\n• **Contacto Digital:** A través de este portal PWA interactivo o directamente en recepción.\n\n¿Deseas agendar tu turno con anticipación para ser atendido sin filas?`
      };
    }
  },

  // 7. PRECIOS Y MÉTODOS DE PAGO
  {
    categoria: 'PRECIOS_PAGOS',
    palabrasClave: ['precio', 'costo', 'valor', 'cuanto cuesta', 'cuanto cobran', 'tarifa', 'pagar', 'tarjeta', 'transferencia', 'efectivo'],
    patrones: [/(precio|costo|valor|cuanto|cuesta|cobran|tarifa|forma de pago|tarjeta|transferencia)/],
    palabrasChinas: ['多少钱', '价格', '费用', '收费', '贵不贵', '支付方式', '刷卡'],
    palabrasIngles: ['price', 'cost', 'how much', 'fee', 'payment', 'card'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `El usuario pregunta por costos y métodos de pago en chino/mixto.`,
          respuesta: `💰 **检查费用与支付方式 / Precios y Pagos:**\n\n• 甘博亚实验室提供最具性价比与高质量标准的化验服务。\n• **支付方式 / Métodos de pago:** 现金 (Efectivo)、银行转账 (Transferencia)、银行卡 (Tarjeta de débito/crédito)。\n• 具体费用根据您需要的项目（血常规、尿检、PCR、血脂等）在接诊处即时结算。\n\n您需要咨询哪一项具体检查？`
        };
      }
      return {
        razonamiento: `El paciente consulta precios y medios de pago. Explico la accesibilidad y opciones de pago disponibles.`,
        respuesta: `💰 **Precios y Formas de Pago — Laboratorio Gamboa:**\n\n• Manejamos tarifas solidarias y accesibles para toda la comunidad con tecnología automatizada de alta precisión.\n• **Métodos de pago aceptados:** Efectivo, transferencias bancarias y tarjetas de débito/crédito.\n• El presupuesto exacto se detalla en recepción según el paquete o examen solicitado.\n\n¿Qué estudio necesitas realizarte para brindarte información específica?`
      };
    }
  },

  // 8. CONSULTA Y ENTREGA DE RESULTADOS
  {
    categoria: 'RESULTADOS',
    palabrasClave: ['resultado', 'resultados', 'informe', 'reporte', 'pdf', 'cuando salen', 'descargar', 'donde veo'],
    patrones: [/(resultado|informe|reporte|pdf|cuando sale|donde veo|mis analisis)/],
    palabrasChinas: ['结果', '报告', '化验单', '几时出', '怎么查', '下载报告'],
    palabrasIngles: ['results', 'test report', 'when will it be ready', 'download pdf'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Consulta sobre entrega y descarga de resultados en chino/mixto. Guío al panel de resultados.`,
          respuesta: `📊 **化验结果查询与下载 / Consulta de Resultados:**\n\n• 血常规与尿检通常在 **当天或24小时内** 完成。\n• 您可以在系统主界面的 **"Resultados Clínicos"（临床报告）** 栏目直接查看并下载官方PDF报告！\n• 报告由甘博亚医生（Dr. Gamboa）亲笔签名与认证。`
        };
      }
      return {
        razonamiento: `El usuario desea saber cómo y cuándo obtiene sus resultados. Detallo tiempos de entrega y descarga digital en PDF.`,
        respuesta: `📊 **Entrega y Consulta de Resultados Clínicos:**\n\n• **Tiempos de entrega:**\n  - Análisis de Sangre y Orina: **El mismo día o en 24 horas**.\n  - Perfil Lipídico y Glucosa: **24 horas**.\n  - Detección Molecular (PCR): **24 a 48 horas**.\n• **Descarga directa:** Puedes visualizarlos y descargarlos con su firma médica oficial en formato PDF directamente en la sección **"Resultados Clínicos"** de tu panel.`
      };
    }
  },

  // 9. DUDAS MÉDICAS FRECUENTES (AGUA, MEDICINAS, DOLOR, EMBARAZO)
  {
    categoria: 'DUDAS_FRECUENTES',
    palabrasClave: ['puedo tomar agua', 'tomar agua', 'beber agua', 'medicamento', 'pastilla', 'duele', 'niño', 'embarazo', 'alcohol', 'fumar'],
    patrones: [/(puedo tomar agua|beber agua|medicinas|pastillas|duele|miedo|alcohol|fumar|cafe)/],
    palabrasChinas: ['能喝水吗', '吃药', '疼不疼', '能抽烟吗', '能喝酒吗', '空腹喝水'],
    palabrasIngles: ['can i drink water', 'medicine', 'does it hurt', 'can i smoke', 'alcohol', 'coffee'],
    generarRespuesta: (idioma) => {
      return {
        razonamiento: `El usuario pregunta por dudas clínicas cotidianas (agua en ayuno, dolor, medicamentos o hábitos). Proporciono una orientación médica clara, tranquilizadora y profesional.`,
        respuesta: `💡 **Respuestas a Dudas Frecuentes:**\n\n• 💧 **¿Puedo beber agua durante el ayuno?** Sí, agua pura en cantidad moderada está permitida. Lo que debes evitar son jugos, refrescos, té, café o masticar chicle.\n• 💊 **¿Puedo tomar mis medicamentos diarios?** Medicamentos para la presión arterial pueden tomarse con un sorbo de agua. Si tomas medicamentos para la diabetes o tiroides, consúltanos antes de la toma de muestra.\n• 🩸 **¿Duele la extracción?** Solo se siente una ligera molestia de pocos segundos; nuestro personal está altamente capacitado para punciones suaves y rápidas.\n• 🚫 **Alcohol y tabaco:** Evita bebidas alcohólicas al menos 24 a 48 horas antes de cualquier prueba sanguínea o lipídica.`
      };
    }
  },

  // 10. PREPARACIÓN GENERAL O ESPECÍFICA
  {
    categoria: 'PREPARACION',
    palabrasClave: ['como me preparo', 'preparacion', 'ayuno', 'instrucciones', 'requisitos', 'que debo hacer antes'],
    patrones: [/(preparar|preparacion|ayuno|requisitos|instrucciones|antes del examen)/],
    palabrasChinas: ['怎么准备', '注意什么', '要空腹吗', '准备工作', '禁食'],
    palabrasIngles: ['how to prepare', 'preparation', 'fasting', 'instructions'],
    generarRespuesta: (idioma) => {
      return {
        razonamiento: `El usuario consulta la preparación general para los estudios clínicos. Detallo los protocolos según el tipo de examen.`,
        respuesta: `📋 **Protocolos de Preparación según el Examen:**\n\n• 🩸 **Análisis de Sangre (Rutina):** 8 horas de ayuno (solo agua permitida). Sin alcohol 24h antes.\n• 🧬 **Perfil Lipídico (Colesterol/Triglicéridos):** 12 a 14 horas de ayuno estricto. Cero comidas grasas o alcohol 72h antes.\n• 🩺 **Glucosa / Curva de Tolerancia:** 8 a 10 horas de ayuno. Dieta normal los días previos, sin exceso de dulces.\n• 🧪 **Análisis de Orina:** Primer chorro descartado; higiene íntima previa. Muestra de la primera orina de la mañana.\n• 🦠 **PCR / Molecular:** Sin alimentos, bebidas ni enjuague bucal 2 horas antes de la prueba.`
      };
    }
  },

  // 11. AGRADECIMIENTOS Y DESPEDIDAS
  {
    categoria: 'DESPEDIDA',
    palabrasClave: ['gracias', 'muchas gracias', 'adios', 'chao', 'hasta luego', 'bye', 'nos vemos', 'cuidate', 'listo gracias'],
    patrones: [/(gracias|muchas gracias|adios|hasta luego|chao|bye|cuidate|perfecto gracias)/],
    palabrasChinas: ['谢谢', '多谢', '感谢', '再见', '拜拜', '好的谢谢'],
    palabrasIngles: ['thank you', 'thanks', 'bye', 'goodbye', 'see you'],
    generarRespuesta: (idioma, nombre) => {
      if (idioma.esChino) {
        return {
          razonamiento: `El usuario agradece o se despide en chino/mixto. Concluyo de manera cordial.`,
          respuesta: `不客气！祝您健康平安！😊 如果您还有任何疑问，随时向我提问。再见！\n\n¡Ha sido un placer${nombre ? ` ${nombre}` : ''}! Cuida mucho de tu salud y aquí estaré cuando me necesites. ¡Hasta pronto! 👋`
        };
      }
      return {
        razonamiento: `El usuario agradece o se despide. Cierro la interacción con cordialidad médica y calidez.`,
        respuesta: `¡Ha sido todo un gusto ayudarte${nombre ? `, ${nombre}` : ''}! 😊 En el **Laboratorio Gamboa** estamos comprometidos con tu bienestar y precisión diagnóstica.\n\nSi necesitas agendar o tienes cualquier otra duda, ¡aquí estaré siempre a tu servicio! Que tengas un excelente día. 🌟`
      };
    }
  }
];

// ─── PROCESADOR PRINCIPAL DEL MOTOR DE REGLAS ──────────────────────

export function procesarConMotorDeReglas(
  mensaje: string,
  contexto: ContextoSesion,
): ResultadoAgente {
  const ahora = new Date();
  contexto.turno += 1;

  // 1. Análisis lingüístico y corrección fonética/typos
  const idioma = detectarIdioma(mensaje);
  const { textoNormalizado, correcciones } = interpretarTextoConFuzzy(mensaje);

  // 2. ¿Estamos en flujo de cita o el usuario quiere una cita?
  const enFlujoCita = contexto.temaActual === 'cita';
  const intentaCita = esIntencionCita(mensaje, textoNormalizado);

  if (enFlujoCita || intentaCita) {
    return manejarFlujoCita(mensaje, textoNormalizado, idioma, correcciones, contexto, ahora);
  }

  // 3. Conversación abierta razonada
  return manejarConversacionAbierta(mensaje, textoNormalizado, idioma, correcciones, contexto);
}

// ─── GESTOR DE FLUJO DE CITAS (SLOT-FILLING) ───────────────────────

function manejarFlujoCita(
  mensajeOriginal: string,
  textoNormalizado: string,
  idioma: ReturnType<typeof detectarIdioma>,
  correcciones: string[],
  contexto: ContextoSesion,
  ahora: Date
): ResultadoAgente {
  // 1. Cancelación de cita si el usuario lo solicita
  if (/cancelar|olvidalo|ya no|no quiero|cancel|stop/i.test(mensajeOriginal) || /cancelar|olvidalo|ya no/i.test(textoNormalizado)) {
    contexto.temaActual = undefined;
    contexto.citaSlots = undefined;
    return {
      pensamiento: 'Paso 1 (Comprensión): El usuario solicitó cancelar el proceso de agendamiento. Reinicio los datos temporales.',
      respuesta: 'He cancelado el proceso de cita sin inconvenientes. ¿En qué otra cosa te puedo orientar hoy? 😊',
      intencion: 'CANCELAR_CITA'
    };
  }

  // 2. Extraer examen, fecha y hora combinando el texto original y el corregido
  const examen = extraerExamen(mensajeOriginal) || extraerExamen(textoNormalizado);
  const fecha = extraerFecha(mensajeOriginal, ahora) || extraerFecha(textoNormalizado, ahora);
  const hora = extraerHora(mensajeOriginal) || extraerHora(textoNormalizado);

  // 3. Si no aportó ningún slot y no tiene intención de cita directa, responder su duda clínica
  if (!examen && !fecha && !hora && !esIntencionCita(mensajeOriginal, textoNormalizado)) {
    const respuestaAbierta = manejarConversacionAbierta(mensajeOriginal, textoNormalizado, idioma, correcciones, contexto);
    if (respuestaAbierta.intencion !== 'CHARLA_LIBRE') {
      return respuestaAbierta;
    }
  }

  if (!contexto.citaSlots) contexto.citaSlots = {};
  const slots = contexto.citaSlots;
  contexto.temaActual = 'cita';
  contexto.ultimaIntencion = 'programar_cita';

  if (examen) slots.examen = examen;

  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const horaActualStr = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

  // Validaciones de fecha
  if (fecha) {
    if (fecha < hoyStr) {
      return {
        pensamiento: `Paso 1 (Comprensión): El usuario solicitó la fecha ${fecha}, la cual ya pasó en relación a hoy (${hoyStr}). Rechazo de forma educada y pido una fecha válida.`,
        respuesta: idioma.esChino 
          ? `⚠️ 该日期已经过去。请选择今天或未来的日期：\n⚠️ Esa fecha ya pasó. Por favor indica una fecha de hoy en adelante:`
          : `⚠️ Esa fecha ya pasó. Por favor indícame una fecha a partir de hoy en adelante:`,
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots },
      };
    }
    slots.fecha = fecha;
  }

  // Validaciones de hora
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    const minTotal = h * 60 + m;
    const minApertura = 7 * 60 + 30; // 07:30
    const minCierre = 18 * 60;       // 18:00

    if (minTotal < minApertura || minTotal > minCierre) {
      return {
        pensamiento: `Paso 1 (Comprensión clínica): La hora ingresada (${hora}) está fuera del horario de laboratorio (07:30 a 18:00). Razono sugiriendo un horario dentro del intervalo hábil.`,
        respuesta: `⚠️ La hora **${hora}** se encuentra fuera de nuestro horario de atención (**07:30 a 18:00 hrs**).\n\nTe sugiero agendar a las **08:00** o **09:30**. ¿A qué hora prefieres asistir?`,
        intencion: 'programar_cita',
        accion: 'PEDIR_HORA',
        citaSlots: { ...slots },
      };
    }

    if (slots.fecha === hoyStr && hora <= horaActualStr) {
      return {
        pensamiento: `Paso 1: La hora ${hora} ya transcurrió en el día de hoy. Solicito un horario posterior.`,
        respuesta: `⚠️ La hora **${hora}** ya pasó el día de hoy. Por favor elige un horario posterior (hasta las 18:00):`,
        intencion: 'programar_cita',
        accion: 'PEDIR_HORA',
        citaSlots: { ...slots },
      };
    }

    slots.hora = hora;
  }

  // Construcción del pensamiento paso a paso (Chain of Thought)
  const partesPensamiento: string[] = [
    `Paso 1 (Análisis lingüístico): Idioma detectado: ${idioma.descripcion}.`,
  ];

  if (correcciones.length > 0) {
    partesPensamiento.push(`Paso 2 (Corrección tipográfica): Detecté términos con letras mezcladas o abreviaciones: [${correcciones.join(', ')}].`);
  } else {
    partesPensamiento.push(`Paso 2 (Normalización): Texto interpretado con alta claridad.`);
  }

  partesPensamiento.push(`Paso 3 (Extracción de slots): Examen=[${slots.examen || 'pendiente'}], Fecha=[${slots.fecha || 'pendiente'}], Hora=[${slots.hora || 'pendiente'}].`);

  // Identificar qué slot falta
  if (!slots.examen) {
    partesPensamiento.push(`Paso 4 (Estrategia): Falta el examen clínico. Solicito la selección del estudio ofreciendo el catálogo.`);
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: idioma.esChino
        ? `好的！请问您需要预约哪项化验项目？\n\n¡Perfecto! ¿Qué análisis clínico necesitas realizarte?`
        : `¡Con gusto te ayudo a agendar tu cita! 🩺\n\n¿Qué tipo de análisis clínico necesitas realizarte?`,
      intencion: 'programar_cita',
      accion: 'PEDIR_EXAMEN',
      citaSlots: { ...slots },
      opcionesExamen: EXAMENES_OFICIALES,
    };
  }

  if (!slots.fecha) {
    partesPensamiento.push(`Paso 4 (Estrategia): Se tiene el examen (${slots.examen}). Ahora solicito la fecha para la toma de muestra.`);
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: idioma.esChino
        ? `已记录项目：**${slots.examen}**。\n\n请问您希望哪一天前来检查？（如：今天、明天、周五）\n\nEntendido para **${slots.examen}**. ¿Para qué fecha deseas programar tu cita?`
        : `Entendido, agendaremos **${slots.examen}**.\n\n¿Para qué fecha te gustaría venir? (Puedes escribir "hoy", "mañana", "el viernes" o seleccionar en el calendario)`,
      intencion: 'programar_cita',
      accion: 'PEDIR_FECHA',
      citaSlots: { ...slots },
    };
  }

  if (!slots.hora) {
    partesPensamiento.push(`Paso 4 (Estrategia): Examen y fecha fijados. Solicito el horario recordando el intervalo matutino si requiere ayuno.`);
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: `¡Anotado! **${slots.examen}** para el **${formatearFechaLegible(slots.fecha)}**.\n\n¿En qué horario te resulta más cómodo asistir? (Atendemos de **07:30 a 18:00 hrs**)`,
      intencion: 'programar_cita',
      accion: 'PEDIR_HORA',
      citaSlots: { ...slots },
    };
  }

  // Todos los slots listos
  partesPensamiento.push(`Paso 4 (Confirmación): Todos los datos están completos y validados clínicamente. Presento el resumen final para confirmación.`);
  const resumen = `📋 **Resumen de tu Cita Médica:**\n\n🔬 **Estudio:** ${slots.examen}\n📅 **Fecha:** ${formatearFechaLegible(slots.fecha)}\n🕐 **Hora:** ${slots.hora} hrs\n👨‍⚕️ **Especialista:** Dr. Armando Gamboa Orellana\n\n¿Los datos están correctos? Presiona confirmar para registrarla en el sistema.`;

  return {
    pensamiento: partesPensamiento.join(' '),
    respuesta: resumen,
    intencion: 'programar_cita',
    accion: 'CONFIRMAR_CITA',
    citaSlots: { ...slots },
  };
}

// ─── GESTOR DE CONVERSACIÓN ABIERTA ("CUALQUIER COSA") ─────────────

function manejarConversacionAbierta(
  mensajeOriginal: string,
  textoNormalizado: string,
  idioma: ReturnType<typeof detectarIdioma>,
  correcciones: string[],
  contexto: ContextoSesion
): ResultadoAgente {
  const textoCombinado = `${norm(mensajeOriginal)} ${textoNormalizado}`;

  let mejorRegla: ReglaInteligente | null = null;
  let maxPuntaje = 0;

  for (const regla of REGLAS_CLINICAS) {
    let puntaje = 0;

    // Coincidencia con palabras clave en español
    for (const kw of regla.palabrasClave) {
      if (textoCombinado.includes(norm(kw))) puntaje += 6;
    }

    // Coincidencia con patrones RegExp
    for (const p of regla.patrones) {
      if (p.test(textoCombinado)) puntaje += 10;
    }

    // Coincidencia con caracteres o palabras en chino
    for (const kwCh of regla.palabrasChinas) {
      if (mensajeOriginal.includes(kwCh)) puntaje += 12;
    }

    // Coincidencia con palabras en inglés
    for (const kwEn of regla.palabrasIngles) {
      if (new RegExp(`\\b${kwEn}\\b`, 'i').test(mensajeOriginal)) puntaje += 8;
    }

    // Si es saludo pero el mensaje contiene más palabras de otra consulta, no sobreponderar saludo
    if (regla.categoria === 'SALUDO') {
      const numPalabras = textoNormalizado.split(/\s+/).filter(Boolean).length;
      if (numPalabras > 2) {
        puntaje = Math.min(puntaje, 5); // Permite que preguntas específicas ganen
      }
    }

    if (puntaje > maxPuntaje) {
      maxPuntaje = puntaje;
      mejorRegla = regla;
    }
  }

  // Construcción del pensamiento razonable
  const pensamientoPasos: string[] = [
    `Paso 1 (Percepción lingüística): Mensaje recibido. Idioma detectado: ${idioma.descripcion}.`,
  ];

  if (correcciones.length > 0) {
    pensamientoPasos.push(`Paso 2 (Corrección de letras mezcladas): El usuario escribió con variaciones o tipeo rápido; interpreté razonablemente: [${correcciones.join(', ')}].`);
  } else {
    pensamientoPasos.push(`Paso 2 (Análisis léxico): Sintaxis clara y sin ambigüedades.`);
  }

  if (mejorRegla && maxPuntaje >= 5) {
    pensamientoPasos.push(`Paso 3 (Comprensión semántica): Intención clasificada como [${mejorRegla.categoria}] (afinidad: ${maxPuntaje} pts).`);
    const { respuesta, razonamiento } = mejorRegla.generarRespuesta(idioma, contexto.nombre);
    pensamientoPasos.push(`Paso 4 (Razonamiento contextual): ${razonamiento}`);

    contexto.ultimaIntencion = mejorRegla.categoria;
    return {
      pensamiento: pensamientoPasos.join(' '),
      respuesta,
      intencion: mejorRegla.categoria,
    };
  }

  // Fallback Inteligente y Empático para "cualquier otra cosa"
  pensamientoPasos.push(`Paso 3 (Interacción abierta): El usuario formula una consulta libre o no estructurada. Interpreto su inquietud con razonamiento clínico y cortesía.`);
  pensamientoPasos.push(`Paso 4 (Respuesta asistencial): Brindo orientación completa del laboratorio, ofreciendo responder dudas sobre análisis, precios, horarios o programación de citas.`);

  let respuestaFallback = '';
  if (idioma.esChino) {
    respuestaFallback = `您好！我已经理解您的消息。😊 作为甘博亚实验室的AI助手，我可以为您解答任何关于身体检查、空腹注意事项、报告查询或时间预约的问题。\n\n请问您是想咨询某项具体化验（如血常规、PCR、尿检），还是需要我帮您预约时间？`;
  } else if (idioma.esIngles && !idioma.esEspanol) {
    respuestaFallback = `Hello! I understand your message. 😊 As your AI clinical assistant at Lab. Gamboa, I'm here to help with any laboratory tests, fasting guidelines, prices, or scheduling an appointment.\n\nWould you like to schedule a test, check your results, or know more about our lab services?`;
  } else {
    respuestaFallback = `Te entiendo perfectamente. 😊 Como asistente del **Laboratorio Gamboa**, estoy aquí para orientarte en todo lo relacionado con tu salud diagnóstica.\n\nPuedes preguntarme sobre:\n• 🩸 **Preparación y ayuno** para sangre, orina, PCR o lípidos.\n• 🕐 **Nuestros horarios de atención** (07:30 a 18:00 hrs).\n• 💰 **Costos y formas de pago**.\n• 📅 **Programar o modificar una cita** en pocos segundos.\n\n¿En qué tema específico te gustaría que te oriente?`;
  }

  contexto.ultimaIntencion = 'CHARLA_LIBRE';
  return {
    pensamiento: pensamientoPasos.join(' '),
    respuesta: respuestaFallback,
    intencion: 'CHARLA_LIBRE',
  };
}
