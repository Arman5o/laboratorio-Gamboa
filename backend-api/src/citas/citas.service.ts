import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgenteIaService } from '../agente-ia/agente-ia.service';
import { EmailService } from '../email/email.service';
import { CitasGateway } from './citas.gateway';
import { Cita } from './schemas/cita.schema';

@Injectable()
export class CitasService {
  constructor(
    @InjectModel(Cita.name) private citaModel: Model<Cita>,
    private readonly emailService: EmailService,
    private readonly citasGateway: CitasGateway,
    @Inject(forwardRef(() => AgenteIaService)) private readonly agenteIaService: AgenteIaService,
  ) {}

  private aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private async buscarConflicto(fecha: string, hora: string, idExcluir?: string) {
    const citasDelDia = await this.citaModel.find({ fecha }).exec();
    const nuevaHoraMin = this.aMinutos(hora);

    return citasDelDia.find(c => {
      if (idExcluir && c._id.toString() === idExcluir) return false;
      // Para choques de horario de 30 min ignoramos las canceladas (case insensitive)
      if (c.estado && c.estado.toLowerCase() === 'cancelada') return false; 
      const horaExistenteMin = this.aMinutos(c.hora);
      return Math.abs(nuevaHoraMin - horaExistenteMin) < 30;
    });
  }

  private async sugerirHorarioAlternativo(fecha: string, horaDeseada: string, examen?: string): Promise<string> {
    const ahora = new Date();
    // Ajustar a local YYYY-MM-DD para comparar sin problemas
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    const esHoy = fecha === hoyStr;
    const minActual = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() + 15 : 0;
    
    const deseadoMin = this.aMinutos(horaDeseada);
    
    const examenesAyuno = ["Análisis de Sangre (Rutina)", "Perfil Lipídico", "Prueba de Tolerancia a la Glucosa"];
    const requiereAyuno = examen ? examenesAyuno.includes(examen) : false;

    const rangos = requiereAyuno
      ? [{ inicio: 7 * 60 + 30, fin: 11 * 60 + 30 }]
      : [
          { inicio: 7 * 60 + 30, fin: 11 * 60 + 30 },
          { inicio: 14 * 60, fin: 18 * 60 }
        ];
    
    const libres: Array<{ min: number; horaStr: string }> = [];
    for (const rango of rangos) {
      for (let min = rango.inicio; min <= rango.fin; min += 30) {
        if (min < minActual) continue;
        const h = Math.floor(min / 60);
        const m = min % 60;
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        const conflicto = await this.buscarConflicto(fecha, horaStr);
        if (!conflicto) libres.push({ min, horaStr });
      }
    }
    
    if (libres.length === 0) return "No hay horarios disponibles hoy";
    
    libres.sort((a, b) => Math.abs(a.min - deseadoMin) - Math.abs(b.min - deseadoMin));
    return libres[0].horaStr;
  }

  async crearCita(datos: any): Promise<Cita> {
    const correoLimpio = datos.pacienteCorreo ? datos.pacienteCorreo.trim().toLowerCase() : '';

    // 0. VALIDAR QUE LA CITA NO SEA EN EL PASADO
    const ahora = new Date();
    // Ajustar a zona horaria local de forma simple comparando los strings
    const hoyStr = ahora.toISOString().split('T')[0];
    
    if (datos.fecha < hoyStr) {
      throw new HttpException({
        message: 'No puedes programar una cita en una fecha pasada.',
        tipoError: 'FECHA_PASADA'
      }, HttpStatus.BAD_REQUEST);
    }
    
    if (datos.fecha === hoyStr) {
      const ahoraMas15 = new Date(ahora.getTime() + 15 * 60000);
      const horaMinimaStr = ahoraMas15.toTimeString().substring(0, 5);
      
      if (datos.hora < horaMinimaStr) {
        const sugerencia = await this.sugerirHorarioAlternativo(datos.fecha, horaMinimaStr, datos.examen);
        throw new HttpException({
          message: 'Debes programar tu cita con al menos 15 minutos de anticipación al horario actual.',
          tipoError: 'HORA_PASADA',
          sugerencia: sugerencia
        }, HttpStatus.BAD_REQUEST);
      }
    }

    // 1. VALIDAR SI EL PACIENTE YA TIENE UNA CITA ACTIVA EN ESTA MISMA FECHA
    const citaExistenteMismoDia = await this.citaModel.findOne({
      pacienteCorreo: correoLimpio,
      fecha: datos.fecha,
      estado: { $nin: ['cancelada', 'Cancelada', 'completada', 'Completada'] } // Regex u opciones manuales
    }).exec();

    if (citaExistenteMismoDia) {
      throw new HttpException({
        message: 'Ya tienes una cita activa programada para este día.',
        tipoError: 'DUPLICADO_DIA',
        citaExistente: citaExistenteMismoDia
      }, HttpStatus.CONFLICT);
    }

    // 2. VALIDAR COLISIÓN DE HORARIO (REGLA DE 30 MINUTOS CON OTROS PACIENTES)
    const conflicto = await this.buscarConflicto(datos.fecha, datos.hora);
    if (conflicto) {
      const sugerencia = await this.sugerirHorarioAlternativo(datos.fecha, datos.hora, datos.examen);
      throw new HttpException({
        message: 'Horario ocupado',
        tipoError: 'HORARIO_OCUPADO',
        sugerencia: sugerencia
      }, HttpStatus.CONFLICT);
    }

    const nuevaCita = new this.citaModel({ ...datos, pacienteCorreo: correoLimpio });
    const citaGuardada = await nuevaCita.save();

    // 🤖 AGENTE IA: Notificar al paciente y al admin
    const adminCorreo = process.env.EMAIL_USER ?? '';
    this.agenteIaService.notificarConfirmacionPaciente(citaGuardada).catch(() => {});
    this.agenteIaService.notificarNuevaCitaAdmin(citaGuardada, adminCorreo).catch(() => {});

    return citaGuardada;
  }

  async obtenerCitasPorPaciente(correo: string): Promise<Cita[]> {
    if (!correo || correo === "undefined") return [];
    return await this.citaModel.find({ pacienteCorreo: correo.trim().toLowerCase() }).exec();
  }

  async obtenerTodasLasCitas(): Promise<Cita[]> {
    return await this.citaModel.find().exec();
  }

  async actualizarCita(id: string, datos: any): Promise<Cita | null> {
    const citaExistente = await this.citaModel.findById(id).exec();
    const examenFinal = datos.examen || (citaExistente ? citaExistente.examen : undefined);

    if (datos.fecha || datos.hora) {
      const conflicto = await this.buscarConflicto(datos.fecha, datos.hora, id);
      if (conflicto) {
        const sugerencia = await this.sugerirHorarioAlternativo(datos.fecha, datos.hora, examenFinal);
        throw new HttpException({
          message: 'Conflicto de horario',
          tipoError: 'HORARIO_OCUPADO',
          sugerencia: sugerencia
        }, HttpStatus.CONFLICT);
      }
    }

    const citaActualizada = await this.citaModel.findByIdAndUpdate(id, datos, { new: true }).exec();
    if (citaActualizada) {
      this.citasGateway.enviarAlertaCitaActualizada(citaActualizada);
      // 🤖 AGENTE IA: Notificar cambio de estado al paciente
      this.agenteIaService.notificarCambioEstado(citaActualizada).catch(() => {});
    }
    return citaActualizada;
  }

  async eliminarCita(id: string): Promise<any> {
    return await this.citaModel.findByIdAndDelete(id).exec();
  }
}