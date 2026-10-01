import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class LogAgente extends Document {
  @Prop({ required: true })
  fecha!: string; // Fecha en que el agente actuó (YYYY-MM-DD)

  @Prop({ required: true })
  accion!: string; // Tipo de acción: RECORDATORIO_DIARIO, EJECUCION_MANUAL, etc.

  @Prop({ required: true })
  descripcion!: string; // Descripción legible de lo que hizo

  @Prop({ default: 0 })
  citasNotificadas!: number; // Cuántas citas procesó

  @Prop({ default: 'exito' })
  resultado!: string; // 'exito' | 'error_parcial' | 'sin_citas' | 'error'
}

export const LogAgenteSchema = SchemaFactory.createForClass(LogAgente);
