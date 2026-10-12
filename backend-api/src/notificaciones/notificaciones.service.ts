import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notificacion } from './schemas/notificacion.schema';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectModel(Notificacion.name) private notificacionModel: Model<Notificacion>,
  ) {}

  async crearNotificacion(datos: {
    tipo: string;
    mensaje: string;
    destinatario: string;
    cita?: any;
  }): Promise<Notificacion> {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

    const nuevaNotificacion = new this.notificacionModel({
      ...datos,
      fecha,
      hora,
      leida: false,
    });
    return await nuevaNotificacion.save();
  }

  async obtenerPorDestinatario(destinatario: string): Promise<Notificacion[]> {
    const regex = new RegExp(`^${destinatario.trim()}$`, 'i');
    return await this.notificacionModel
      .find({ destinatario: regex })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async marcarComoLeida(id: string): Promise<Notificacion | null> {
    return await this.notificacionModel
      .findByIdAndUpdate(id, { leida: true }, { new: true })
      .exec();
  }

  async limpiarPorDestinatario(destinatario: string): Promise<any> {
    const regex = new RegExp(`^${destinatario.trim()}$`, 'i');
    return await this.notificacionModel.deleteMany({ destinatario: regex }).exec();
  }
}
