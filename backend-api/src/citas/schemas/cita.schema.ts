import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Cita extends Document {
  @Prop({ required: true })
  pacienteCorreo!: string; // Para saber de quién es la cita

  @Prop({ required: true })
  pacienteNombre!: string;

  @Prop({ required: true })
  examen!: string;

  @Prop({ required: true })
  fecha!: string;

  @Prop({ required: true })
  hora!: string;

  @Prop({ default: 'pendiente' })
  estado!: string; // Puede ser 'pendiente' o 'completada'

  // 👇 ¡ESTO ES LO ÚNICO NUEVO QUE AÑADIMOS! 👇
  // Guarda el archivo físico convertido a texto Base64
  @Prop()
  resultadoPdf?: string; 
}

export const CitaSchema = SchemaFactory.createForClass(Cita);