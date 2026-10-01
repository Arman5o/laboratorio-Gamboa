import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CitasService } from './citas.service';

@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @UseGuards(JwtAuthGuard)
  @Post('nueva')
  async crearCita(@Body() body: any) {
    return await this.citasService.crearCita(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('paciente/:correo')
  async obtenerPorPaciente(@Param('correo') correo: string) {
    return await this.citasService.obtenerCitasPorPaciente(correo);
  }

  // ¡AQUÍ SE CONECTA EL PANEL DEL ADMINISTRADOR!
  @UseGuards(JwtAuthGuard)
  @Get()
  async obtenerTodas() {
    return await this.citasService.obtenerTodasLasCitas();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: any) {
    return await this.citasService.actualizarCita(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return await this.citasService.eliminarCita(id);
  }
}