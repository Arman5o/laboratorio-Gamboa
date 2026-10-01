import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notificacion extends Document {
  @Prop({ required: true })
  tipo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ required: true })
  fecha: string;

  @Prop({ required: true })
  hora: string;

  @Prop({ default: false })
  leida: boolean;

  @Prop({ required: true })
  destinatario: string;

  @Prop({ type: Object })
  cita?: Record<string, any>;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);
