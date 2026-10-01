import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly authService: AuthService,
  ) {}

  // ─────────────────────────────────────────────
  // REGISTRO (público) — ahora hashea la contraseña
  // ─────────────────────────────────────────────
  @Post('registro')
  async registrar(@Body() body: any) {
    return await this.usuariosService.crearUsuario(body);
  }

  // ─────────────────────────────────────────────
  // LOGIN PACIENTE (público) — retorna JWT
  // ─────────────────────────────────────────────
  @Post('login')
  async login(@Body() body: any) {
    return await this.authService.loginPaciente(body.correo, body.password);
  }

  // ─────────────────────────────────────────────
  // LOGIN ADMIN (público) — retorna JWT
  // ─────────────────────────────────────────────
  @Post('login-admin')
  async loginAdmin(@Body() body: any) {
    return await this.authService.loginAdmin(body.correo, body.password);
  }

  // ─────────────────────────────────────────────
  // LOGIN GOOGLE (público) — retorna JWT
  // ─────────────────────────────────────────────
  @Post('login-google')
  async loginGoogle(@Body() body: { token: string }) {
    return await this.authService.loginGoogle(body.token);
  }

  // ─────────────────────────────────────────────
  // RECUPERAR CONTRASEÑA (público)
  // ─────────────────────────────────────────────
  @Post('recuperar')
  async recuperarPassword(@Body() body: { correo: string; ci: string; celular: string; nuevaPassword: string }) {
    await this.usuariosService.recuperarPassword(body.correo, body.ci, body.celular, body.nuevaPassword);
    return { ok: true, mensaje: 'Contraseña actualizada correctamente' };
  }

  // =======================================================
  // 👇 RUTAS PROTEGIDAS CON JWT 👇
  // =======================================================

  // Obtener toda la lista de pacientes registrados (solo autenticados)
  @UseGuards(JwtAuthGuard)
  @Get()
  async obtenerTodos() {
    return await this.usuariosService.obtenerTodos();
  }

  // Actualizar los datos de un paciente por su ID (solo autenticados)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: any) {
    return await this.usuariosService.actualizarUsuario(id, body);
  }
}