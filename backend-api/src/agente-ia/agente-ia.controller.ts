import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgenteIaService } from './agente-ia.service';

@Controller('agente-ia')
export class AgenteIaController {
  constructor(private readonly agenteIaService: AgenteIaService) {}

  // ─────────────────────────────────────────────
  // Enviar recordatorio manual a un paciente
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('recordatorio')
  async enviarRecordatorio(@Body() body: { cita: any }) {
    await this.agenteIaService.enviarRecordatorio(body.cita);
    return { ok: true, mensaje: 'Recordatorio enviado correctamente' };
  }

  // ─────────────────────────────────────────────
  // Notificar al admin de una nueva cita
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('notificar-admin')
  async notificarAdmin(@Body() body: { cita: any; adminCorreo: string }) {
    await this.agenteIaService.notificarNuevaCitaAdmin(body.cita, body.adminCorreo);
    return { ok: true, mensaje: 'Administrador notificado' };
  }

  // ─────────────────────────────────────────────
  // Chat con AIDA — Chain-of-Thought (pensamiento visible)
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async procesarChat(
    @Body()
    body: {
      mensaje: string;
      rol: string;
      sessionId?: string;
      pacienteCorreo?: string;
      nombrePaciente?: string;
      historial?: Array<{ de: string; texto: string }>;
    },
  ) {
    const resultado = await this.agenteIaService.procesarMensajeChat(
      body.mensaje,
      body.rol ?? 'paciente',
      body.sessionId,
      body.pacienteCorreo,
      body.nombrePaciente,
      body.historial,
    );
    // Retornar el pensamiento, respuesta y datos extra para frontend
    return {
      pensamiento: resultado.pensamiento,
      respuesta: resultado.respuesta,
      intencion: resultado.intencion,
      accion: resultado.accion,
      citaSlots: resultado.citaSlots,
      opcionesExamen: resultado.opcionesExamen,
    };
  }


  // ═══════════════════════════════════════════════
  // ██  ENDPOINTS DEL AGENTE INTELIGENTE          ██
  // ═══════════════════════════════════════════════

  // ─────────────────────────────────────────────
  // Obtener los logs de actividad del agente
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async obtenerLogs(@Query('limite') limite?: string) {
    const lim = limite ? parseInt(limite, 10) : 20;
    return await this.agenteIaService.obtenerLogs(lim);
  }

  // ─────────────────────────────────────────────
  // Ejecutar manualmente el ciclo del agente
  // (para demos y testing sin esperar al cron)
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('ejecutar-recordatorios')
  async ejecutarRecordatorios() {
    const resultado = await this.agenteIaService.ejecutarRecordatoriosManual();
    return {
      ok: true,
      mensaje: `Agente ejecutado: ${resultado.exitosos} de ${resultado.total} recordatorios enviados para el ${resultado.fecha}`,
      ...resultado,
    };
  }
}
