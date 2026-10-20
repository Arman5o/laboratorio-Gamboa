import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { CitasGateway } from '../citas/citas.gateway';
import { Cita } from '../citas/schemas/cita.schema';
import { LogAgente } from './schemas/log-agente.schema';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { procesarConMotorDeReglas, ContextoSesion } from './motor-reglas';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AgenteIaService implements OnModuleInit {
  private readonly logger = new Logger('AgenteIA');
  private genAI: GoogleGenerativeAI | null = null;
  private geminiModel: any = null;

  // Contextos de sesión por sessionId (memoria de conversación)
  private readonly sesiones = new Map<string, ContextoSesion>();

  constructor(
    private readonly emailService: EmailService,
    private readonly citasGateway: CitasGateway,
    @InjectModel(Cita.name) private citaModel: Model<Cita>,
    @InjectModel(LogAgente.name) private logModel: Model<LogAgente>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.geminiModel = this.genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
          systemInstruction: `Eres AIDA, el Agente Inteligente del Laboratorio Clínico Gamboa (Dr. Armando Gamboa Orellana).
Tu rol es interactuar con el paciente o usuario de manera empática, profesional y altamente inteligente.
Debes responder SIEMPRE en formato JSON estricto con esta estructura:
{
  "pensamiento": "Paso 1 (Percepción lingüística): idioma y tono... Paso 2 (Corrección léxica/typos detectados si los hay): términos corregidos... Paso 3 (Comprensión semántica): qué busca o pregunta el usuario... Paso 4 (Razonamiento contextual): justificación de la respuesta clínica.",
  "respuesta": "Tu respuesta médica/asistencial clara, empática y útil para el paciente",
  "intencion": "SALUDO | CONSULTA_PRECIOS | HORARIOS | UBICACION | PREPARACION | PROGRAMAR_CITA | DUDAS_CLINICAS | RESULTADOS | DIRECTOR_MEDICO | CHARLA_LIBRE | DELIMITACION_MEDICA_SINTOMAS"
}
Reglas operativas y entrenamiento:
1. Responde a CUALQUIER cosa que pregunte o diga el paciente o usuario, incluso con un simple "hola", iniciando un diálogo interactivo y atento.
2. Si el usuario escribe palabras con letras mezcladas, abreviaciones de chat o errores de tipeo (ej: 'hla', 'q tal', 'sngre', 'orna', 'qiero agndar'), deduce lo que quiso decir con pensamiento razonable e indícalo en el Paso 2 de tu pensamiento.
3. Si el usuario escribe en chino (中文), español, o ambos mezclados (ej: '你好 quiero saber el precio', '你好我想做血液检查'), comprende fluidamente y responde con cortesía bilingüe o en su idioma según corresponda.
4. Datos del laboratorio: Director Médico: Dr. Armando Gamboa Orellana. Horario: Lunes a Viernes 07:30 a 18:00 (toma de muestras en ayunas de 07:30 a 11:30). Exámenes disponibles: Análisis de Sangre (Rutina), Detección Molecular (PCR), Análisis de Orina (Completo), Perfil Lipídico, Prueba de Tolerancia a la Glucosa. Resultados en 24h (PCR 24-48h).
5. DELIMITACIÓN ESTRICTA DEL ÁREA (LABORATORIO DE ANÁLISIS CLÍNICOS EXCLUSIVAMENTE):
   - Eres únicamente el asistente de un LABORATORIO DE ANÁLISIS CLÍNICOS. NO eres médico tratante, NO realizas consultas médicas generales, NO emites diagnósticos de enfermedades ni recetas medicamentos o tratamientos.
   - Si el paciente te cuenta síntomas, dolores o malestares corporales (ej: 'me duele la barriga', 'dolor de estómago', 'me duele la cabeza', 'tengo fiebre', 'qué medicamento me tomo', 'qué pastilla tomo'):
     a) Aclara con empatía y en BREVE que NO estás especializada en esa rama (diagnóstico o consulta médica general) y que debe acudir con un médico o especialista.
     b) Ofrece de inmediato ayudarle o sugerirle reservar/agendar una cita médica en el laboratorio para los análisis clínicos (como biometría hemática, sangre u orina) que su médico le pueda ordenar para investigar la causa.
     c) Clasifica la intención como 'DELIMITACION_MEDICA_SINTOMAS'.
6. REGLA DE ORO DE CONCISIÓN, PRECISIÓN, VARIEDAD E INTERACTIVIDAD (MÁXIMO 2 A 3 ORACIONES):
   - Tus respuestas deben ser SIEMPRE breves, directas, empáticas y claras (máximo 2 a 3 oraciones cortas).
   - NUNCA generes muros de texto ni párrafos largos.
   - NUNCA asumas que el usuario tiene una molestia, dolor o queja cuando te pregunta algo normal o cotidiano.
   - Si el usuario pregunta qué diagnósticos o exámenes debe hacerse ("qué diagnósticos debo hacerme", "qué análisis me hago", etc.), aclara en 1 oración que la indicación médica exacta depende de su médico, pero ofrece de inmediato nuestros chequeos preventivos (sangre, orina, perfil lipídico, glucosa).
   - Si el usuario te pregunta por cualquier tema ajeno al laboratorio (cocina, recetas de pan/comida, deportes, tareas, cultura general, etc.), aclara con respeto y brevedad (1 oración) que ese dato queda fuera de tus funciones de laboratorio y ofrece consultar exámenes o registrar una cita clínica.
   - Utiliza vocabulario variado en cada respuesta para evitar sonar repetitiva.
7. POLÍTICA DE PRECIOS Y TARIFAS (MONEDA OFICIAL: BOLIVIANOS - Bs.):
   - La moneda del laboratorio es el BOLIVIANO (Bs.). NUNCA utilices dólares ($) ni menciones cifras exorbitantes (como $250).
   - Los análisis clínicos de rutina (como sangre, orina, glucosa) tienen costos muy económicos y accesibles, con un rango aproximado de 20 a 50 Bs.
   - Si el usuario pregunta por precios o costos: responde siempre indicando que los análisis clínicos tienen costos aproximados entre 20 y 50 Bs., y aclara con amabilidad que para costos específicos, cotizaciones exactas o pruebas especializadas puede contactarse directamente con el encargado o la administración del laboratorio.`,
        });
        this.logger.log('🧠 [AIDA] Copiloto neuronal Gemini 3.5 Flash-Lite inicializado con éxito');
      } catch (err) {
        this.logger.warn(`⚠️ [AIDA] No se pudo conectar con Gemini: ${err}`);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // ██  AGENTE INTELIGENTE — CICLO AUTÓNOMO       ██
  // ██  Se ejecuta automáticamente cada día       ██
  // ═══════════════════════════════════════════════

  @Cron('0 7 * * *', { name: 'recordatorios_diarios', timeZone: 'America/Guayaquil' })
  async cicloAutonomoRecordatorios(): Promise<void> {
    this.logger.log('🤖 [AGENTE IA] Iniciando ciclo autónomo de recordatorios diarios...');
    try {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const fechaManana = manana.toISOString().split('T')[0];
      const hoy = new Date().toISOString().split('T')[0];

      const citasManana = await this.citaModel.find({
        fecha: fechaManana,
        estado: { $in: ['pendiente', 'confirmada'] },
      }).exec();

      this.logger.log(`🔍 [PERCEPCIÓN] Encontradas ${citasManana.length} citas para mañana (${fechaManana})`);

      if (citasManana.length === 0) {
        await this.registrarLog(hoy, 'EVALUACION_SIN_ACCION',
          `El agente evaluó la agenda del ${fechaManana} y no hay citas activas que requieran recordatorio.`,
          0, 'sin_citas');
        return;
      }

      let exitosos = 0;
      let errores = 0;
      for (const cita of citasManana) {
        try {
          await this.enviarRecordatorioAutonomo(cita);
          exitosos++;
        } catch (err) {
          errores++;
          this.logger.error(`  ❌ Error al enviar a ${cita.pacienteCorreo}: ${err}`);
        }
      }

      this.citasGateway.server.emit('agente:recordatorioDiario', {
        tipo: 'RECORDATORIO_DIARIO',
        mensaje: `🤖 Agente IA: Se enviaron ${exitosos} recordatorios para las citas de mañana (${fechaManana})`,
        total: citasManana.length, exitosos, errores,
      });

      const resultado = errores === 0 ? 'exito' : errores < citasManana.length ? 'error_parcial' : 'error';
      await this.registrarLog(hoy, 'RECORDATORIO_DIARIO',
        `El agente envió ${exitosos} recordatorios para ${citasManana.length} citas el ${fechaManana}.`,
        exitosos, resultado);
    } catch (error) {
      this.logger.error(`💥 [AGENTE IA] Error crítico: ${error}`);
      const hoy = new Date().toISOString().split('T')[0];
      await this.registrarLog(hoy, 'ERROR_CRITICO', `Error crítico en el ciclo autónomo: ${error}`, 0, 'error');
    }
  }

  async ejecutarRecordatoriosManual(): Promise<{ exitosos: number; total: number; fecha: string }> {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];
    const hoy = new Date().toISOString().split('T')[0];

    const citasManana = await this.citaModel.find({
      fecha: fechaManana,
      estado: { $in: ['pendiente', 'confirmada'] },
    }).exec();

    let exitosos = 0;
    for (const cita of citasManana) {
      try { await this.enviarRecordatorioAutonomo(cita); exitosos++; } catch { /* continuar */ }
    }

    this.citasGateway.server.emit('agente:recordatorioDiario', {
      tipo: 'EJECUCION_MANUAL',
      mensaje: `🤖 Agente IA (manual): Se enviaron ${exitosos} recordatorios para mañana (${fechaManana})`,
      total: citasManana.length, exitosos,
    });

    await this.registrarLog(hoy, 'EJECUCION_MANUAL',
      `Ejecución manual por admin. ${exitosos} de ${citasManana.length} recordatorios enviados para el ${fechaManana}.`,
      exitosos, exitosos === citasManana.length ? 'exito' : 'error_parcial');

    return { exitosos, total: citasManana.length, fecha: fechaManana };
  }

  private async enviarRecordatorioAutonomo(cita: any): Promise<void> {
    const recomendaciones = this.generarRecomendaciones(cita.examen);
    const recsHtml = recomendaciones.map(r => `<li style="padding:6px 0;color:#cbd5e1;font-size:13px">${r}</li>`).join('');
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:linear-gradient(135deg,#0e7490,#0891b2);padding:16px 20px;border-radius:8px;margin-bottom:24px">
          <p style="margin:0;font-weight:bold;font-size:14px;color:#fff">🤖 AGENTE INTELIGENTE — LAB. GAMBOA</p>
          <p style="margin:4px 0 0;font-size:11px;color:#a5f3fc;letter-spacing:2px">RECORDATORIO AUTOMÁTICO DIARIO</p>
        </div>
        <h2 style="color:#fbbf24;font-size:18px">⏰ Recordatorio: Tu cita es MAÑANA</h2>
        <p style="color:#94a3b8;font-size:13px">Hola <strong style="color:#f1f5f9">${cita.pacienteNombre}</strong>, el Agente Inteligente te recuerda tu cita de <strong style="color:#fbbf24">mañana</strong>:</p>
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #334155">
          <p style="margin:4px 0"><span style="color:#64748b">Estudio:</span> <strong style="color:#f1f5f9">${cita.examen}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Fecha:</span> <strong style="color:#fbbf24">${cita.fecha}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Hora:</span> <strong style="color:#22d3ee;font-family:monospace;font-size:16px">${cita.hora}</strong></p>
        </div>
        <div style="background:#083344;border-radius:8px;padding:16px;border-left:3px solid #0e7490;margin-bottom:16px">
          <p style="margin:0 0 8px;font-weight:bold;color:#22d3ee;font-size:13px">📋 Protocolo de Preparación (generado por IA):</p>
          <ul style="margin:0;padding-left:16px">${recsHtml}</ul>
        </div>
        <p style="font-size:12px;color:#475569;margin-top:20px">⏰ Llega 10 minutos antes de tu turno.</p>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #334155">
          <p style="margin:0;font-size:10px;color:#475569;text-align:center">Generado autónomamente por el Agente Inteligente del Lab. Gamboa — ${new Date().toLocaleDateString('es-EC')}</p>
        </div>
      </div>`;
    await this.emailService.enviarNotificacion(
      cita.pacienteCorreo,
      `⏰ Recordatorio IA: Tu cita para ${cita.examen} es MAÑANA — ${cita.hora}`,
      html,
    );
  }

  private generarRecomendaciones(examen: string): string[] {
    const recomendaciones: Record<string, string[]> = {
      'Análisis de Sangre (Rutina)': ['🌙 Ayuno de 8 horas previo', '💧 Puedes beber agua con moderación', '🧘 Descansa bien la noche anterior', '🚫 Evita alcohol 24 horas antes'],
      'Detección Molecular (PCR)': ['🚫 No comas ni bebas 2 horas antes', '😷 Acude con mascarilla obligatoriamente', '🧬 Evita aerosoles nasales 24h antes', '🚫 No fumes antes de la prueba'],
      'Análisis de Orina (Completo)': ['🧴 Realiza higiene genital antes de recolectar', '🧬 Desecha el primer chorro de orina', '🍠 Evita remolacha o zanahoria días previos', '🚫 No consumas alcohol 24 horas antes'],
      'Perfil Lipídico': ['🍽️ Ayuno estricto de 12-14 horas', '🚭 No fumes antes del examen', '🏃 Evita ejercicio intenso el día anterior', '🚫 Cero alcohol 72 horas antes (altera triglicéridos)'],
      'Prueba de Tolerancia a la Glucosa': ['🍬 Evita azúcares refinados 2 días antes', '🌙 Ayuno de 8-10 horas', '☕ No tomes café antes de la prueba', '🚫 Evita alcohol 48 horas antes'],
    };
    return recomendaciones[examen] ?? ['📋 Sigue las instrucciones del laboratorio', '🆔 Trae tu cédula de identidad'];
  }

  private async registrarLog(fecha: string, accion: string, descripcion: string, citasNotificadas: number, resultado: string): Promise<void> {
    try {
      const log = new this.logModel({ fecha, accion, descripcion, citasNotificadas, resultado });
      await log.save();
    } catch (err) {
      this.logger.error(`Error al guardar log: ${err}`);
    }
  }

  async obtenerLogs(limite = 20): Promise<LogAgente[]> {
    return await this.logModel.find().sort({ createdAt: -1 }).limit(limite).exec();
  }

  async notificarNuevaCitaAdmin(cita: any, adminCorreo: string) {
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:#0e7490;padding:12px 20px;border-radius:8px;margin-bottom:24px;display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">🤖</span>
          <div>
            <p style="margin:0;font-weight:bold;font-size:14px;color:#fff">AGENTE IA — LAB. GAMBOA</p>
            <p style="margin:0;font-size:11px;color:#a5f3fc;letter-spacing:2px">NUEVA CITA REGISTRADA</p>
          </div>
        </div>
        <h2 style="color:#22d3ee;font-size:18px;margin-bottom:16px">📅 Nueva Reserva Biológica</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Paciente</td><td style="padding:8px 0;font-weight:bold;color:#f1f5f9">${cita.pacienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Correo</td><td style="padding:8px 0;color:#22d3ee">${cita.pacienteCorreo}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Examen</td><td style="padding:8px 0;font-weight:bold;color:#f1f5f9">${cita.examen}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Fecha</td><td style="padding:8px 0;color:#f1f5f9">${cita.fecha}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Hora</td><td style="padding:8px 0;font-family:monospace;color:#22d3ee;font-size:15px">${cita.hora}</td></tr>
        </table>
      </div>`;
    await this.emailService.enviarNotificacion(adminCorreo, '🤖 Agente IA: Nueva cita registrada', html);
    await this.notificacionesService.crearNotificacion({ tipo: 'NUEVA_CITA', mensaje: `Nueva cita de ${cita.pacienteNombre} para ${cita.fecha} a las ${cita.hora}`, destinatario: 'admin', cita });
    await this.notificacionesService.crearNotificacion({ tipo: 'NUEVA_CITA', mensaje: `Tu cita para ${cita.examen} ha sido registrada exitosamente.`, destinatario: cita.pacienteCorreo, cita });
    this.citasGateway.server.emit('agente:nuevaCita', { tipo: 'NUEVA_CITA', mensaje: `Nueva cita de ${cita.pacienteNombre} para ${cita.fecha} a las ${cita.hora}`, cita });
  }

  async notificarConfirmacionPaciente(cita: any) {
    const recs = this.generarRecomendaciones(cita.examen);
    const recsHtml = recs.map(r => `<li style="padding:6px 0;color:#cbd5e1;font-size:13px">${r}</li>`).join('');
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:#0e7490;padding:12px 20px;border-radius:8px;margin-bottom:24px">
          <p style="margin:0;font-weight:bold;font-size:14px;color:#fff">🤖 AGENTE IA — LAB. GAMBOA</p>
          <p style="margin:0;font-size:11px;color:#a5f3fc;letter-spacing:2px">CONFIRMACIÓN DE CITA</p>
        </div>
        <h2 style="color:#22d3ee;font-size:18px">✅ ¡Tu cita fue confirmada, ${cita.pacienteNombre}!</h2>
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #334155">
          <p style="margin:4px 0"><span style="color:#64748b">Estudio:</span> <strong style="color:#f1f5f9">${cita.examen}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Fecha:</span> <strong style="color:#f1f5f9">${cita.fecha}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Hora:</span> <strong style="color:#22d3ee;font-family:monospace;font-size:16px">${cita.hora}</strong></p>
        </div>
        <div style="background:#083344;border-radius:8px;padding:16px;border-left:3px solid #0e7490">
          <p style="margin:0 0 8px;font-weight:bold;color:#22d3ee;font-size:13px">📋 Protocolo de Preparación:</p>
          <ul style="margin:0;padding-left:16px">${recsHtml}</ul>
        </div>
      </div>`;
    await this.emailService.enviarNotificacion(cita.pacienteCorreo, `✅ Cita confirmada — ${cita.examen}`, html);
  }

  async enviarRecordatorio(cita: any) {
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:#d97706;padding:12px 20px;border-radius:8px;margin-bottom:24px">
          <p style="margin:0;font-weight:bold;font-size:14px;color:#fff">🔔 AGENTE IA — RECORDATORIO</p>
        </div>
        <h2 style="color:#fbbf24;font-size:18px">⏰ Recordatorio de Cita</h2>
        <p style="color:#94a3b8">Hola <strong style="color:#f1f5f9">${cita.pacienteNombre}</strong>, el Agente IA te recuerda tu próxima cita:</p>
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #92400e">
          <p style="margin:4px 0"><span style="color:#64748b">Estudio:</span> <strong style="color:#f1f5f9">${cita.examen}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Fecha:</span> <strong style="color:#fbbf24">${cita.fecha}</strong></p>
          <p style="margin:4px 0"><span style="color:#64748b">Hora:</span> <strong style="color:#fbbf24;font-family:monospace;font-size:16px">${cita.hora}</strong></p>
        </div>
      </div>`;
    await this.emailService.enviarNotificacion(cita.pacienteCorreo, `🔔 Recordatorio: ${cita.examen} — ${cita.fecha}`, html);
    await this.notificacionesService.crearNotificacion({ tipo: 'RECORDATORIO', mensaje: `Recordatorio: Tienes una cita para ${cita.examen} el ${cita.fecha} a las ${cita.hora}`, destinatario: cita.pacienteCorreo, cita });
    await this.notificacionesService.crearNotificacion({ tipo: 'RECORDATORIO', mensaje: `Recordatorio enviado a ${cita.pacienteNombre} para su cita del ${cita.fecha}`, destinatario: 'admin', cita });
    this.citasGateway.server.emit('agente:recordatorio', { tipo: 'RECORDATORIO', mensaje: `Recordatorio enviado a ${cita.pacienteNombre} para su cita del ${cita.fecha}`, cita });
  }

  async notificarModificacionCita(cita: any) {
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:#0e7490;padding:12px 20px;border-radius:8px;margin-bottom:24px">
          <p style="margin:0;font-weight:bold;color:#fff">🔄 AGENTE IA — REPROGRAMACIÓN DE CITA</p>
        </div>
        <h2 style="font-size:18px">✏️ Cita Reprogramada: ${cita.examen}</h2>
        <p style="color:#94a3b8">Tu cita ha sido actualizada exitosamente para el <strong style="color:#f1f5f9">${cita.fecha}</strong> a las <strong style="color:#22d3ee">${cita.hora}</strong>.</p>
      </div>`;
    await this.emailService.enviarNotificacion(cita.pacienteCorreo, `✏️ Cita modificada — ${cita.examen}`, html).catch(() => {});
    await this.notificacionesService.crearNotificacion({
      tipo: 'ACTUALIZACION',
      mensaje: `Tu cita para ${cita.examen} ha sido reprogramada para el ${cita.fecha} a las ${cita.hora}.`,
      destinatario: cita.pacienteCorreo,
      cita,
    }).catch(() => {});
    await this.notificacionesService.crearNotificacion({
      tipo: 'ACTUALIZACION',
      mensaje: `Cita de ${cita.pacienteNombre ?? cita.pacienteCorreo} reprogramada para ${cita.fecha} a las ${cita.hora}.`,
      destinatario: 'admin',
      cita,
    }).catch(() => {});
    this.citasGateway.server.emit('agente:estadoCita', {
      tipo: 'ACTUALIZACION',
      estado: cita.estado,
      mensaje: `Cita de ${cita.pacienteNombre ?? cita.pacienteCorreo} reprogramada para ${cita.fecha} a las ${cita.hora}`,
      cita,
    });
  }

  async notificarCambioEstado(cita: any) {
    const mensajes: Record<string, { asunto: string; icono: string; color: string; texto: string }> = {
      cancelada:  { asunto: '❌ Tu cita fue cancelada', icono: '❌', color: '#dc2626', texto: 'Ha sido cancelada' },
      confirmada: { asunto: '✅ Tu cita fue confirmada', icono: '✅', color: '#16a34a', texto: 'Ha sido confirmada por el laboratorio' },
      completada: { asunto: '🏁 Tu cita fue completada', icono: '🏁', color: '#0e7490', texto: 'Ha sido marcada como completada' },
      pendiente:  { asunto: '⏳ Tu cita está pendiente', icono: '⏳', color: '#f59e0b', texto: 'Se encuentra en estado pendiente' },
    };
    const info = mensajes[cita.estado];
    if (!info) return;
    const html = `
      <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:520px;margin:auto">
        <div style="background:${info.color};padding:12px 20px;border-radius:8px;margin-bottom:24px">
          <p style="margin:0;font-weight:bold;color:#fff">🤖 AGENTE IA — ACTUALIZACIÓN DE CITA</p>
        </div>
        <h2 style="font-size:18px">${info.icono} Actualización: ${cita.examen}</h2>
        <p style="color:#94a3b8">Tu cita para el <strong style="color:#f1f5f9">${cita.fecha}</strong> a las <strong style="color:#22d3ee">${cita.hora}</strong> — ${info.texto}.</p>
      </div>`;
    await this.emailService.enviarNotificacion(cita.pacienteCorreo, info.asunto, html).catch(() => {});
    await this.notificacionesService.crearNotificacion({ tipo: 'ESTADO_ACTUALIZADO', mensaje: `Tu cita de ${cita.examen} ${info.texto}`, destinatario: cita.pacienteCorreo, cita });
    await this.notificacionesService.crearNotificacion({ tipo: 'ESTADO_ACTUALIZADO', mensaje: `Cita de ${cita.pacienteNombre}: ${info.texto}`, destinatario: 'admin', cita });
    this.citasGateway.server.emit('agente:estadoCita', { tipo: 'ESTADO_ACTUALIZADO', estado: cita.estado, mensaje: `Cita de ${cita.pacienteNombre}: ${info.texto}`, cita });
  }

  // ═══════════════════════════════════════════════════════════════
  // ██  CHAT INTELIGENTE — AIDA con Motor de Reglas Propio       ██
  // ██  100% autónomo, sin APIs externas                         ██
  // ═══════════════════════════════════════════════════════════════

  /**
   * Procesa un mensaje usando el motor de reglas local de AIDA.
   * Retorna { pensamiento, respuesta } — sin ninguna API externa.
   */
  async procesarMensajeChat(
    mensaje: string,
    rol: string,
    sessionId?: string,
    pacienteCorreo?: string,
    nombrePaciente?: string,
    historial?: Array<{ de: string; texto: string }>,
  ): Promise<any> {
    // Recuperar o crear contexto de sesión
    const idSesion = sessionId ?? `anon_${Date.now()}`;
    let contexto = this.sesiones.get(idSesion);

    if (!contexto) {
      contexto = {
        nombre: nombrePaciente,
        turno: 0,
        ultimaIntencion: undefined,
      };
      this.sesiones.set(idSesion, contexto);
      this.logger.log(`🧠 [AIDA] Nueva sesión: ${idSesion} (rol: ${rol})`);
    } else {
      // Actualizar nombre si ahora lo tenemos
      if (nombrePaciente && !contexto.nombre) {
        contexto.nombre = nombrePaciente;
      }
    }

    this.logger.log(`💬 [AIDA] Turno ${contexto.turno + 1} — sesión: ${idSesion}`);

    // 1. Ejecutar el motor cognitivo de reglas local (100% autónomo y determinista para citas)
    const resultadoLocal = procesarConMotorDeReglas(mensaje, contexto);

    // 2. Si el flujo requiere acción de citas (PEDIR_EXAMEN, PEDIR_FECHA, PEDIR_HORA, CONFIRMAR_CITA),
    // retornamos inmediatamente para que el frontend active los componentes interactivos
    if (resultadoLocal.accion) {
      this.logger.log(`🎯 [AIDA Citas] Acción: ${resultadoLocal.accion} [${resultadoLocal.intencion}]`);
      return resultadoLocal as any;
    }

    // 2.1 Delimitación médica de síntomas fuera del área del laboratorio
    if (resultadoLocal.intencion === 'DELIMITACION_MEDICA_SINTOMAS') {
      contexto.ultimaIntencion = 'DELIMITACION_MEDICA_SINTOMAS';
      this.logger.log(`🩺 [AIDA Delimitación Clínica] Síntomas detectados fuera del alcance de laboratorio.`);
      return resultadoLocal as any;
    }

    // 2.2 Orientación sobre diagnósticos y recomendación de exámenes clínicos
    if (resultadoLocal.intencion === 'ORIENTACION_DIAGNOSTICOS_EXAMENES') {
      contexto.ultimaIntencion = 'programar_cita';
      this.logger.log(`🔬 [AIDA Diagnósticos] Orientación de diagnósticos y catálogo interactivo presentado.`);
      return resultadoLocal as any;
    }

    // 2.3 Consultas externas ajenas al laboratorio (recetas de cocina, chistes, cultura general, etc.)
    if (resultadoLocal.intencion === 'CONSULTA_EXTERNA_NO_CLINICA') {
      contexto.ultimaIntencion = 'CONSULTA_EXTERNA_NO_CLINICA';
      this.logger.log(`📚 [AIDA Consulta Externa] Pregunta no clínica: delimitación concisa directa.`);
      return resultadoLocal as any;
    }

    // 2.4 Consultas de precios y costos (siempre en Bolivianos, 20 a 50 Bs, contacto con encargado para precios precisos)
    if (resultadoLocal.intencion === 'PRECIOS_PAGOS') {
      contexto.ultimaIntencion = 'PRECIOS_PAGOS';
      this.logger.log(`💰 [AIDA Precios] Información de costos en Bolivianos (20 a 50 Bs) provista.`);
      return resultadoLocal as any;
    }

    // 3. Si Gemini 3.5 Flash-Lite está activo, enriquecemos la conversación
    if (this.geminiModel) {
      try {
        const promptChat = `Paciente: ${nombrePaciente || 'Usuario'}
Historial previo: ${JSON.stringify(historial ? historial.slice(-4) : [])}
Mensaje actual del usuario: "${mensaje}"`;

        const geminiPromise = this.geminiModel.generateContent(promptChat);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de 3500ms excedido')), 3500),
        );

        const resGemini: any = await Promise.race([geminiPromise, timeoutPromise]);
        const textoGenerado = resGemini.response.text();

        const jsonMatch = textoGenerado.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.pensamiento && parsed.respuesta) {
            this.logger.log(`✨ [AIDA Gemini 3.5] Respuesta generada: [${parsed.intencion}]`);
            contexto.ultimaIntencion = parsed.intencion;
            return parsed;
          }
        }
      } catch (err) {
        this.logger.warn(`⚡ [AIDA Fallback a motor local]: ${err.message || err}`);
      }
    }

    // 4. Retorno del motor cognitivo local
    this.logger.log(`💭 [AIDA Motor Local] Intención: [${resultadoLocal.intencion}]`);
    return resultadoLocal as any;
  }
}

