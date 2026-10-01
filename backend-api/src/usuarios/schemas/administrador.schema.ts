import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Usamos collection: 'administrador' para obligar a MongoDB a leer esa carpeta exacta
@Schema({ collection: 'administrador' }) 
export class Administrador extends Document {
  @Prop({ required: true })
  nombre!: string;

  // Ojo aquí: usamos "email" tal cual está en tu base de datos
  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  rol!: string;
}

export const AdministradorSchema = SchemaFactory.createForClass(Administrador);