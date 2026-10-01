import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/schemas/usuario.schema';
import { Administrador } from '../usuarios/schemas/administrador.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
    @InjectModel(Administrador.name) private adminModel: Model<Administrador>,
  ) {}

  // ─────────────────────────────────────────────
  // VALIDAR REQUISITOS DE CONTRASEÑA SEGURA
  // ─────────────────────────────────────────────
  validarFortalezaPassword(password: string): { valida: boolean; errores: string[] } {
    const errores: string[] = [];
    if (password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres.');
    if (!/[A-Z]/.test(password)) errores.push('Debe contener al menos una letra mayúscula.');
    if (!/[a-z]/.test(password)) errores.push('Debe contener al menos una letra minúscula.');
    if (!/[0-9]/.test(password)) errores.push('Debe contener al menos un número.');
    return { valida: errores.length === 0, errores };
  }

  // ─────────────────────────────────────────────
  // HASHEAR CONTRASEÑA CON BCRYPT
  // ─────────────────────────────────────────────
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // ─────────────────────────────────────────────
  // LOGIN PACIENTE → retorna JWT
  // ─────────────────────────────────────────────
  async loginPaciente(correo: string, password: string) {
    const usuario = await this.usuarioModel.findOne({
      correo: correo.trim().toLowerCase(),
    }).exec();

    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // Comparar con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload = { sub: usuario._id, correo: usuario.correo, rol: 'paciente' };
    const token = this.jwtService.sign(payload);

    return {
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        ci: usuario.ci,
        celular: usuario.celular,
      },
    };
  }

  // ─────────────────────────────────────────────
  // LOGIN ADMIN → retorna JWT
  // ─────────────────────────────────────────────
  async loginAdmin(correo: string, password: string) {
    const admin = await this.adminModel.findOne({
      email: correo.trim().toLowerCase(),
    }).exec();

    if (!admin) {
      throw new UnauthorizedException('Credenciales de administrador incorrectas');
    }

    // Comparar con bcrypt
    const passwordValida = await bcrypt.compare(password, admin.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales de administrador incorrectas');
    }

    const payload = { sub: admin._id, correo: admin.email, rol: 'admin' };
    const token = this.jwtService.sign(payload);

    return {
      token,
      usuario: {
        _id: admin._id,
        nombre: admin.nombre,
        email: admin.email,
        rol: admin.rol,
      },
    };
  }

  // ─────────────────────────────────────────────
  // VERIFICAR TOKEN JWT
  // ─────────────────────────────────────────────
  verificarToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ─────────────────────────────────────────────
  // LOGIN GOOGLE → retorna JWT
  // Soporta tanto id_token (nuevo GoogleLogin FedCM) como access_token (flujo anterior)
  // ─────────────────────────────────────────────
  async loginGoogle(googleToken: string) {
    const { OAuth2Client } = require('google-auth-library');
    const clientId = process.env.GOOGLE_CLIENT_ID || 'PON_AQUI_TU_CLIENT_ID_DE_GOOGLE';
    const client = new OAuth2Client(clientId);

    try {
      let email: string;
      let nombre: string;

      // Detectar si es un id_token JWT (tiene 3 partes separadas por puntos)
      // o un access_token corto (flujo antiguo useGoogleLogin)
      const esIdToken = googleToken.split('.').length === 3;

      if (esIdToken) {
        // ── Nuevo flujo: GoogleLogin devuelve id_token JWT ──
        console.log('[Google Login] Detectado id_token (FedCM/credential flow)');
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: clientId,
        });
        const payloadGoogle = ticket.getPayload();

        if (!payloadGoogle || !payloadGoogle.email) {
          throw new UnauthorizedException('No se pudo verificar el id_token de Google.');
        }

        email = payloadGoogle.email.toLowerCase();
        nombre = payloadGoogle.name || 'Usuario Google';
      } else {
        // ── Flujo anterior: access_token → llamada a userinfo ──
        console.log('[Google Login] Detectado access_token (flujo popup)');
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleToken}` },
        });

        if (!res.ok) {
          throw new UnauthorizedException('Token de Google inválido o expirado.');
        }

        const payloadGoogle = await res.json();

        if (!payloadGoogle || !payloadGoogle.email) {
          throw new UnauthorizedException('No se pudo obtener el correo de Google.');
        }

        email = payloadGoogle.email.toLowerCase();
        nombre = payloadGoogle.name || 'Usuario Google';
      }

      console.log(`[Google Login] Email verificado: ${email}`);

      // 2. ¿Es administrador?
      const admin = await this.adminModel.findOne({ email }).exec();
      if (admin) {
        console.log(`[Google Login] ¡Es admin! → dashboard-admin`);
        const payload = { sub: admin._id, correo: admin.email, rol: 'admin' };
        return {
          token: this.jwtService.sign(payload),
          usuario: { _id: admin._id, nombre: admin.nombre, email: admin.email, rol: admin.rol },
        };
      }

      // 3. ¿Es paciente registrado? Si no, crearlo automáticamente
      let paciente = await this.usuarioModel.findOne({ correo: email }).exec();

      if (!paciente) {
        console.log(`[Google Login] Nuevo paciente — creando cuenta automática para ${email}`);
        const randomPassword = await this.hashPassword(
          Math.random().toString(36).slice(-10) + 'A1!a',
        );

        const nuevoPaciente = new this.usuarioModel({
          nombre,
          correo: email,
          password: randomPassword,
          ci: '0000000',
          celular: '00000000',
        });
        paciente = await nuevoPaciente.save();
      }

      // 4. Retornar JWT del sistema para el paciente
      const payload = { sub: paciente._id, correo: paciente.correo, rol: 'paciente' };
      return {
        token: this.jwtService.sign(payload),
        usuario: {
          _id: paciente._id,
          nombre: paciente.nombre,
          correo: paciente.correo,
          ci: paciente.ci,
          celular: paciente.celular,
        },
      };
    } catch (error: any) {
      console.error('Error validando Google Token:', error);
      throw new UnauthorizedException(`Error de autenticación con Google: ${error.message || error}`);
    }
  }
}

