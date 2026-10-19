import { io, Socket } from 'socket.io-client';

/**
 * URL base de la API del backend.
 * Usa NEXT_PUBLIC_API_URL del .env.local, o auto-detecta la IP del servidor
 * para que funcione tanto en localhost como desde dispositivos móviles en la misma red.
 */
export const API_URL: string = (() => {
  // 1. Si hay variable de entorno explícita (ej. en .env.local), usarla siempre primero
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. En el navegador:
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const proto = window.location.protocol || 'http:';

    // Si es desarrollo local o red WiFi por IP (127.0.0.1, localhost, 192.168.x.x)
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return `${proto}//${host}:3001`;
    }

    // En producción con dominio público (ej. laboratoriogamboa.com), Nginx enruta /api al backend
    return `${window.location.origin}/api`;
  }

  // 3. Fallback para SSR
  return 'http://localhost:3001';
})();

/**
 * Conecta Socket.IO apuntando a la ruta adecuada según el entorno:
 * - Local / Red local: http://<host>:3001 (directo a NestJS)
 * - Producción (laboratoriogamboa.com): origin actual con path '/api/socket.io' (a través del proxy seguro Nginx)
 */
export function conectarSocket(): Socket {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');

    if (isLocal) {
      return io(`http://${host}:3001`, {
        transports: ['websocket', 'polling'],
      });
    }

    // En producción con dominio público: pasar por Nginx /api/socket.io
    return io(window.location.origin, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
    });
  }

  return io(API_URL, {
    transports: ['websocket', 'polling'],
  });
}

