import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // <-- AGREGAR ESTA LÍNEA ES OBLIGATORIO
})
export class EmailModule {}