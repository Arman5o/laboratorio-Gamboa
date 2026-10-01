import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Administrador } from './schemas/administrador.schema';
import { Usuario } from './schemas/usuario.schema';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
    @InjectModel(Administrador.name) private adminModel: Model<Administrador>
  ) {}

  // ─────────────────────────────────────────────
  // VALIDAR FORTALEZA DE CONTRASEÑA
  // ─────────────────────────────────────────────
  private validarPassword(password: string): void {
    const errores: string[] = [];
    if (password.length < 8) errores.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errores.push('Debe contener al menos una mayúscula');
    if (!/[a-z]/.test(password)) errores.push('Debe contener al menos una minúscula');
    if (!/[0-9]/.test(password)) errores.push('Debe contener al menos un número');

    if (errores.length > 0) {
      throw new BadRequestException({
        message: 'La contraseña no cumple los requisitos de seguridad.',
        errores,
      });
    }
  }

  // ─────────────────────────────────────────────
  // CREAR USUARIO CON CONTRASEÑA HASHEADA
  // ─────────────────────────────────────────────
  async crearUsuario(datosRegistro: any): Promise<Usuario> {
    // Validar fortaleza de contraseña
    this.validarPassword(datosRegistro.password);

    try {
      // Hashear contraseña con bcrypt (10 rondas de salt)
      const saltRounds = 10;
      const passwordHasheada = await bcrypt.hash(datosRegistro.password, saltRounds);

      const nuevoUsuario = new this.usuarioModel({
        ...datosRegistro,
        correo: datosRegistro.correo.trim().toLowerCase(), // VALIDACIÓN ESTRICTA
        password: passwordHasheada, // ← CONTRASEÑA HASHEADA
      });
      return await nuevoUsuario.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Este correo electrónico ya está registrado.');
      }
      throw new BadRequestException('No se pudo completar el registro: ' + error.message);
    }
  }

  // ─────────────────────────────────────────────
  // BUSCAR USUARIO (ya no compara password aquí, lo hace AuthService)
  // ─────────────────────────────────────────────
  async buscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
    return await this.usuarioModel.findOne({ 
      correo: correo.trim().toLowerCase(),
    }).exec();
  }

  async buscarAdministradorPorEmail(email: string): Promise<Administrador | null> {
    return await this.adminModel.findOne({ 
      email: email.trim().toLowerCase(),
    }).exec();
  }

  // ─────────────────────────────────────────────
  // RECUPERAR CONTRASEÑA
  // ─────────────────────────────────────────────
  async recuperarPassword(correo: string, ci: string, celular: string, nuevaPassword: string): Promise<void> {
    // Validar fortaleza de la nueva contraseña
    this.validarPassword(nuevaPassword);

    const usuario = await this.usuarioModel.findOne({
      correo: correo.trim().toLowerCase(),
    }).exec();

    if (!usuario) {
      throw new NotFoundException('No existe una cuenta con ese correo electrónico.');
    }

    // 🔒 Validación de Identidad (MFA local)
    if (usuario.ci !== ci.trim() || usuario.celular !== celular.trim()) {
      throw new UnauthorizedException('Los datos de identidad (Cédula o Celular) no coinciden con nuestros registros.');
    }

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const passwordHasheada = await bcrypt.hash(nuevaPassword, saltRounds);
    
    usuario.password = passwordHasheada;
    await usuario.save();
  }

  async obtenerTodos(): Promise<Usuario[]> {
    return await this.usuarioModel.find().exec();
  }

  async actualizarUsuario(id: string, datos: any): Promise<Usuario | null> {
    // Si se está actualizando la contraseña, hashearla
    if (datos.password) {
      this.validarPassword(datos.password);
      const saltRounds = 10;
      datos.password = await bcrypt.hash(datos.password, saltRounds);
    }
    return await this.usuarioModel.findByIdAndUpdate(id, datos, { new: true }).exec();
  }
}