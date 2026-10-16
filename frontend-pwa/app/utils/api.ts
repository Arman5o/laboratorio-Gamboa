/**
 * URL base de la API del backend.
 * Usa NEXT_PUBLIC_API_URL del .env.local, o auto-detecta la IP del servidor
 * para que funcione tanto en localhost como desde dispositivos móviles en la misma red.
 */
export const API_URL: string = (() => {
  // 1. En el navegador, siempre usar el mismo hostname desde donde se cargó la PWA (localhost, 127.0.0.1, o IP 192.168.x.x)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const proto = window.location.protocol || 'http:';
    return `${proto}//${host}:3001`;
  }
  
  // 2. Si hay variable de entorno explícita para SSR/Build, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 3. Fallback para SSR
  return 'http://localhost:3001';
})();
