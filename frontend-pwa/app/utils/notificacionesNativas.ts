/**
 * Utilidad de Notificaciones Push Nativas para PWA (Estilo WhatsApp)
 * Muestra alertas en la barra de notificaciones del teléfono / sistema operativo.
 */

export async function solicitarPermisoNotificaciones(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Este navegador o dispositivo no soporta Notificaciones.");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permiso = await Notification.requestPermission();
    return permiso;
  } catch (err) {
    console.error("Error al solicitar permiso de notificaciones:", err);
    return "denied";
  }
}

export interface OpcionesNotificacionNativa {
  titulo: string;
  cuerpo: string;
  url?: string;
  tag?: string;
  icono?: string;
  badge?: string;
}

export async function dispararNotificacionNativa({
  titulo,
  cuerpo,
  url = "/dashboard-paciente/notificaciones",
  tag = "lab-gamboa-alerta",
  icono = "/icon-192x192.png",
  badge = "/icon-192x192.png",
}: OpcionesNotificacionNativa): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  // Si no se tiene permiso, intentar solicitarlo
  if (Notification.permission !== "granted") {
    const permiso = await solicitarPermisoNotificaciones();
    if (permiso !== "granted") return false;
  }

  const opciones: any = {
    body: cuerpo,
    icon: icono,
    badge: badge,
    tag: tag,
    renotify: true,
    vibrate: [200, 100, 200, 100, 200], // Patrón de vibración de celular estilo WhatsApp
    data: {
      url: url,
      timestamp: Date.now(),
    },
  };

  try {
    // 1. Prioridad: Disparar a través del Service Worker (Requisito para móviles y pantalla bloqueada)
    if ("serviceWorker" in navigator) {
      const registro = await navigator.serviceWorker.getRegistration();
      if (registro && registro.showNotification) {
        await registro.showNotification(titulo, opciones);
        return true;
      }
    }

    // 2. Fallback: Notificación directa del navegador (computadoras de escritorio)
    const notif = new Notification(titulo, opciones);
    notif.onclick = () => {
      window.focus();
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
      notif.close();
    };
    return true;
  } catch (error) {
    console.error("Error al mostrar la notificación nativa:", error);
    return false;
  }
}
