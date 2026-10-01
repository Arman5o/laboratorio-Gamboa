// Ruta: app/NetworkStatus.tsx
"use client";

import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Verificamos el estado inicial
    setIsOnline(navigator.onLine);
    
    // Funciones que reaccionan a los cortes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si hay internet, este componente se vuelve invisible
  if (isOnline) return null; 

  // Si no hay internet, mostramos la alerta global
  return (
    <div className="bg-rose-600 text-slate-100 text-xs text-center py-2 font-bold tracking-widest uppercase animate-pulse z-50 sticky top-0 w-full shadow-lg border-b border-rose-700">
      ⚠️ Modo Offline - Conexión Perdida ⚠️
    </div>
  );
}