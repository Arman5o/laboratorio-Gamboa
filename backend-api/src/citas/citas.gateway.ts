import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Permite conexiones desde cualquier frontend (PWA)
  },
})
export class CitasGateway {
  @WebSocketServer()
  server: Server;

  // Esta función emite un aviso a todos los conectados cuando hay cambios
  enviarAlertaCitaActualizada(cita: any) {
    this.server.emit('citaActualizada', cita);
  }
}