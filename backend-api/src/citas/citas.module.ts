import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgenteIaModule } from '../agente-ia/agente-ia.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { CitasController } from './citas.controller';
import { CitasGateway } from './citas.gateway';
import { CitasService } from './citas.service';
import { Cita, CitaSchema } from './schemas/cita.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cita.name, schema: CitaSchema }]),
    EmailModule,
    AuthModule,
    forwardRef(() => AgenteIaModule),
  ],
  controllers: [CitasController],
  providers: [CitasService, CitasGateway],
  exports: [CitasGateway, CitasService],
})
export class CitasModule {}