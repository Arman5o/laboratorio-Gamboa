import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Administrador, AdministradorSchema } from '../usuarios/schemas/administrador.schema';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    // Acceso a los modelos de usuario y administrador
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Administrador.name, schema: AdministradorSchema },
    ]),
    // Configuración de JWT con secreto desde .env
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' }, // Token válido por 24 horas
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
