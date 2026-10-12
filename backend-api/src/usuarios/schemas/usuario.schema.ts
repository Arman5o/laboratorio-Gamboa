import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // Automáticamente guardará la fecha de creación
export class Usuario extends Document {
  @Prop({ required: true })
  nombre!: string;

  @Prop({ required: true, unique: true, index: true })
  ci!: string;

  @Prop({ required: true })
  celular!: string;

  @Prop({ required: true, unique: true, index: true })
  correo!: string;

  @Prop({ required: true })
  password!: string; // En el futuro encriptaremos esto por seguridad
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);