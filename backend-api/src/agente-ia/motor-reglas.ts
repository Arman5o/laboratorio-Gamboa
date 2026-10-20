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
  recomendaciones?: string[];
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
  opciones?: string[];
  recomendaciones?: string[];
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
    // Reemplaza signos de puntuación pero conserva ':' y '-' para horas y fechas
    .replace(/[¿¡!?.,;()_"]/g, ' ')
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
  'kontacto': 'contacto', 'cntacto': 'contacto', 'contact': 'contacto',
  'encargdo': 'encargado', 'encargao': 'encargado',
  'tlf': 'telefono', 'tlfn': 'telefono', 'tel': 'telefono', 'cel': 'celular', 'celu': 'celular',
  'wsp': 'whatsapp', 'wasap': 'whatsapp', 'whastapp': 'whatsapp', 'watsapp': 'whatsapp',
  'nro': 'numero', 'num': 'numero',
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

// ─── EXTRACCIÓN DE ENTIDADES (EXÁMENES MÚLTIPLES, FECHA, HORA) ───────

export const RECOMENDACIONES_EXAMENES: Record<string, string[]> = {
  'Análisis de Sangre (Rutina)': [
    '🌙 Ayuno de 8 horas (solo agua permitida).',
    '🚫 Cero alcohol 24 a 48 horas antes.',
    '🆔 Traer cédula de identidad y llegar 10 min antes.'
  ],
  'Análisis de Orina (Completo)': [
    '🧴 Aseo genital previo con agua y jabón.',
    '🧬 Chorro medio en frasco estéril (descartar primer chorro).',
    '🚫 Cero alcohol 24h antes ni comidas con tintes (remolacha).',
    '⏳ Entregar muestra antes de 2 horas de su emisión.'
  ],
  'Perfil Lipídico': [
    '🌙 Ayuno estricto de 12 a 14 horas (solo agua).',
    '🚫 Cero alcohol 72 horas (3 días) antes.',
    '🍽️ Cena ligera sin grasas y sin ejercicio previo.'
  ],
  'Prueba de Tolerancia a la Glucosa': [
    '🌙 Ayuno estricto de 8 a 10 horas.',
    '🚫 Cero alcohol y evitar dulces 48h antes.',
    '⏱️ Disponer de 2 horas en el laboratorio.'
  ],
  'Detección Molecular (PCR)': [
    '🚫 No comer, beber ni lavarse dientes 2h antes.',
    '😷 Uso obligatorio de barbijo o mascarilla.'
  ]
};

export function obtenerRecomendacionesClinicas(examenStr?: string): string[] {
  if (!examenStr) {
    return [
      '🌙 Ayuno general de 8 horas según la indicación de tu médico.',
      '🚫 Evitar el consumo de bebidas alcohólicas de 24 a 48 horas antes.',
      '🆔 Traer tu cédula de identidad y presentarte 10 minutos antes.'
    ];
  }

  const partes = examenStr.split(' + ').map(e => e.trim());
  const recomendaciones: string[] = [];
  const vistas = new Set<string>();

  for (const parte of partes) {
    let recs: string[] | undefined = RECOMENDACIONES_EXAMENES[parte];
    if (!recs) {
      if (parte.includes('Sangre')) recs = RECOMENDACIONES_EXAMENES['Análisis de Sangre (Rutina)'];
      else if (parte.includes('Orina')) recs = RECOMENDACIONES_EXAMENES['Análisis de Orina (Completo)'];
      else if (parte.includes('Lipídico') || parte.includes('Lipidico')) recs = RECOMENDACIONES_EXAMENES['Perfil Lipídico'];
      else if (parte.includes('Glucosa')) recs = RECOMENDACIONES_EXAMENES['Prueba de Tolerancia a la Glucosa'];
      else if (parte.includes('PCR') || parte.includes('Molecular')) recs = RECOMENDACIONES_EXAMENES['Detección Molecular (PCR)'];
    }

    if (recs) {
      for (const r of recs) {
        if (!vistas.has(r)) {
          vistas.add(r);
          recomendaciones.push(r);
        }
      }
    }
  }

  return recomendaciones.length > 0 ? recomendaciones : [
    '🌙 Ayuno de 8 horas previo a la toma de muestra.',
    '🚫 Evitar consumo de bebidas alcohólicas de 24 a 48 horas antes.',
    '🆔 Traer cédula de identidad y acudir 10 minutos antes de tu turno.'
  ];
}

/**
 * Extrae todos los exámenes detectados en el texto para permitir citas de múltiples análisis.
 * Ej: "analisis de sangre y orina" -> ["Análisis de Sangre (Rutina)", "Análisis de Orina (Completo)"]
 */
export function extraerExamenes(texto: string): string[] {
  if (!texto) return [];
  const t = norm(texto);
  const { textoNormalizado } = interpretarTextoConFuzzy(texto);

  const encontrados = new Set<string>();

  // 1. Detección por opciones numéricas: "1 y 3", "1, 2", "opcion 1 y opcion 2"
  const matchSoloNumeros = t.match(/\b([1-5])\b/g);
  if (matchSoloNumeros && /^(?:opcion(?:es)?|el|numero|num)?\s*[1-5](\s*(?:y|,|con|\+)\s*(?:opcion(?:es)?|el|numero|num)?\s*[1-5])*\s*$/i.test(t)) {
    for (const numStr of matchSoloNumeros) {
      const idx = parseInt(numStr) - 1;
      if (EXAMENES_OFICIALES[idx]) {
        encontrados.add(EXAMENES_OFICIALES[idx]);
      }
    }
    if (encontrados.size > 0) return Array.from(encontrados);
  }

  // 2. Coincidencias de catálogo ordenadas de mayor a menor longitud
  const clavesOrdenadas = Object.keys(EXAMENES_CATALOGO).sort((a, b) => b.length - a.length);

  for (const clave of clavesOrdenadas) {
    const examenOficial = EXAMENES_CATALOGO[clave];
    if (encontrados.has(examenOficial)) continue;

    const claveNorm = norm(clave);
    if (texto.includes(clave) || t.includes(claveNorm) || textoNormalizado.includes(claveNorm)) {
      encontrados.add(examenOficial);
    }
  }

  return Array.from(encontrados);
}

export function extraerExamen(texto: string): string | null {
  const lista = extraerExamenes(texto);
  if (lista.length === 0) return null;
  return lista.join(' + ');
}

function extraerFecha(texto: string, ahora: Date): string | null {
  const t = norm(texto);
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  const formatFecha = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 1. Relativos: hoy / 今天 / today
  if (/\bhoy\b/.test(t) || texto.includes('今天') || /\btoday\b/.test(t)) {
    return formatFecha(hoy);
  }

  // 2. pasado mañana / 后天 / day after tomorrow (evaluar antes de "mañana")
  if (/pasado\s*manana/.test(t) || texto.includes('后天')) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return formatFecha(d);
  }

  // 3. mañana / 明天 / tomorrow
  if (/\bmanana\b/.test(t) || texto.includes('明天') || /\btomorrow\b/.test(t)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return formatFecha(d);
  }

  // 4. en N días
  const matchEnDias = t.match(/en\s+(\d+|dos|tres|cuatro|cinco)\s+dias?/);
  if (matchEnDias) {
    const numMap: Record<string, number> = { 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5 };
    const n = numMap[matchEnDias[1]] || parseInt(matchEnDias[1]);
    if (!isNaN(n) && n > 0 && n <= 30) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + n);
      return formatFecha(d);
    }
  }

  // 5. Fechas en formato ISO: YYYY-MM-DD
  const matchISO = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchISO) {
    return matchISO[0];
  }

  // 6. Fechas en formato Chino: 10月15日 o 2026年10月15日
  const matchChino = texto.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?/);
  if (matchChino) {
    const año = matchChino[1] ? parseInt(matchChino[1]) : ahora.getFullYear();
    const mes = parseInt(matchChino[2]);
    const dia = parseInt(matchChino[3]);
    const d = new Date(año, mes - 1, dia);
    return formatFecha(d);
  }

  // 7. Meses y variantes abreviadas
  const meses: Record<string, number> = {
    'enero': 1, 'ene': 1,
    'febrero': 2, 'feb': 2,
    'marzo': 3, 'mar': 3,
    'abril': 4, 'abr': 4,
    'mayo': 5, 'may': 5,
    'junio': 6, 'jun': 6,
    'julio': 7, 'jul': 7,
    'agosto': 8, 'ago': 8,
    'septiembre': 9, 'sep': 9, 'sept': 9,
    'octubre': 10, 'oct': 10,
    'noviembre': 11, 'nov': 11,
    'diciembre': 12, 'dic': 12,
  };

  // Texto español: "el 15 de octubre", "15 de oct", "el 20 de octubre de 2026"
  const matchDiaMes = t.match(/(?:(?:el|para\s+el)\s+)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de|del)?\s*(\d{4}))?/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1]);
    const mesNombre = matchDiaMes[2];
    const año = matchDiaMes[3] ? parseInt(matchDiaMes[3]) : ahora.getFullYear();
    const mes = meses[mesNombre];
    if (mes && dia >= 1 && dia <= 31) {
      const d = new Date(año, mes - 1, dia);
      return formatFecha(d);
    }
  }

  // 8. Fechas numéricas: "15/10", "15-10", "15/10/2026"
  const matchNumerico = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (matchNumerico) {
    const dia = parseInt(matchNumerico[1]);
    const mes = parseInt(matchNumerico[2]);
    const año = matchNumerico[3] ? parseInt(matchNumerico[3]) : ahora.getFullYear();
    const añoFull = año < 100 ? 2000 + año : año;
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      const d = new Date(añoFull, mes - 1, dia);
      return formatFecha(d);
    }
  }

  // 9. Días de la semana en español, chino e inglés
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
      // Verificar si además dice un día numérico explícito (ej: "martes 20", "martes 20 de octubre")
      const matchDiaNum = t.match(new RegExp(diaStr + '\\s+(\\d{1,2})(?:\\s+de\\s+([a-z]+))?'));
      if (matchDiaNum) {
        const diaNum = parseInt(matchDiaNum[1]);
        const mesNom = matchDiaNum[2];
        const mes = mesNom ? meses[mesNom] : (ahora.getMonth() + 1);
        const año = ahora.getFullYear();
        if (diaNum >= 1 && diaNum <= 31 && mes) {
          const d = new Date(año, mes - 1, diaNum);
          return formatFecha(d);
        }
      }

      const d = new Date(hoy);
      const diaActual = d.getDay();
      let diff = num - diaActual;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return formatFecha(d);
    }
  }

  // 10. Día solo en el mes corriente ("el 20", "para el 20", "dia 20")
  const matchSoloDia = t.match(/(?:(?:el|para\s+el|dia)\s+)(\d{1,2})\b/);
  if (matchSoloDia) {
    const dia = parseInt(matchSoloDia[1]);
    if (dia >= 1 && dia <= 31) {
      let mes = ahora.getMonth();
      let año = ahora.getFullYear();
      if (dia < ahora.getDate()) {
        mes += 1;
        if (mes > 11) {
          mes = 0;
          año += 1;
        }
      }
      const d = new Date(año, mes, dia);
      return formatFecha(d);
    }
  }

  return null;
}

function extraerHora(texto: string): string | null {
  if (!texto) return null;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
  const limpio = texto.trim();

  // 1. Formato chino: 上午8点, 下午3点, 8点30, 8点半, 3点
  const matchChino = limpio.match(/(上午|下午|早上|晚上)?\s*([0-9一二两三四五六七八九十]{1,3})\s*点(?:\s*(半)|(\d{1,2})\s*分?)?/);
  if (matchChino) {
    const periodo = matchChino[1];
    const rawH = matchChino[2];
    const chinoMap: Record<string, number> = {
      '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12
    };
    let h = chinoMap[rawH] || parseInt(rawH);
    let m = 0;
    if (matchChino[3] === '半') m = 30;
    else if (matchChino[4]) m = parseInt(matchChino[4]);

    const esPM = (periodo === '下午' || periodo === '晚上');
    if (esPM && h < 12) h += 12;
    else if (!periodo && h >= 1 && h <= 6) h += 12;
    return fmt(h, m);
  }

  // 2. Mediodía / Medianoche
  const tNorm = norm(limpio);
  if (/medio\s*dia|mediodia|al mediodia|12 del dia/.test(tNorm)) {
    return '12:00';
  }
  if (/medio\s*noche|medianoche|12 de la noche/.test(tNorm)) {
    return '00:00';
  }

  // Modificadores explícitos de período
  const esPM = /\b(pm|p\.m\.|p\s+m|tarde|noches?|de la tarde|por la tarde|en la tarde|de la noche|por la noche|en la noche|afternoon|evening)\b/i.test(tNorm);
  const esAM = /\b(am|a\.m\.|a\s+m|de la manana|por la manana|en la manana|en las mananas|temprano|madrugada|de la madrugada|matutino|matutina|morning)\b/i.test(tNorm);

  const palabraNum: Record<string, number> = {
    'una': 1, 'uno': 1, 'un': 1, 'one': 1,
    'dos': 2, 'two': 2,
    'tres': 3, 'three': 3,
    'cuatro': 4, 'four': 4,
    'cinco': 5, 'five': 5,
    'seis': 6, 'six': 6,
    'siete': 7, 'seven': 7,
    'ocho': 8, 'eight': 8,
    'nueve': 9, 'nine': 9,
    'diez': 10, 'ten': 10,
    'once': 11, 'eleven': 11,
    'doce': 12, 'twelve': 12,
    'trece': 13,
    'catorce': 14,
    'quince': 15,
    'dieciseis': 16, 'dieciséis': 16,
    'diecisiete': 17,
    'dieciocho': 18,
    'diecinueve': 19,
    'veinte': 20,
  };

  // Cuarto para las X / 10 para las X / 20 para las X
  const matchParaLas = tNorm.match(/(?:(?:un\s+)?cuarto|15|diez|10|veinte|20)\s+para\s+las?\s+([a-z0-9]+)/);
  if (matchParaLas) {
    const rawH = matchParaLas[1];
    let h = palabraNum[rawH] || parseInt(rawH);
    if (!isNaN(h) && h >= 1 && h <= 24) {
      let minFaltan = 15;
      if (matchParaLas[0].includes('diez') || matchParaLas[0].includes('10')) minFaltan = 10;
      if (matchParaLas[0].includes('veinte') || matchParaLas[0].includes('20')) minFaltan = 20;

      h = h - 1;
      const m = 60 - minFaltan;
      if (esPM && h < 12) h += 12;
      else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
      return fmt(h, m);
    }
  }

  // X menos cuarto / X menos diez
  const matchMenos = tNorm.match(/([a-z0-9]+)\s+menos\s+(cuarto|15|diez|10|veinte|20)/);
  if (matchMenos) {
    const rawH = matchMenos[1];
    let h = palabraNum[rawH] || parseInt(rawH);
    if (!isNaN(h) && h >= 1 && h <= 24) {
      let minFaltan = 15;
      if (matchMenos[2] === 'diez' || matchMenos[2] === '10') minFaltan = 10;
      if (matchMenos[2] === 'veinte' || matchMenos[2] === '20') minFaltan = 20;

      h = h - 1;
      const m = 60 - minFaltan;
      if (esPM && h < 12) h += 12;
      else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
      return fmt(h, m);
    }
  }

  // 3. Exacta con dos puntos / punto / h (ej: "07:30", "16:00", "4:30", "4:00")
  const matchExacta = limpio.match(/(?:a\s+las?|las?|la)?\s*\b(\d{1,2})\s*[:.hH]\s*(\d{2})?\b/i);
  if (matchExacta) {
    let h = parseInt(matchExacta[1]);
    const m = matchExacta[2] ? parseInt(matchExacta[2]) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      if (esPM && h < 12) h += 12;
      else if (esAM && h === 12) h = 0;
      else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
      return fmt(h, m);
    }
  }

  // 4. Con am / pm directo: "8am", "4pm", "8:30pm"
  const matchAmPm = limpio.match(/\b(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)\b/i);
  if (matchAmPm) {
    let h = parseInt(matchAmPm[1]);
    const m = matchAmPm[2] ? parseInt(matchAmPm[2]) : 0;
    const periodo = matchAmPm[3].toLowerCase();
    if (periodo === 'pm' && h < 12) h += 12;
    if (periodo === 'am' && h === 12) h = 0;
    return fmt(h, m);
  }

  // 5. Separados por espacio: '07 30'
  const matchEspacio = limpio.match(/\b(\d{1,2})\s+(\d{2})\b/);
  if (matchEspacio) {
    let h = parseInt(matchEspacio[1]);
    const m = parseInt(matchEspacio[2]);
    if (m >= 0 && m <= 59) {
      if (esPM && h < 12) h += 12;
      else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
      if (h >= 0 && h <= 23) return fmt(h, m);
    }
  }

  // Normalizar reemplazando palabras de números por dígitos
  let textoReemplazado = tNorm;
  for (const [pal, num] of Object.entries(palabraNum)) {
    textoReemplazado = textoReemplazado.replace(new RegExp('\\b' + pal + '\\b', 'g'), num.toString());
  }

  // 6. 'y media' (ej: "las 4 y media", "4 y media de la tarde", "a las cuatro y media")
  const matchConMinutos = textoReemplazado.match(/(?:a\s+las?|las?|la|que\s+sea\s+a\s+las?|tipo|como\s+a\s+las?|a\s+eso\s+de\s+las?|ponlo\s+a\s+las?|para\s+las?|quiero\s+a\s+las?|deseo\s+a\s+las?)?\s*\b(\d{1,2})\s*(?:y\s+media|y\s+medio)\b/);
  if (matchConMinutos) {
    let h = parseInt(matchConMinutos[1]);
    if (esPM && h < 12) h += 12;
    else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
    return fmt(h, 30);
  }

  // 7. 'y cuarto'
  const matchConCuarto = textoReemplazado.match(/(?:a\s+las?|las?|la|que\s+sea\s+a\s+las?|tipo|como\s+a\s+las?|a\s+eso\s+de\s+las?|ponlo\s+a\s+las?|para\s+las?|quiero\s+a\s+las?|deseo\s+a\s+las?)?\s*\b(\d{1,2})\s*y\s+cuarto\b/);
  if (matchConCuarto) {
    let h = parseInt(matchConCuarto[1]);
    if (esPM && h < 12) h += 12;
    else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
    return fmt(h, 15);
  }

  // 8. 'y [num]' o 'con [num]' (ej: '2 y 45', '2 con 15')
  const matchConYNum = textoReemplazado.match(/(?:a\s+las?|las?|la|que\s+sea\s+a\s+las?|tipo|como\s+a\s+las?|a\s+eso\s+de\s+las?|ponlo\s+a\s+las?|para\s+las?|quiero\s+a\s+las?|deseo\s+a\s+las?)?\s*\b(\d{1,2})\s*(?:y|con)\s+(\d{1,2})\b/);
  if (matchConYNum) {
    let h = parseInt(matchConYNum[1]);
    const m = parseInt(matchConYNum[2]);
    if (m >= 0 && m <= 59) {
      if (esPM && h < 12) h += 12;
      else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
      return fmt(h, m);
    }
  }

  // 9. Hora simple con prefijo ('la cinco de la tarde', 'que sea a las 4', 'las 5', 'a la 1', 'quiero a las 3')
  const matchHoraSimple = textoReemplazado.match(/(?:que\s+sea\s+a\s+las?|a\s+las?|las?|la|a\s+la|tipo|como\s+a\s+las?|a\s+eso\s+de\s+las?|ponlo\s+a\s+las?|para\s+las?|cerca\s+de\s+las?|a\s+partir\s+de\s+las?|quiero\s+a\s+las?|deseo\s+a\s+las?)\s+(\d{1,2})\b/);
  if (matchHoraSimple) {
    let h = parseInt(matchHoraSimple[1]);
    if (esPM && h < 12) h += 12;
    else if (esAM && h === 12) h = 0;
    else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
    if (h >= 0 && h <= 23) return fmt(h, 0);
  }

  // 10. Hora seguida de sufijo ('4 de la tarde', '5 de la manana', '4 hrs')
  const matchHoraSufijo = textoReemplazado.match(/\b(\d{1,2})\s*(?:hrs?|horas?|de la tarde|de la manana|de la noche|pm|am)\b/);
  if (matchHoraSufijo) {
    let h = parseInt(matchHoraSufijo[1]);
    if (esPM && h < 12) h += 12;
    else if (esAM && h === 12) h = 0;
    else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
    if (h >= 0 && h <= 23) return fmt(h, 0);
  }

  // 11. Número solo ('4', '5', '8', '16')
  const matchNumeroSolo = textoReemplazado.match(/^\s*(\d{1,2})\s*$/);
  if (matchNumeroSolo) {
    let h = parseInt(matchNumeroSolo[1]);
    if (esPM && h < 12) h += 12;
    else if (esAM && h === 12) h = 0;
    else if (!esAM && !esPM && h >= 1 && h <= 6) h += 12;
    if (h >= 0 && h <= 23) return fmt(h, 0);
  }

  return null;
}

function esIntencionCita(texto: string, textoFuzzy: string, contexto?: ContextoSesion): boolean {
  const t = `${norm(texto)} ${textoFuzzy}`;

  // Si el usuario viene de la delimitación médica o consulta externa
  // y responde afirmativamente, activamos de inmediato el flujo de agendamiento
  if (contexto?.ultimaIntencion === 'DELIMITACION_MEDICA_SINTOMAS' || contexto?.ultimaIntencion === 'CONSULTA_EXTERNA_NO_CLINICA') {
    const afirmativos = [
      'si', 'claro', 'por favor', 'porfa', 'dale', 'bueno', 'de acuerdo',
      'ayudame', 'quiero', 'agendar', 'reservar', 'me gustaria',
      'si quiero', 'si por favor', 'si porfa', 'dale si', 'ok', 'vale',
      '好的', '可以', '要', '帮我约', '想约', '好', '是',
      'yes', 'yeah', 'sure', 'please', 'ok', 'book', 'schedule'
    ];
    const palabras = t.split(/\s+/);
    if (afirmativos.some(a => t === a || palabras.includes(a) || t.startsWith(`${a} `))) {
      return true;
    }
  }

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
    'me gustaria hacerme', '想做', '想查', '要验', '要测', 'me hago', 'hacerme'
  ];
  const tieneDeseo = verbosDeseo.some(v => t.includes(v) || texto.includes(v));
  const examenEncontrado = extraerExamen(texto) || extraerExamen(textoFuzzy);
  if (tieneDeseo && examenEncontrado) {
    return true;
  }

  // Si el usuario directamente indica uno o varios análisis (ej: "analisis de sangre y orina", "sangre y orina")
  if (examenEncontrado) {
    const esPreguntaInformativa = /(cuanto|precio|costo|tarifa|para que sirve|que es|que mide|como me preparo|preparacion|recomendacion|ayuno|requisito|cuando sale|horario|donde|quien|contacto|telefono|celular|whatsapp)/i.test(t);
    if (!esPreguntaInformativa) {
      return true;
    }
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

function elegirVariacion(opciones: string[]): string {
  const idx = Math.floor(Math.random() * opciones.length);
  return opciones[idx];
}

interface ReglaInteligente {
  categoria: string;
  palabrasClave: string[];
  patrones: RegExp[];
  palabrasChinas: string[];
  palabrasIngles: string[];
  generarRespuesta: (
    idioma: ReturnType<typeof detectarIdioma>,
    nombre?: string,
    textoOriginal?: string
  ) => {
    respuesta: string;
    razonamiento: string;
    accion?: 'PEDIR_EXAMEN' | 'PEDIR_FECHA' | 'PEDIR_HORA' | 'CONFIRMAR_CITA';
    opcionesExamen?: string[];
    opciones?: string[];
  };
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
          razonamiento: `Saludo en chino. Respuesta breve y cortés.`,
          respuesta: `您好${saludoNombre}！👋 我是甘博亚实验室的助理 **AIDA**。请问需要帮您预约化验、查询营业时间还是查看报告？`
        };
      }
      if (idioma.esIngles && !idioma.esEspanol) {
        return {
          razonamiento: `English greeting. Short and direct assistance offer.`,
          respuesta: `Hello${saludoNombre}! 👋 I'm **AIDA** from Lab. Gamboa. How can I help you today? I can schedule tests, check hours, or review your results.`
        };
      }
      const opciones = [
        `¡Hola${saludoNombre}! 👋 Soy **AIDA**, asistente del **Laboratorio Gamboa**. ¿En qué te ayudo hoy? Puedo agendar tu cita o consultar exámenes y horarios.`,
        `¡Hola${saludoNombre}! Qué gusto saludarte. 😊 Estoy lista para ayudarte con tus análisis de laboratorio o agendar tu cita. ¿Qué necesitas?`,
        `¡Buen día${saludoNombre}! 👋 Aquí AIDA del Lab. Gamboa. ¿Deseas agendar una cita o consultar sobre algún examen de laboratorio?`
      ];
      return {
        razonamiento: `Saludo breve, amigable y directo sin textos largos.`,
        respuesta: elegirVariacion(opciones)
      };
    }
  },

  // 1.1 DELIMITACIÓN DE ÁREA CLÍNICA: SÍNTOMAS, DOLORES Y CONSULTAS MÉDICAS GENERALES
  {
    categoria: 'DELIMITACION_MEDICA_SINTOMAS',
    palabrasClave: [
      'duele la barriga', 'dolor de barriga', 'me duele la barriga', 'dolor de estomago', 'me duele el estomago',
      'dolor de panza', 'me duele la panza', 'dolor de vientre', 'dolor abdominal', 'dolor de cabeza',
      'me duele la cabeza', 'dolor de espalda', 'dolor en el pecho', 'dolor de garganta', 'dolor de huesos',
      'me duele', 'tengo dolor', 'siento dolor', 'me arde', 'fiebre', 'calentura', 'nauseas', 'vomito',
      'vomitar', 'diarrea', 'mareos', 'mareo', 'escalofrios', 'colicos', 'colico', 'gastritis', 'acidez',
      'me siento mal', 'estoy enfermo', 'estoy enferma', 'malestar', 'que tomo', 'que puedo tomar',
      'que medicina', 'que pastilla', 'recetame un medicamento', 'remedio para el dolor'
    ],
    patrones: [
      /(me\s+duele|dolor\s+(de|en)|tengo\s+dolor|siento\s+dolor|me\s+arde|molestia\s+en)\s+(la\s+|el\s+)?(barriga|estomago|panza|vientre|abdomen|cabeza|espalda|pecho|garganta|cuerpo|rinon|higado|vesicula|huesos|articulaciones)/i,
      /(me\s+duele\s+(la\s+|el\s+)?\w+)/i,
      /(tengo|siento)\s+(fiebre|calentura|nauseas|vomito|diarrea|mareo|escalofrios|colicos|gastritis|acidez|reflujo|malestar)/i,
      /(que\s+tomo|que\s+puedo\s+tomar|que\s+pastilla|que\s+medicamento|receta\s+medica|recetame|remedio\s+para\s+el\s+dolor|que\s+es\s+bueno\s+para\s+el\s+dolor)/i,
      /(me\s+siento\s+mal|estoy\s+enferm[oa]|tengo\s+infeccion)/i,
    ],
    palabrasChinas: [
      '肚子疼', '胃痛', '肚子痛', '胃疼', '腹痛', '头痛', '头疼', '发烧', '发热', '恶心', '想吐',
      '呕吐', '拉肚子', '腹泻', '咳嗽', '喉咙痛', '胸痛', '吃什么药', '吃哪种药', '头晕', '难受', '生病了'
    ],
    palabrasIngles: [
      'stomach pain', 'stomach ache', 'belly hurts', 'my stomach hurts', 'headache', 'fever',
      'nausea', 'vomit', 'diarrhea', 'sore throat', 'cough', 'chest pain', 'what medicine', 'what pill', 'i feel sick'
    ],
    generarRespuesta: (idioma, nombre) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Aclaración concisa de especialidad exclusiva en análisis de laboratorio.`,
          respuesta: `我并不专门从事看诊或开药，因为我们是专业的临床检验实验室。🩺 建议您咨询专科医生；若您需要做血常规或尿检等化验，我很乐意为您预约时间。需要帮您挂号吗？`
        };
      }
      if (idioma.esIngles && !idioma.esEspanol) {
        return {
          razonamiento: `Brief scope boundary and lab appointment offer.`,
          respuesta: `I'm not specialized in medical diagnoses or prescribing medicines since we are strictly a clinical lab. 🩺 I suggest seeing a doctor, but if you need lab tests (like blood or urine), I'd be glad to schedule an appointment. Would you like to book one?`
        };
      }
      const opciones = [
        `No me especializo en esa rama médica (diagnósticos ni recetar medicamentos), ya que somos un laboratorio de análisis clínicos. 🩺 Te sugiero consultar con un médico; si necesitas análisis de sangre u orina para tu evaluación, con gusto te programo una cita. ¿Deseas agendarla?`,
        `No me especializo en esa área médica para diagnosticarte o indicarte medicación. 🩺 Te recomiendo acudir con un médico o especialista. Si requieres análisis de laboratorio de apoyo, con gusto te ayudo a agendar tu cita. ¿Te gustaría programarla?`,
        `Como asistente de laboratorio clínico, no estoy facultada para consultas médicas generales ni tratamientos. 🩺 Te aconsejo ver a un médico, pero si te solicita exámenes de laboratorio, puedo reservarte un turno de inmediato. ¿Deseas agendar tu cita?`
      ];
      return {
        razonamiento: `Aclaración breve de especialidad de laboratorio y propuesta directa de reserva.`,
        respuesta: elegirVariacion(opciones),
        opciones: ['📅 Sí, agendar cita', '🧪 Ver exámenes disponibles', '⏰ Horarios de atención']
      };
    }
  },

  // 1.2 CONSULTAS EXTERNAS NO CLÍNICAS (RECETAS DE COCINA, CULTURA GENERAL, TAREAS, JUEGOS)
  {
    categoria: 'CONSULTA_EXTERNA_NO_CLINICA',
    palabrasClave: [
      'receta', 'recetas', 'receta de pan', 'receta de cocina', 'receta de comida', 'receta de pastel', 'receta de torta',
      'como cocinar', 'como hacer pan', 'como preparar', 'como hacer comida', 'ingredientes', 'ingredientes para',
      'chiste', 'cuento', 'tarea', 'futbol', 'cancion', 'musica', 'pelicula', 'clima', 'tiempo de manana', 'capital de',
      'poema', 'videojuego', 'historia', 'noticias', 'programacion', 'matematicas', 'chistes'
    ],
    patrones: [
      /\breceta(s)?\b(?!\s+(medica|médica))/i,
      /(como\s+(hacer|cocinar|preparar|elaborar)\s+)/i,
      /(ingredientes\s+(de|para)\s+)/i,
      /(cuentame\s+(un\s+)?(chiste|cuento|historia)|dime\s+(un\s+)?(chiste|poema|cancion)|cual\s+es\s+la\s+capital|quien\s+(es|fue|gano)|clima\s+en|como\s+reparar)/i
    ],
    palabrasChinas: ['菜谱', '做饭', '面包做法', '食谱', '做面包', '笑话', '讲个笑话', '天气'],
    palabrasIngles: ['recipe', 'how to cook', 'bread recipe', 'cake recipe', 'joke', 'weather', 'movie'],
    generarRespuesta: (idioma, nombre) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Consulta externa ajena a la salud. Respuesta exacta y cordial orientando a análisis clínicos.`,
          respuesta: `抱歉，我无法为您提供该信息。作为甘博亚实验室的助理，我可以帮您预约化验时间或查询检查项目。请问需要帮您预约检查吗？`,
          opciones: ['📅 预约化验', '⏰ 营业时间', '🧪 检查项目']
        };
      }
      if (idioma.esIngles && !idioma.esEspanol) {
        return {
          razonamiento: `External out-of-scope question. Clear and polite lab scope clarification.`,
          respuesta: `I'm sorry, I cannot help with that information. As a Gamboa Laboratory assistant, I can help you schedule a lab test appointment or provide info on our tests. Would you like to schedule one?`,
          opciones: ['📅 Book appointment', '⏰ Opening hours', '🧪 Available tests']
        };
      }
      const opcionesVariadas = [
        `Lo siento, no te puedo ayudar con esos datos. Como agente de Laboratorio Gamboa puedo ayudarte a registrar una cita para un análisis clínico o brindarte información sobre nuestros exámenes.`,
        `Esa consulta queda fuera de mi área de especialidad. Como asistente de Laboratorio Gamboa puedo ayudarte a programar tus análisis clínicos o consultar nuestros estudios disponibles.`,
        `Disculpa, no dispongo de esa información ya que me enfoco exclusivamente en análisis de laboratorio. Con gusto te asisto para agendar tu cita médica.`
      ];
      return {
        razonamiento: `El usuario pregunta por un tema ajeno al laboratorio (ej. recetas de cocina, cultura general). Respondo exactamente indicando que no poseo esos datos y orientando a citas de análisis clínicos con opciones interactivas.`,
        respuesta: elegirVariacion(opcionesVariadas),
        opciones: ['📅 Programar cita', '⏰ Horarios de atención', '🧪 Exámenes disponibles']
      };
    }
  },

  // 1.3 ORIENTACIÓN SOBRE DIAGNÓSTICOS Y RECOMENDACIÓN DE EXÁMENES CLÍNICOS
  {
    categoria: 'ORIENTACION_DIAGNOSTICOS_EXAMENES',
    palabrasClave: [
      'diagnosticos', 'diagnostico', 'que diagnosticos debo hacerme', 'que diagnostico debo hacerme',
      'que diagnostico me hago', 'que diagnosticos me hago', 'que diagnosticos tienen',
      'que examen debo hacerme', 'que examen me hago', 'que examenes me hago', 'que analisis debo hacerme',
      'que analisis me hago', 'que examen me recomiendas', 'que analisis me recomiendas',
      'que estudio me recomiendas', 'que examen me sirve', 'que analisis me sirve',
      'que chequeo hacerme', 'que pruebas tienen', 'cuales analisis tienen', 'cuales examenes tienen',
      'que analisis realizan', 'que estudios realizan', 'que prueba me hago', 'hacerme un chequeo',
      'que examen hacerme', 'que analisis hacerme', 'que estudio hacerme', 'que chequeo me hago'
    ],
    patrones: [
      /(que|cuales)\s+(diagnostico|diagnosticos|examen|examenes|analisis|estudios?|pruebas?)\s+(debo|puedo|me\s+recomiendas?|me\s+hago|hacerme|tienen|realizan)/i,
      /(recomiendas?|sugieres?)\s+(algun|que)?\s*(examen|analisis|estudio|diagnostico|chequeo)/i,
      /(que\s+me\s+recomiendas\s+hacerme|que\s+me\s+hago|que\s+analisis\s+hay|que\s+pruebas\s+hacen)/i,
      /(que\s+diagnosticos?\s+debo\s+hacerme)/i
    ],
    palabrasChinas: ['做什么检查', '做哪种检查', '做什么化验', '推荐化验', '有什么检查项目', '诊断'],
    palabrasIngles: ['what tests should i take', 'what diagnostic', 'which tests', 'recommended tests'],
    generarRespuesta: (idioma, nombre) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Orientación sobre diagnósticos clínicos y exámenes disponibles.`,
          respuesta: `具体的医学诊断须由医生确定。甘博亚实验室为您提供常规血检、尿检、血脂及血糖等预防性化验。您想预约哪一项检查？`,
          accion: 'PEDIR_EXAMEN',
          opcionesExamen: EXAMENES_OFICIALES,
          opciones: EXAMENES_OFICIALES,
        };
      }
      if (idioma.esIngles && !idioma.esEspanol) {
        return {
          razonamiento: `Diagnostic guidance and preventive lab test options.`,
          respuesta: `A definitive medical diagnosis requires a doctor's evaluation. At Gamboa Lab, we offer routine preventive tests (blood, urine, lipid profile, glucose). Which one would you like to schedule?`,
          accion: 'PEDIR_EXAMEN',
          opcionesExamen: EXAMENES_OFICIALES,
          opciones: EXAMENES_OFICIALES,
        };
      }
      const opciones = [
        `El diagnóstico exacto lo determina tu médico tratante. En **Laboratorio Gamboa** disponemos de chequeos preventivos de rutina como sangre, orina, glucosa y perfil lipídico. ¿Cuál te gustaría agendar?`,
        `Para saber qué estudio específico requieres es aconsejable una orden médica. Sin embargo, para control general te sugerimos nuestros perfiles preventivos más solicitados. ¿Deseas programar tu cita para alguno?`,
        `No emitimos diagnósticos médicos directos, pero ponemos a tu disposición nuestros análisis clínicos de rutina para tu chequeo preventivo de salud. ¿Te gustaría agendar un turno?`
      ];
      return {
        razonamiento: `Orientación interactiva sobre diagnósticos: aclaración de rol de laboratorio y presentación directa de exámenes preventivos.`,
        respuesta: elegirVariacion(opciones),
        accion: 'PEDIR_EXAMEN',
        opcionesExamen: EXAMENES_OFICIALES,
        opciones: EXAMENES_OFICIALES,
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
          razonamiento: `Consulta de estado en chino.`,
          respuesta: `我很好，谢谢关心！😊 随时为您服务。请问今天需要咨询哪项检查或预约？`
        };
      }
      const opciones = [
        `¡Muy bien, gracias por preguntar${nombre ? `, ${nombre}` : ''}! 😊 Lista para ayudarte con tus análisis clínicos o citas. ¿Qué necesitas hoy?`,
        `¡Excelente! Con toda la energía para atenderte en el **Laboratorio Gamboa**. ¿Tienes alguna consulta sobre tus exámenes?`,
        `¡Todo muy bien! 😊 Aquí atenta para ayudarte a agendar o resolver tus dudas del laboratorio. ¿En qué te colaboro?`
      ];
      return {
        razonamiento: `Respuesta cordial, breve y enfocada.`,
        respuesta: elegirVariacion(opciones)
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
          razonamiento: `Identidad en chino.`,
          respuesta: `我是 **AIDA**，甘博亚实验室的AI助手。我协助您智能预约化验、了解检查禁忌并查看检验结果。🔬`
        };
      }
      const opciones = [
        `Soy **AIDA**, la asistente inteligente del **Laboratorio Clínico Gamboa**. Te ayudo a agendar citas, verificar requisitos de ayuno y consultar tus resultados. 🩺`,
        `Soy **AIDA**, asistente virtual supervisada por el **Dr. Armando Gamboa Orellana**. Mi función es guiarte en tus análisis clínicos y reservar tus turnos en segundos. 🔬`
      ];
      return {
        razonamiento: `Identidad explicada en 2 oraciones concisas.`,
        respuesta: elegirVariacion(opciones)
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
        razonamiento: `Director médico explicado con precisión y brevedad.`,
        respuesta: `👨‍⚕️ El director es el **Dr. Armando Gamboa Orellana**, especialista bioquímico-clínico responsable de la validación y calidad de todos los análisis del laboratorio.`
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
          razonamiento: `Horario en chino.`,
          respuesta: `🕐 Atendemos de **周一至周五 / Lunes a Viernes de 07:30 a 18:00 hrs** (muestras en ayunas de 07:30 a 11:30). ¿Deseas agendar un turno?`
        };
      }
      const opciones = [
        `🕐 Atendemos de **lunes a viernes de 07:30 a 18:00 hrs** en jornada continua (toma de muestras en ayunas de 07:30 a 11:30). ¿Te gustaría agendar una cita?`,
        `Nuestro horario es de **lunes a viernes de 07:30 a 18:00 hrs** (para ayuno sugerimos venir antes de las 11:30). ¿Deseas programar tu visita?`
      ];
      return {
        razonamiento: `Horarios precisos y directos con llamado a la acción.`,
        respuesta: elegirVariacion(opciones)
      };
    }
  },

  // 6. UBICACIÓN Y CONTACTO
  {
    categoria: 'UBICACION_CONTACTO',
    palabrasClave: ['donde estan', 'direccion', 'donde queda', 'ubicacion', 'como llegar', 'donde quedan'],
    patrones: [/(donde|direccion|ubicacion|como llegar|donde quedan)/],
    palabrasChinas: ['地址', '在哪里', '位置', '怎么走'],
    palabrasIngles: ['where are you', 'address', 'location'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Ubicación en chino con teléfono de contacto.`,
          respuesta: `📍 Estamos en las instalaciones centrales de **Lab. Gamboa**, de lunes a viernes de 07:30 a 18:00 hrs. Teléfono / WhatsApp de contacto: **71772118**. ¿Te gustaría agendar tu cita?`
        };
      }
      return {
        razonamiento: `Ubicación clara y teléfono del laboratorio.`,
        respuesta: `📍 Estamos ubicados en las instalaciones centrales del **Laboratorio Clínico Gamboa** (atención de lunes a viernes de 07:30 a 18:00 hrs). Para cualquier consulta puedes comunicarte al **71772118**. ¿Deseas agendar tu turno?`
      };
    }
  },

  // 6.1 CONTACTO DIRECTO DEL ENCARGADO / TELÉFONO / WHATSAPP
  {
    categoria: 'CONTACTO_ENCARGADO',
    palabrasClave: [
      'contacto del encargado', 'numero del encargado', 'telefono del encargado', 'celular del encargado',
      'whatsapp del encargado', 'contacto encargado', 'numero encargado', 'encargado',
      'contacto', 'telefono', 'celular', 'whatsapp', 'numero', 'llamar', 'escribir',
      'cual es su numero', 'cual es el numero', 'pasame su numero', 'dame su numero',
      'a que numero llamo', 'a que numero escribo', 'como me contacto', 'con quien me comunico',
      'numero de contacto', 'telefono de contacto', 'comunicarme con el encargado',
      'numero de telefono', 'numero de celular', 'numero de whatsapp'
    ],
    patrones: [
      /(contacto|numero|telefono|celular|whatsapp|llamar|escribir|comunicar).*(encargado|laboratorio|doctor|administracion)?/i,
      /(encargado|administracion).*(contacto|numero|telefono|celular|whatsapp)?/i,
      /(cual\s+es\s+el\s+(numero|contacto|telefono|celular|whatsapp))/i
    ],
    palabrasChinas: ['负责人电话', '联系电话', '电话号码', '怎么联系', '微信', '负责人联系方式', '联系方式'],
    palabrasIngles: ['manager contact', 'phone number', 'contact number', 'whatsapp', 'how to contact', 'manager phone'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Contacto del encargado del laboratorio proporcionado con precisión.`,
          respuesta: `📞 实验室负责人的联系电话是 **71772118**（支持电话与WhatsApp）。\n\nEl número de contacto del encargado del laboratorio es **71772118** (llamadas o WhatsApp). ¿Deseas agendar tu cita?`
        };
      }
      const opciones = [
        `📞 Puedes comunicarte directamente con el encargado del laboratorio al número **71772118** (disponible para llamadas y WhatsApp) para consultar costos exactos, exámenes especiales o cualquier duda. ¿Deseas que te ayude a programar una cita?`,
        `📱 El número de contacto del encargado del laboratorio es **71772118** (llamadas o WhatsApp). Estamos atentos para ayudarte en lo que requieras. ¿Te gustaría agendar un turno clínico?`,
        `👨‍💼 Para comunicarte con el encargado del laboratorio, puedes llamar o escribir al **71772118**. Con gusto resolveremos tus dudas o cotizaciones específicas. ¿Qué análisis necesitas realizarte?`
      ];
      return {
        razonamiento: `Número de contacto oficial del encargado (71772118) informado de forma directa y amable.`,
        respuesta: elegirVariacion(opciones)
      };
    }
  },

  // 7. PRECIOS Y MÉTODOS DE PAGO
  {
    categoria: 'PRECIOS_PAGOS',
    palabrasClave: ['precio', 'costo', 'valor', 'cuanto cuesta', 'cuanto cobran', 'tarifa', 'pagar', 'tarjeta', 'transferencia', 'efectivo', 'cuanto sale', 'precios', 'costos', 'tarifas', 'cuanto vale'],
    patrones: [/(precio|costo|valor|cuanto\s+cuesta|cuanto\s+cobran|tarifa|forma\s+de\s+pago|tarjeta|transferencia|cuanto\s+sale|cuanto\s+vale)/i],
    palabrasChinas: ['多少钱', '价格', '费用', '收费', '贵不贵', '支付方式', '刷卡'],
    palabrasIngles: ['price', 'cost', 'how much', 'fee', 'payment', 'card'],
    generarRespuesta: (idioma) => {
      if (idioma.esChino) {
        return {
          razonamiento: `Consulta de precios: se informa que los análisis clínicos tienen costos accesibles de 20 a 50 Bs. y se orienta a consultar al encargado al 71772118.`,
          respuesta: `💰 Los análisis clínicos tienen un costo aproximado de **20 a 50 Bs. (Bolivianos)**. Para consultar costos específicos y precisos según el estudio médico, por favor comunícate directamente con el encargado del laboratorio al **71772118**. ¿Te gustaría agendar una cita?`
        };
      }
      const opciones = [
        `💰 Nuestros análisis clínicos tienen costos aproximados entre **20 y 50 Bs.** Para consultar costos precisos según el estudio específico que requieras, te sugerimos contactarte con el encargado al número **71772118** o con la administración del laboratorio. ¿Deseas agendar tu cita?`,
        `💵 Manejamos tarifas muy accesibles: los costos de los análisis clínicos oscilan aproximadamente entre **20 y 50 Bs.** Para tarifas exactas y cotizaciones detalladas de cada prueba, puedes consultar directamente con el encargado al **71772118**. ¿Qué estudio necesitas realizarte?`,
        `💡 El costo aproximado de los análisis clínicos es de **20 a 50 Bs.** Si deseas consultar el costo preciso de una prueba específica, por favor comunícate con el encargado del laboratorio al **71772118**. ¿Te gustaría reservar tu turno?`
      ];
      return {
        razonamiento: `Costos en Bolivianos (20 a 50 Bs.) y recomendación de contactar al encargado al 71772118 para costos precisos.`,
        respuesta: elegirVariacion(opciones)
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
          razonamiento: `Resultados en chino.`,
          respuesta: `📊 Los análisis de sangre y orina están listos en **24 horas** (PCR en 24-48h). Puedes descargarlos en PDF desde la sección **"Resultados Clínicos"**. ¿Tienes alguna otra duda?`
        };
      }
      return {
        razonamiento: `Tiempos de entrega y descarga explicados en breve.`,
        respuesta: `📊 Los análisis de sangre y orina están listos en **24 horas** (PCR en 24-48h). Puedes visualizarlos y descargarlos en PDF desde la sección **"Resultados Clínicos"** de tu panel.`
      };
    }
  },

  // 9. DUDAS MÉDICAS FRECUENTES (AGUA, MEDICINAS DE PRESIÓN, DOLOR DE AGUJA, EMBARAZO)
  {
    categoria: 'DUDAS_FRECUENTES',
    palabrasClave: ['puedo tomar agua', 'tomar agua', 'beber agua', 'medicamento de presion', 'pastilla de presion', 'duele la aguja', 'duele el pinchazo', 'duele sacarse sangre', 'miedo a las agujas', 'niño', 'embarazo', 'alcohol en ayunas', 'fumar en ayunas'],
    patrones: [/(puedo tomar agua|beber agua|medicamentos? (diarios|de la presion)|duele la aguja|duele el pinchazo|miedo a las agujas|alcohol|fumar|cafe)/i],
    palabrasChinas: ['能喝水吗', '吃降压药', '针疼不疼', '能抽烟吗', '能喝酒吗', '空腹喝水'],
    palabrasIngles: ['can i drink water', 'daily medicine', 'does the needle hurt', 'can i smoke', 'alcohol', 'coffee'],
    generarRespuesta: (idioma) => {
      return {
        razonamiento: `Dudas frecuentes respondidas de manera sintética y clara.`,
        respuesta: `💡 Durante el ayuno puedes beber **agua pura en poca cantidad**; evita jugos, café, alcohol o fumar. Medicamentos de la presión tómalos con un sorbo de agua. ¿Tienes alguna otra duda?`
      };
    }
  },

  // 10. PREPARACIÓN GENERAL O ESPECÍFICA (RECOMENDACIONES CLÍNICAS)
  {
    categoria: 'PREPARACION',
    palabrasClave: [
      'como me preparo', 'preparacion', 'ayuno', 'instrucciones', 'requisitos', 'que debo hacer antes',
      'recomendaciones', 'recomendacion', 'cuales son las recomendaciones', 'que recomendaciones',
      'indicaciones', 'cuidados', 'que cuidados debo tener', 'cuidado debo tener', 'protocolo',
      'como debo ir', 'como voy', 'que no debo comer', 'puedo desayunar', 'que debo llevar',
      'puedo beber alcohol', 'puedo tomar alcohol', 'puedo tomar cerveza', 'tomar trago',
      'cuantas horas de ayuno', 'horas de ayuno', 'recoleccion de orina', 'como recolecto la orina'
    ],
    patrones: [
      /(preparar|preparacion|ayuno|requisitos|instrucciones|antes del examen|recomendaciones?|indicaciones?|cuidados?|protocolo|como voy|como debo ir)/i,
      /(puedo\s+(tomar|beber)\s+(alcohol|cerveza|trago|licor))/i,
      /(como\s+(recolecto|tomo|junto)\s+(la\s+)?orina)/i,
      /(cuantas\s+horas\s+de\s+ayuno)/i
    ],
    palabrasChinas: ['怎么准备', '注意什么', '要空腹吗', '准备工作', '禁食', '化验须知', '喝酒了吗', '空腹几小时'],
    palabrasIngles: ['how to prepare', 'preparation', 'fasting', 'instructions', 'requirements', 'recommendations'],
    generarRespuesta: (idioma, nombre, textoOriginal) => {
      // 1. Si el usuario pregunta por un examen específico o varios exámenes (ej: "recomendaciones de sangre y orina"):
      const examenDetectado = extraerExamen(textoOriginal || '');
      if (examenDetectado) {
        const recsEspecificas = obtenerRecomendacionesClinicas(examenDetectado);
        const lista = recsEspecificas.map(r => `• ${r}`).join('\n');
        return {
          razonamiento: `Recomendaciones previas breves y directas para [${examenDetectado}].`,
          respuesta: `📋 **Previsiones previas para ${examenDetectado}:**\n\n${lista}\n\n¿Deseas programar una cita para este análisis?`,
          opciones: ['📅 Sí, agendar cita', '⏰ Horarios de atención', '📞 Contactar encargado (71772118)']
        };
      }

      if (idioma.esChino) {
        return {
          razonamiento: `Protocolos de preparación breves en chino.`,
          respuesta: `📋 **化验前注意事项 / Previsiones para Análisis:**\n• **常规血检/血糖**: 空腹 8 小时 (可饮纯水)。\n• **血脂全套**: 严格空腹 12-14 小时，前 72 小时严禁饮酒。\n• **尿常规**: 晨起中段尿，并在 2 小时内送检。\n• **核酸 PCR**: 采样前 2 小时禁食饮，戴口罩。\n\n需要帮您预约检查吗？`
        };
      }

      const respuestaGeneral = `📋 **Previsiones y recomendaciones para tus análisis:**\n\n` +
        `• 🌙 **Ayuno**: 8h para sangre/glucosa y 12h para perfil lipídico (solo agua pura).\n` +
        `• 🚫 **Cero alcohol**: 24h a 48h antes de sangre/orina (72h para perfil lipídico).\n` +
        `• 🧴 **Muestra de orina**: Aseo previo, primera de la mañana y chorro medio en frasco estéril.\n` +
        `• 😷 **PCR**: Sin comer ni lavarse dientes 2h antes (con barbijo).\n` +
        `• 🆔 Traer cédula de identidad y llegar 10 min antes.\n\n` +
        `¿Para qué estudio te gustaría agendar?`;

      return {
        razonamiento: `Previsiones de preparación breves y directas.`,
        respuesta: respuestaGeneral,
        opciones: ['📅 Programar cita', '🧪 Ver exámenes disponibles', '📞 Contactar encargado (71772118)']
      };
    }
  },

  // 10.1 INFORMACIÓN CLÍNICA DETALLADA DE EXÁMENES (¿QUÉ ES Y PARA QUÉ SIRVE?)
  {
    categoria: 'INFORMACION_EXAMENES_CATALOGO',
    palabrasClave: [
      'para que sirve el hemograma', 'que es el hemograma', 'que mide el hemograma', 'para que sirve el analisis de sangre',
      'que evalua el analisis de sangre', 'para que sirve el perfil lipidico', 'que es el perfil lipidico', 'colesterol y trigliceridos',
      'para que sirve el examen de orina', 'que mide el examen de orina', 'infeccion de orina', 'infeccion urinaria',
      'para que sirve la glucosa', 'tolerancia a la glucosa', 'prueba de glucosa', 'prueba de tolerancia', 'ptgo', 'diabetes',
      'para que sirve el pcr', 'deteccion molecular', 'prueba de pcr', 'prueba molecular',
      'prueba de embarazo', 'analisis de embarazo', 'test de embarazo', 'hcg', 'hacen prueba de embarazo',
      'tiroides', 'tsh', 'acido urico', 'creatinina', 'urea', 'transaminasas',
      'que examenes hacen', 'cuales examenes hacen', 'que pruebas realizan', 'catalogo de analisis', 'lista de examenes',
      'que tipos de analisis tienen', 'que analisis tienen'
    ],
    patrones: [
      /(para\s+que\s+sirve|que\s+es|que\s+mide|que\s+evalua)\s+(el\s+|la\s+)?(hemograma|analisis\s+de\s+sangre|perfil\s+lipidico|orina|glucosa|pcr|embarazo|tiroides)/i,
      /(hacen|realizan|tienen)\s+(prueba\s+de\s+|analisis\s+de\s+)?(embarazo|tiroides|pcr|orina|sangre|glucosa|covid)/i,
      /(que|cuales)\s+(examenes|analisis|pruebas|estudios)\s+(hacen|realizan|tienen|ofrecen)/i
    ],
    palabrasChinas: ['化验项目介绍', '血常规检查什么', '尿常规检查什么', '血脂查什么', '血糖检查', '孕检', '能查怀孕吗'],
    palabrasIngles: ['what is cbc', 'what does urine test measure', 'lipid profile purpose', 'glucose tolerance test', 'pregnancy test', 'available lab tests'],
    generarRespuesta: (idioma, nombre, textoOriginal) => {
      const t = norm(textoOriginal || '');

      if (t.includes('embarazo') || t.includes('hcg')) {
        return {
          razonamiento: 'Información clínica sobre prueba de embarazo (hCG).',
          respuesta: '🤰 Realizamos **Pruebas de Embarazo en Sangre (Fracción Beta hCG cuantitativa y cualitativa)**, con máxima precisión diagnóstica desde etapas muy tempranas. Los resultados se entregan el mismo día. Costo aprox.: 20 a 50 Bs. ¿Deseas agendar tu turno?',
          opciones: ['📅 Agendar cita', '📞 Contactar encargado (71772118)']
        };
      }
      if (t.includes('sangre') || t.includes('hemograma') || t.includes('biometria')) {
        return {
          razonamiento: 'Información sobre Análisis de Sangre / Hemograma.',
          respuesta: '🩸 El **Hemograma / Análisis de Sangre** evalúa glóbulos rojos (diagnóstico de anemia), glóbulos blancos (defensas e infecciones) y plaquetas (coagulación). Requiere 8h de ayuno y abstinencia de alcohol. ¿Te gustaría agendarlo?',
          opciones: ['📅 Agendar Análisis de Sangre', '📋 Ver preparación']
        };
      }
      if (t.includes('orina') || t.includes('urinalisis')) {
        return {
          razonamiento: 'Información sobre Análisis de Orina.',
          respuesta: '🧴 El **Análisis de Orina Completo** examina función renal, presencia de infecciones bacterianas, proteínas, cristales y glucosa. Requiere recolectar el chorro medio de la primera orina de la mañana en frasco estéril. ¿Deseas programar tu turno?',
          opciones: ['📅 Agendar Análisis de Orina', '📋 Ver preparación']
        };
      }
      if (t.includes('lipid') || t.includes('colesterol') || t.includes('triglic')) {
        return {
          razonamiento: 'Información sobre Perfil Lipídico.',
          respuesta: '🧬 El **Perfil Lipídico** mide colesterol total, HDL ("bueno"), LDL ("malo") y triglicéridos para evaluar la salud cardiovascular y metabólica. Requiere 12 a 14h de ayuno estricto y cero alcohol 72h antes. ¿Deseas agendarlo?',
          opciones: ['📅 Agendar Perfil Lipídico', '📋 Ver preparación']
        };
      }
      if (t.includes('glucosa') || t.includes('azucar') || t.includes('tolerancia') || t.includes('diabetes')) {
        return {
          razonamiento: 'Información sobre Prueba de Tolerancia a la Glucosa.',
          respuesta: '🍬 La **Prueba de Tolerancia a la Glucosa (PTGO)** evalúa la respuesta del cuerpo al azúcar para detectar diabetes mellitus, prediabetes o diabetes gestacional. Requiere 8 a 10h de ayuno y 2 horas de disponibilidad en el laboratorio. ¿Deseas agendarla?',
          opciones: ['📅 Agendar Glucosa', '📋 Ver preparación']
        };
      }
      if (t.includes('pcr') || t.includes('molecular') || t.includes('covid')) {
        return {
          razonamiento: 'Información sobre Detección Molecular (PCR).',
          respuesta: '🔬 La **Detección Molecular (PCR)** detecta material genético patógeno (COVID-19 y agentes respiratorios) con máxima especificidad diagnóstica. Resultados en 24 a 48h. ¿Te gustaría agendar una toma de muestra?',
          opciones: ['📅 Agendar PCR Molecular', '📋 Ver preparación']
        };
      }

      // Catálogo general de análisis clínicos
      return {
        razonamiento: 'Catálogo de análisis clínicos y objetivos generales del laboratorio.',
        respuesta: '🔬 En el **Laboratorio Gamboa** realizamos una amplia variedad de análisis clínicos:\n• 🩸 **Análisis de Sangre**: Anemia, defensas e infecciones.\n• 🧴 **Análisis de Orina**: Infecciones y salud renal.\n• 🧬 **Perfil Lipídico**: Colesterol total, HDL, LDL y triglicéridos.\n• 🍬 **Tolerancia a Glucosa**: Control de diabetes y glicemia.\n• 🔬 **Detección Molecular (PCR)**: Detección viral de alta precisión.\n• 🤰 **Pruebas de Embarazo (hCG)** y bioquímica clínica.\n\nTarifas accesibles de **20 a 50 Bs.** ¿Cuál te gustaría programar?',
        opciones: EXAMENES_OFICIALES
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
      const opciones = [
        `¡Con mucho gusto${nombre ? `, ${nombre}` : ''}! Cuida tu salud y aquí estaré cuando me necesites. ¡Hasta pronto! 👋`,
        `¡Un placer ayudarte${nombre ? `, ${nombre}` : ''}! Que tengas un excelente día. 🌟`,
        `¡Listo! Si necesitas algo más del laboratorio, con gusto te atenderé. ¡Cuídate mucho! 😊`
      ];
      return {
        razonamiento: `Despedida cordial y breve.`,
        respuesta: elegirVariacion(opciones)
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
  const intentaCita = esIntencionCita(mensaje, textoNormalizado, contexto);

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
      pensamiento: 'El usuario canceló el agendamiento.',
      respuesta: 'Cita cancelada. ¿Te ayudo con algo más? 😊',
      intencion: 'CANCELAR_CITA'
    };
  }

  // 2. Extraer examen, fecha y hora combinando el texto original y el corregido
  const examen = extraerExamen(mensajeOriginal) || extraerExamen(textoNormalizado);
  const fecha = extraerFecha(mensajeOriginal, ahora) || extraerFecha(textoNormalizado, ahora);
  const hora = extraerHora(mensajeOriginal) || extraerHora(textoNormalizado);

  // 3. Si no aportó ningún slot y no tiene intención de cita directa, responder su duda clínica
  if (!examen && !fecha && !hora && !esIntencionCita(mensajeOriginal, textoNormalizado, contexto)) {
    const respuestaAbierta = manejarConversacionAbierta(mensajeOriginal, textoNormalizado, idioma, correcciones, contexto);
    if (respuestaAbierta.intencion !== 'CHARLA_LIBRE') {
      return respuestaAbierta;
    }
  }

  if (!contexto.citaSlots) contexto.citaSlots = {};
  const slots = contexto.citaSlots;
  contexto.temaActual = 'cita';
  contexto.ultimaIntencion = 'programar_cita';

  if (examen) {
    if (slots.examen && slots.examen !== examen) {
      const quiereReemplazar = /cambi(ar|o|a)|en\s+vez\s+de|sustitui?r|solo|solamente|unicamente|cancel(ar|a)\s+el\s+anterior/i.test(norm(mensajeOriginal));
      if (quiereReemplazar) {
        slots.examen = examen;
      } else {
        const actuales = slots.examen.split(' + ').map(e => e.trim());
        const nuevos = examen.split(' + ').map(e => e.trim());
        const combinados = Array.from(new Set([...actuales, ...nuevos]));
        slots.examen = combinados.join(' + ');
      }
    } else {
      slots.examen = examen;
    }
  }

  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const horaActualStr = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
  const minActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const minLimiteMuestrasAyuno = 11 * 60 + 30; // 11:30 — límite para toma de muestras en ayunas
  const minMediodia = 12 * 60; // 12:00
  const minCierre = 18 * 60;   // 18:00

  // Validaciones de fecha
  if (fecha) {
    if (fecha < hoyStr) {
      return {
        pensamiento: `La fecha ${fecha} ya pasó (hoy es ${hoyStr}). Pido una fecha válida.`,
        respuesta: `⚠️ Esa fecha ya pasó. Indícame una fecha de hoy en adelante:`,
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots },
      };
    }

    // ── VALIDACIÓN CLÍNICA: Si es hoy y ya pasó el horario de atención ──
    if (fecha === hoyStr && minActuales >= minCierre) {
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      const mañanaStr = `${mañana.getFullYear()}-${String(mañana.getMonth() + 1).padStart(2, '0')}-${String(mañana.getDate()).padStart(2, '0')}`;
      return {
        pensamiento: `Son las ${horaActualStr} y el laboratorio cierra a las 18:00. No se puede agendar para hoy. Sugiero mañana.`,
        respuesta: `⚠️ Ya pasó el horario de atención de hoy (**18:00 hrs**). No es posible agendar para hoy.\n\n¿Te gustaría agendar para **mañana (${formatearFechaLegible(mañanaStr)})**?`,
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots },
        opciones: [`📅 Sí, para mañana`, `📅 Elegir otra fecha`],
      };
    }

    // ── VALIDACIÓN CLÍNICA CLAVE: Exámenes que requieren ayuno después de las 12:00 ──
    const requiereAyuno = slots.examen ? /sangre|lipid|lipíd|lipidico|glucosa|ayuno|hemograma|biometr/i.test(slots.examen) : false;
    if (fecha === hoyStr && requiereAyuno && minActuales >= minMediodia) {
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      const mañanaStr = `${mañana.getFullYear()}-${String(mañana.getMonth() + 1).padStart(2, '0')}-${String(mañana.getDate()).padStart(2, '0')}`;
      return {
        pensamiento: `Son las ${horaActualStr}. El examen "${slots.examen}" requiere ayuno de 8+ horas y la toma de muestras en ayunas es solo hasta las 11:30. Después del mediodía los resultados serían incorrectos clínicamente. Rechazo y sugiero mañana temprano.`,
        respuesta: `⚠️ **No es posible agendar "${slots.examen}" para hoy.**\n\nEste examen requiere **ayuno** y la toma de muestras en ayunas es solo hasta las **11:30 hrs**. Después de esa hora los resultados clínicos saldrían alterados e incorrectos.\n\nTe recomiendo agendar para **mañana temprano** (07:30 - 11:30) en ayunas.`,
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots, fecha: undefined },
        opciones: [`📅 Agendar para mañana`, `📅 Elegir otra fecha`],
      };
    }

    slots.fecha = fecha;
  }

  // ── VALIDACIÓN CLÍNICA AL ASIGNAR FECHA "HOY" sin hora aún ──
  // Si ya tiene examen de ayuno + fecha = hoy + es después del mediodía, rechazar antes de pedir hora
  if (slots.fecha === hoyStr && !slots.hora && slots.examen) {
    const requiereAyuno = /sangre|lipid|lipíd|lipidico|glucosa|ayuno|hemograma|biometr/i.test(slots.examen);
    if (requiereAyuno && minActuales >= minMediodia) {
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      const mañanaStr = `${mañana.getFullYear()}-${String(mañana.getMonth() + 1).padStart(2, '0')}-${String(mañana.getDate()).padStart(2, '0')}`;
      slots.fecha = undefined; // Limpiar fecha inválida
      return {
        pensamiento: `El paciente eligió hoy para "${slots.examen}" que requiere ayuno, pero ya son las ${horaActualStr}. La ventana de toma de muestras en ayunas cierra a las 11:30. Los resultados saldrían incorrectos.`,
        respuesta: `⚠️ **No es posible realizar "${slots.examen}" hoy.**\n\nYa pasó el horario de toma de muestras en ayunas (**hasta 11:30 hrs**) y los resultados no serían confiables.\n\n¿Agendamos para **mañana temprano** en ayunas?`,
        intencion: 'programar_cita',
        accion: 'PEDIR_FECHA',
        citaSlots: { ...slots },
        opciones: [`📅 Sí, para mañana`, `📅 Elegir otra fecha`],
      };
    }
  }

  // Validaciones de hora
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    const minTotal = h * 60 + m;
    const minApertura = 7 * 60 + 30; // 07:30

    if (minTotal < minApertura || minTotal > minCierre) {
      return {
        pensamiento: `La hora ${hora} está fuera del horario de atención (07:30-18:00). Sugiero horarios válidos.`,
        respuesta: `⚠️ La hora **${hora}** está fuera de nuestro horario (**07:30 a 18:00 hrs**). ¿A qué hora prefieres?`,
        intencion: 'programar_cita',
        accion: 'PEDIR_HORA',
        citaSlots: { ...slots },
      };
    }

    if (slots.fecha === hoyStr && hora <= horaActualStr) {
      return {
        pensamiento: `La hora ${hora} ya pasó hoy (son las ${horaActualStr}). Pido un horario posterior.`,
        respuesta: `⚠️ La hora **${hora}** ya pasó. Elige un horario posterior a las **${horaActualStr}**:`,
        intencion: 'programar_cita',
        accion: 'PEDIR_HORA',
        citaSlots: { ...slots },
      };
    }

    // ── VALIDACIÓN CLÍNICA: hora solicitada para hoy pero el examen requiere ayuno y la hora > 11:30 ──
    if (slots.fecha === hoyStr && slots.examen) {
      const requiereAyuno = /sangre|lipid|lipíd|lipidico|glucosa|ayuno|hemograma|biometr/i.test(slots.examen);
      if (requiereAyuno && minTotal > minLimiteMuestrasAyuno) {
        return {
          pensamiento: `El paciente quiere "${slots.examen}" hoy a las ${hora}, pero este examen requiere ayuno y solo se toman muestras hasta las 11:30. Los resultados saldrían incorrectos.`,
          respuesta: `⚠️ **No puedo registrar esa cita.** El examen "${slots.examen}" requiere ayuno y la toma de muestras es solo hasta las **11:30 hrs**. Después de esa hora los resultados serían incorrectos.\n\nTe sugiero agendar **mañana entre 07:30 y 11:30** en ayunas.`,
          intencion: 'programar_cita',
          accion: 'PEDIR_FECHA',
          citaSlots: { ...slots, hora: undefined, fecha: undefined },
          opciones: [`📅 Agendar para mañana`, `📅 Elegir otra fecha`],
        };
      }
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
    partesPensamiento.push(`Falta el examen. Presento el catálogo.`);
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: idioma.esChino
        ? `好的！请问您需要预约哪项化验项目？\n\n¿Qué análisis necesitas?`
        : `¿Qué análisis necesitas realizarte?`,
      intencion: 'programar_cita',
      accion: 'PEDIR_EXAMEN',
      citaSlots: { ...slots },
      opcionesExamen: EXAMENES_OFICIALES,
    };
  }

  if (!slots.fecha) {
    partesPensamiento.push(`Examen registrado: ${slots.examen}. Solicito fecha.`);
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: idioma.esChino
        ? `已记录：**${slots.examen}**。请问哪天来？\n\nAnotado: **${slots.examen}**. ¿Para qué fecha?`
        : `Anotado: **${slots.examen}**. ¿Para qué fecha?`,
      intencion: 'programar_cita',
      accion: 'PEDIR_FECHA',
      citaSlots: { ...slots },
    };
  }

  if (!slots.hora) {
    partesPensamiento.push(`Examen y fecha listos. Solicito hora.`);
    const requiereAyunoHora = /sangre|lipid|lipíd|lipidico|glucosa|ayuno|hemograma|biometr/i.test(slots.examen);
    const horarioInfo = requiereAyunoHora
      ? `Este examen requiere **ayuno**, agenda entre **07:30 y 11:30 hrs**.`
      : `Atendemos de **07:30 a 18:00 hrs**.`;
    return {
      pensamiento: partesPensamiento.join(' '),
      respuesta: `**${slots.examen}** para el **${formatearFechaLegible(slots.fecha)}**. ${horarioInfo}\n\n¿A qué hora?`,
      intencion: 'programar_cita',
      accion: 'PEDIR_HORA',
      citaSlots: { ...slots },
    };
  }

  // Todos los slots listos
  partesPensamiento.push(`Datos completos. Presento resumen para confirmación.`);
  
  const recsClinicas = obtenerRecomendacionesClinicas(slots.examen);
  slots.recomendaciones = recsClinicas;
  const resumen = `📋 **Resumen de tu cita:**\n\n🔬 ${slots.examen}\n📅 ${formatearFechaLegible(slots.fecha)}\n🕐 ${slots.hora} hrs\n\n¿Confirmamos?`;

  return {
    pensamiento: partesPensamiento.join(' '),
    respuesta: resumen,
    intencion: 'programar_cita',
    accion: 'CONFIRMAR_CITA',
    citaSlots: { ...slots },
    recomendaciones: recsClinicas,
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

    // Prioridad alta a la delimitación de síntomas sobre charla libre o saludos
    if (regla.categoria === 'DELIMITACION_MEDICA_SINTOMAS' && puntaje > 0) {
      puntaje += 25; // Asegura que gane inmediatamente si el paciente describe dolor o malestar
    }

    // Prioridad alta a consultas externas (recetas de cocina, chistes, cultura general)
    if (regla.categoria === 'CONSULTA_EXTERNA_NO_CLINICA' && puntaje > 0) {
      puntaje += 30;
    }

    // Prioridad muy alta a orientación de diagnósticos y recomendación de exámenes
    if (regla.categoria === 'ORIENTACION_DIAGNOSTICOS_EXAMENES' && puntaje > 0) {
      puntaje += 35;
    }

    // Prioridad muy alta a consultas de contacto del encargado o teléfono directo
    if (regla.categoria === 'CONTACTO_ENCARGADO' && puntaje > 0) {
      puntaje += 35;
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
    const resp = mejorRegla.generarRespuesta(idioma, contexto.nombre, mensajeOriginal);
    pensamientoPasos.push(`Paso 4 (Razonamiento contextual): ${resp.razonamiento}`);

    contexto.ultimaIntencion = mejorRegla.categoria;
    return {
      pensamiento: pensamientoPasos.join(' '),
      respuesta: resp.respuesta,
      intencion: mejorRegla.categoria,
      accion: resp.accion,
      opcionesExamen: resp.opcionesExamen,
      opciones: resp.opciones,
    };
  }

  // Fallback breve, variado y conciso para cualquier consulta fuera del catálogo del laboratorio
  pensamientoPasos.push(`Paso 3 (Interacción abierta): Consulta general fuera del área de laboratorio. Aplico delimitación concisa.`);
  pensamientoPasos.push(`Paso 4 (Orientación breve): Respuesta dinámica y cordial orientando a análisis clínicos y citas.`);

  const fallbacksEspanol = [
    `Lo siento, no te puedo ayudar con esos datos. Como agente de Laboratorio Gamboa puedo ayudarte a registrar una cita para un análisis clínico o brindarte información sobre nuestros exámenes.`,
    `Esa consulta queda fuera de mis registros del laboratorio. Con gusto te ayudo a agendar tu cita clínica o resolver dudas sobre nuestros análisis disponibles.`,
    `Disculpa, no dispongo de esa información ya que me enfoco exclusivamente en análisis de laboratorio. ¿Te gustaría agendar una cita o ver los exámenes disponibles?`
  ];

  let respuestaFallback = '';
  if (idioma.esChino) {
    respuestaFallback = `抱歉，我无法为您提供该信息。作为甘博亚实验室的助理，我可以帮您预约化验时间或查询检查项目。请问需要帮您挂号吗？`;
  } else if (idioma.esIngles && !idioma.esEspanol) {
    respuestaFallback = `I'm sorry, I cannot help with that information. As a Gamboa Laboratory assistant, I can help you schedule a lab test appointment or provide info on our tests. Would you like to schedule one?`;
  } else {
    respuestaFallback = elegirVariacion(fallbacksEspanol);
  }

  contexto.ultimaIntencion = 'CHARLA_LIBRE';
  return {
    pensamiento: pensamientoPasos.join(' '),
    respuesta: respuestaFallback,
    intencion: 'CHARLA_LIBRE',
    opciones: ['📅 Programar cita', '⏰ Horarios de atención', '🧪 Exámenes disponibles'],
  };
}
