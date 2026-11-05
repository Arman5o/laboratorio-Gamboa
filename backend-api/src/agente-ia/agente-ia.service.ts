import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { CitasGateway } from '../citas/citas.gateway';
import { Cita } from '../citas/schemas/cita.schema';
import { LogAgente } from './schemas/log-agente.schema';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { procesarConMotorDeReglas, ContextoSesion, obtenerRecomendacionesClinicas, formatearFechaLegible, extraerFecha, extraerHora, extraerExamen, esConfirmacionAfirmativa } from './motor-reglas';
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
          systemInstruction: `Eres AIDA, el Agente Inteligente del Laboratorio Clínico Gamboa, administrado y dirigido por la Dra. Carmen Rosa Gamboa.
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
4. Datos del laboratorio: Administradora y Dirección: Dra. Carmen Rosa Gamboa. Horario: Lunes a Domingo todos los días (Lunes a Sábado 07:30 a 18:00, Domingos 07:30 a 12:00 - medio día; toma de muestras en ayunas de 07:30 a 11:30). Exámenes disponibles: Análisis de Sangre (Rutina), Detección Molecular (PCR), Análisis de Orina (Completo), Perfil Lipídico, Prueba de Tolerancia a la Glucosa. Resultados en 24h (PCR 24-48h).
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
   - Si el usuario pregunta por precios o costos: responde siempre indicando que los análisis clínicos tienen costos aproximados entre 20 y 50 Bs., y aclara con amabilidad que para costos específicos, cotizaciones exactas o pruebas especializadas puede contactarse directamente con el encargado al 71772118 o a la administración del laboratorio.
8. INFORMACIÓN DE CONTACTO DEL ENCARGADO / LABORATORIO (TELÉFONO / WHATSAPP: 71772118):
   - El número de contacto oficial del encargado del laboratorio es el 71772118 (disponible para llamadas telefónicas y WhatsApp).
   - Si el usuario pregunta por el contacto, teléfono, celular o WhatsApp del encargado o del laboratorio, o pregunta a qué número escribir/llamar para consultar costos precisos o cualquier duda: responde SIEMPRE proporcionando el número 71772118 de forma cordial y concisa.
9. COHERENCIA DE DIÁLOGO, PRECISIÓN DE TÉRMINOS Y NO REPETIR SALUDOS:
   - NUNCA repitas saludos ("¡Hola!", "¡Buenos días!", "¡Buenas tardes!") si ya existe historial previo en la conversación. Solo se saluda en el primer mensaje.
   - Distingue con total precisión entre:
     a) "Mis exámenes / Mis análisis / Mis resultados": Se refiere a los estudios o resultados propios del paciente. Si el paciente dice "ayúdame con mis exámenes" o consulta sobre sus análisis, explícale con claridad que sus resultados emitidos se consultan y descargan en PDF en la sección "Resultados Clínicos" de su panel, y pregúntale amablemente si desea ver sus resultados o si desea programar una cita para un examen nuevo.
     b) "Exámenes del laboratorio": Se refiere al catálogo que ofrece el Laboratorio Gamboa (análisis de sangre de rutina, PCR molecular, análisis de orina completo, perfil lipídico, prueba de glucosa). No utilices la frase "tus exámenes" cuando te refieres al catálogo de pruebas que ofrecemos.`,
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
    return obtenerRecomendacionesClinicas(examen);
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
    const idSesion = sessionId ?? (pacienteCorreo ? pacienteCorreo.trim().toLowerCase() : `anon_${Date.now()}`);
    let contexto = this.sesiones.get(idSesion);

    if (!contexto) {
      contexto = {
        nombre: nombrePaciente,
        turno: 0,
        ultimaIntencion: undefined,
        historial: [],
      };
      this.sesiones.set(idSesion, contexto);
      this.logger.log(`🧠 [AIDA] Nueva sesión: ${idSesion} (rol: ${rol})`);
    } else {
      // Actualizar nombre si ahora lo tenemos
      if (nombrePaciente && !contexto.nombre) {
        contexto.nombre = nombrePaciente;
      }
    }

    // Sincronizar memoria temporal de la conversación
    if (!contexto.historial) contexto.historial = [];
    if (historial && Array.isArray(historial) && historial.length > 0) {
      contexto.historial = historial.slice(-10).map((h) => ({
        de: h.de === 'usuario' ? 'usuario' : 'agente',
        texto: h.texto,
      }));
    }

    const registrarEnHistorial = (respTexto: string) => {
      contexto.historial?.push({ de: 'usuario', texto: mensaje });
      contexto.historial?.push({ de: 'agente', texto: respTexto });
      if (contexto.historial && contexto.historial.length > 16) {
        contexto.historial = contexto.historial.slice(-16);
      }
    };

    this.logger.log(`💬 [AIDA] Turno ${contexto.turno + 1} — sesión: ${idSesion} (memoria: ${contexto.historial.length} turnos)`);

    // Si viene la señal especial de cita ya registrada por el frontend
    if (mensaje === '__CITA_REGISTRADA__') {
      contexto.citaSlots = undefined;
      contexto.temaActual = undefined;
      return {
        pensamiento: 'Cita registrada en base de datos. Se reinician los slots de sesión.',
        respuesta: 'Tu cita está registrada con éxito.',
        intencion: 'CITA_REGISTRADA',
      };
    }

    // 0. Consultar si el paciente ya tiene una cita activa agendada (hoy o futura)
    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    const correoLimpio = pacienteCorreo ? pacienteCorreo.trim().toLowerCase() : '';
    const citaActiva = correoLimpio
      ? await this.citaModel
          .findOne({
            pacienteCorreo: correoLimpio,
            fecha: { $gte: hoyStr },
            estado: { $nin: ['cancelada', 'Cancelada'] },
          })
          .sort({ fecha: 1, hora: 1 })
          .exec()
      : null;

    // Si ya existe una cita activa en la base de datos:
    // Si la sesión tenía slots de esa misma cita, los limpiamos para no pedir confirmación de nuevo
    if (citaActiva && contexto.citaSlots) {
      if (
        (contexto.citaSlots.fecha === citaActiva.fecha && contexto.citaSlots.hora === citaActiva.hora) ||
        contexto.citaSlots.examen === citaActiva.examen
      ) {
        contexto.citaSlots = undefined;
        contexto.temaActual = undefined;
      }
    }

    const normMsg = mensaje.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 0.1 Si el paciente pide cancelar su cita activa:
    if (citaActiva && /cancelar\s+(mi\s+)?cita|anular\s+(mi\s+)?cita|ya\s+no\s+quiero\s+(la\s+)?cita/i.test(normMsg)) {
      citaActiva.estado = 'cancelada';
      await citaActiva.save();
      this.citasGateway.server.emit('citaActualizada', citaActiva);
      contexto.citaSlots = undefined;
      contexto.temaActual = undefined;
      return {
        pensamiento: 'El paciente canceló su cita activa por chat. Cita actualizada a cancelada en base de datos.',
        respuesta: `Tu cita de **${citaActiva.examen}** para el **${formatearFechaLegible(citaActiva.fecha)}** ha sido cancelada correctamente. ¿Deseas agendar en otra fecha?`,
        intencion: 'CANCELAR_CITA',
        opciones: ['📅 Programar cita', '⏰ Horarios'],
      };
    }

    // 0.2 Si el paciente pide modificar su cita activa y especificó hora, fecha o examen en el mensaje:
    if (citaActiva && /cambi|modific|reprogram|mov|edit/i.test(normMsg)) {
      const nuevaHora = extraerHora(mensaje);
      const nuevaFecha = extraerFecha(mensaje, ahora);
      const nuevoExamen = extraerExamen(mensaje);

      let cambios: string[] = [];
      if (nuevaHora && nuevaHora !== citaActiva.hora) {
        citaActiva.hora = nuevaHora;
        cambios.push(`horario a las **${nuevaHora} hrs**`);
      }
      if (nuevaFecha && nuevaFecha !== citaActiva.fecha) {
        citaActiva.fecha = nuevaFecha;
        cambios.push(`fecha para el **${formatearFechaLegible(nuevaFecha)}**`);
      }
      if (nuevoExamen && nuevoExamen !== citaActiva.examen) {
        citaActiva.examen = nuevoExamen;
        cambios.push(`estudio a **${nuevoExamen}**`);
      }

      if (cambios.length > 0) {
        await citaActiva.save();
        this.citasGateway.server.emit('citaActualizada', citaActiva);
        contexto.citaSlots = undefined;
        contexto.temaActual = undefined;
        return {
          pensamiento: `El paciente modificó su cita activa directamente por chat (${cambios.join(', ')}). Guardado en MongoDB.`,
          respuesta: `✅ **¡Tu cita ha sido modificada con éxito!**\n\nActualicé tu ${cambios.join(' y ')}.\n\n🔬 **${citaActiva.examen}**\n📅 **${formatearFechaLegible(citaActiva.fecha)}**\n🕐 **${citaActiva.hora} hrs**\n\n¿Necesitas algo más? 😊`,
          intencion: 'MODIFICAR_CITA',
          opciones: ['📋 Ver preparación', '🏠 Volver al inicio'],
        };
      } else {
        return {
          pensamiento: `El paciente desea modificar su cita activa (${citaActiva.examen} el ${citaActiva.fecha} a las ${citaActiva.hora}). Le pregunto qué desea cambiar.`,
          respuesta: `Tu cita actual es para **${citaActiva.examen}** el **${formatearFechaLegible(citaActiva.fecha)}** a las **${citaActiva.hora} hrs**.\n\n¿Qué dato deseas modificar? Puedes indicármelo directamente (ej: *"cámbiala a las 09:00"* o *"para mañana"*) o elegir una opción:`,
          intencion: 'MODIFICAR_CITA',
          opciones: [
            '✏️ Cambiar horario',
            '📅 Elegir otra fecha',
            '❌ Cancelar cita',
          ],
          citaSlots: {
            examen: citaActiva.examen,
            fecha: citaActiva.fecha,
            hora: citaActiva.hora,
            idCitaExistente: (citaActiva as any)._id,
          },
        };
      }
    }

    // 0.3 Si el paciente ya tiene cita activa y envía confirmación o pregunta por su cita:
    const preguntaPorCita = /tengo\s+cita|mi\s+cita|ver\s+cita|consultar\s+cita|que\s+cita|cuando\s+es\s+mi\s+cita/i.test(normMsg);
    const intentaAgendarDeNuevo = /agendar|programar|reservar|nuevo\s+turno|otra\s+cita/i.test(normMsg);

    if (citaActiva && (esConfirmacionAfirmativa(mensaje) || preguntaPorCita || intentaAgendarDeNuevo)) {
      contexto.citaSlots = undefined;
      contexto.temaActual = undefined;
      return {
        pensamiento: `El paciente ya cuenta con una cita activa agendada (${citaActiva.examen} para el ${citaActiva.fecha} a las ${citaActiva.hora}). Le informo cordialmente y ofrezco modificarla.`,
        respuesta: `Ya tienes una cita confirmada para **${citaActiva.examen}** el **${formatearFechaLegible(citaActiva.fecha)}** a las **${citaActiva.hora} hrs**.\n\n¿Deseas modificarla o necesitas ayuda con algo más?`,
        intencion: 'CITA_EXISTENTE',
        opciones: [
          '🔄 Modificar cita existente',
          '📋 Ver preparación',
          '❌ Cancelar cita',
        ],
        citaSlots: {
          examen: citaActiva.examen,
          fecha: citaActiva.fecha,
          hora: citaActiva.hora,
          idCitaExistente: (citaActiva as any)._id,
        },
      };
    }

    // 1. Ejecutar el motor cognitivo de reglas local (100% autónomo y determinista para citas)
    const resultadoLocal = procesarConMotorDeReglas(mensaje, contexto, ahora);
    registrarEnHistorial(resultadoLocal.respuesta);

    // Si el motor local confirmó y registró la cita
    if (resultadoLocal.accion === 'CITA_REGISTRADA' && resultadoLocal.citaSlots) {
      const slots = resultadoLocal.citaSlots;
      try {
        const nuevaCita = new this.citaModel({
          pacienteCorreo: correoLimpio || 'paciente@laboratorio.com',
          pacienteNombre: nombrePaciente || contexto.nombre || 'Paciente',
          examen: slots.examen,
          fecha: slots.fecha,
          hora: slots.hora,
          estado: 'pendiente',
        });
        const citaGuardada = await nuevaCita.save();
        const adminCorreo = process.env.EMAIL_USER ?? '';
        this.notificarConfirmacionPaciente(citaGuardada).catch(() => {});
        this.notificarNuevaCitaAdmin(citaGuardada, adminCorreo).catch(() => {});
        this.citasGateway.server.emit('agente:nuevaCita', {
          tipo: 'NUEVA_CITA',
          mensaje: `Nueva cita reservada para ${citaGuardada.examen} el ${citaGuardada.fecha} a las ${citaGuardada.hora}`,
          cita: citaGuardada,
        });
        contexto.citaSlots = undefined;
        contexto.temaActual = undefined;
      } catch (err) {
        this.logger.error(`Error guardando cita confirmada: ${err.message}`);
      }
      return resultadoLocal as any;
    }

    // 2. Si el flujo es una acción interactiva técnica de cita (PEDIR_FECHA, PEDIR_HORA, CONFIRMAR_CITA),
    // retornamos inmediatamente para que el frontend active los componentes de selección
    const esAccionTecnicaCita = resultadoLocal.accion && ['PEDIR_FECHA', 'PEDIR_HORA', 'CONFIRMAR_CITA'].includes(resultadoLocal.accion);
    if (esAccionTecnicaCita) {
      this.logger.log(`🎯 [AIDA Citas] Acción interactiva: ${resultadoLocal.accion} [${resultadoLocal.intencion}]`);
      return resultadoLocal as any;
    }

    // 3. Si Gemini 3.5 Flash-Lite está activo, generamos una respuesta conversacional dinámica, variada e inteligente
    if (this.geminiModel) {
      try {
        const promptChat = `Paciente: ${nombrePaciente || 'Usuario'}
Historial previo: ${JSON.stringify(contexto.historial ? contexto.historial.slice(-6) : [])}
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
            this.logger.log(`✨ [AIDA Gemini 3.5] Respuesta interactiva generada: [${parsed.intencion}]`);
            contexto.ultimaIntencion = parsed.intencion;
            // Actualizar última respuesta del agente en el historial
            if (contexto.historial && contexto.historial.length > 0) {
              contexto.historial[contexto.historial.length - 1].texto = parsed.respuesta;
            }
            // Adjuntar opciones interactivas si el motor local las sugirió para este contexto
            return {
              ...parsed,
              opciones: (resultadoLocal as any).opciones || (resultadoLocal as any).opcionesExamen || parsed.opciones,
              accion: resultadoLocal.accion || parsed.accion,
              citaSlots: resultadoLocal.citaSlots,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`⚡ [AIDA Fallback a motor local]: ${err.message || err}`);
      }
    }

    // 4. Retorno del motor cognitivo local si Gemini no está disponible o falló
    this.logger.log(`💭 [AIDA Motor Local] Intención: [${resultadoLocal.intencion}]`);
    return resultadoLocal as any;
  }
}

