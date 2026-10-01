import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CitasModule } from '../citas/citas.module';
import { EmailModule } from '../email/email.module';
import { Cita, CitaSchema } from '../citas/schemas/cita.schema';
import { AgenteIaController } from './agente-ia.controller';
import { AgenteIaService } from './agente-ia.service';
import { LogAgente, LogAgenteSchema } from './schemas/log-agente.schema';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    EmailModule,
    AuthModule,
    forwardRef(() => CitasModule),
    NotificacionesModule,
    MongooseModule.forFeature([
      { name: LogAgente.name, schema: LogAgenteSchema },
      { name: Cita.name, schema: CitaSchema },
    ]),
  ],
  controllers: [AgenteIaController],
  providers: [AgenteIaService],
  exports: [AgenteIaService],
})
export class AgenteIaModule {}
