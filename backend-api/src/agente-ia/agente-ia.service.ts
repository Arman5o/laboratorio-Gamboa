import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { CitasGateway } from '../citas/citas.gateway';
import { Cita } from '../citas/schemas/cita.schema';
import { LogAgente } from './schemas/log-agente.schema';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { procesarConMotorDeReglas, ContextoSesion } from './motor-reglas';

@Injectable()
export class AgenteIaService {
  private readonly logger = new Logger('AgenteIA');

  // Contextos de sesión por sessionId (memoria de conversación)
  private readonly sesiones = new Map<string, ContextoSesion>();

  constructor(
    private readonly emailService: EmailService,
    private readonly citasGateway: CitasGateway,
    @InjectModel(Cita.name) private citaModel: Model<Cita>,
    @InjectModel(LogAgente.name) private logModel: Model<LogAgente>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

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

  async notificarCambioEstado(cita: any) {
    const mensajes: Record<string, { asunto: string; icono: string; color: string; texto: string }> = {
      cancelada:  { asunto: '❌ Tu cita fue cancelada', icono: '❌', color: '#dc2626', texto: 'Ha sido cancelada' },
      confirmada: { asunto: '✅ Tu cita fue confirmada', icono: '✅', color: '#16a34a', texto: 'Ha sido confirmada por el laboratorio' },
      completada: { asunto: '🏁 Tu cita fue completada', icono: '🏁', color: '#0e7490', texto: 'Ha sido marcada como completada' },
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
    await this.emailService.enviarNotificacion(cita.pacienteCorreo, info.asunto, html);
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

    // Procesar con el motor de reglas local
    const resultado = procesarConMotorDeReglas(mensaje, contexto);

    this.logger.log(`💭 [AIDA] Intención: [${resultado.intencion}]`);

    return resultado as any;
  }
}

