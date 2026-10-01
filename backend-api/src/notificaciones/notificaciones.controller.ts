import { Controller, Get, Param, Put, Delete } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get(':destinatario')
  async obtenerNotificaciones(@Param('destinatario') destinatario: string) {
    return this.notificacionesService.obtenerPorDestinatario(destinatario);
  }

  @Put(':id/leer')
  async marcarComoLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarComoLeida(id);
  }

  @Delete(':destinatario/limpiar')
  async limpiarNotificaciones(@Param('destinatario') destinatario: string) {
    return this.notificacionesService.limpiarPorDestinatario(destinatario);
  }
}
