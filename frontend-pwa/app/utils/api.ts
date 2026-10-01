/**
 * URL base de la API del backend.
 * Usa NEXT_PUBLIC_API_URL del .env.local, o auto-detecta la IP del servidor
 * para que funcione tanto en localhost como desde dispositivos móviles en la misma red.
 */
export const API_URL: string = (() => {
  // 1. Si hay variable de entorno explícita, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 2. Si estamos en el navegador, usar la misma IP/hostname desde donde se cargó la página
  //    Esto permite que desde el celular (192.168.x.x:3000) apunte al backend en (192.168.x.x:3001)
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`;
  }
  
  // 3. Fallback para SSR
  return 'http://localhost:3001';
})();
