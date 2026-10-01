"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../../utils/api";

type Notificacion = {
  id: string;
  tipo: "NUEVA_CITA" | "RECORDATORIO" | "ESTADO" | "ACTUALIZACION" | string;
  mensaje: string;
  hora: string;
  leida: boolean;
};

export default function NotificacionesPaciente() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState("Cargando...");
  const [userName, setUserName] = useState("Cargando...");
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const idRef = useRef(1);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Configuración inicial de datos del usuario desde localStorage
    const email = localStorage.getItem("pacienteEmail");
    const nombreGuardado = localStorage.getItem("pacienteName");
    if (!email) {
      router.push("/login");
      return;
    }
    setUserEmail(email);
    setUserName(nombreGuardado || "Paciente Registrado");

    // ==========================================
    // 🔌 CONEXIÓN WEBSOCKET (Tiempo Real)
    // Inicializamos Socket.io apuntando a nuestra API_URL.
    // Usamos 'websocket' puro para mejor rendimiento.
    // ==========================================
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // ==========================================
    // 📥 CARGA INICIAL DE DATOS
    // Al montar el componente, primero obtenemos el 
    // historial de notificaciones guardadas en la BD.
    // ==========================================
    const cargarNotificaciones = async () => {
      try {
        const res = await fetch(`${API_URL}/notificaciones/paciente/${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          const historial = data.map((n: any) => ({
             id: n._id,
             tipo: n.tipo,
             mensaje: n.mensaje,
             hora: n.hora,
             leida: n.leida,
          }));
          setNotificaciones(historial);
        }
      } catch (err) {
        console.error("Error al cargar notificaciones:", err);
      }
    };
    cargarNotificaciones();

    const agregar = (tipo: string, mensaje: string) => {
      setNotificaciones((prev) => [
        {
          id: Date.now().toString(),
          tipo,
          mensaje,
          hora: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
          leida: false,
        },
        ...prev,
      ].slice(0, 50));
    };

    // ==========================================
    // 🎧 LISTENERS DEL SOCKET
    // Escuchamos eventos específicos emitidos por el backend.
    // Cuando ocurre un evento, verificamos si es para este usuario
    // y lo agregamos a la lista de notificaciones de la UI.
    // ==========================================
    socket.on("agente:nuevaCita", (d: any) => {
      if (d.cita?.pacienteCorreo === email) agregar("NUEVA_CITA", d.mensaje);
    });
    socket.on("agente:recordatorio", (d: any) => {
      if (d.cita?.pacienteCorreo === email) agregar("RECORDATORIO", d.mensaje);
    });
    socket.on("agente:estadoCita", (d: any) => {
      if (d.cita?.pacienteCorreo === email) agregar("ESTADO", d.mensaje);
    });
    socket.on("citaActualizada", (c: any) => {
      if (c.pacienteCorreo === email) agregar("ACTUALIZACION", `Tu cita para ${c.examen} ha cambiado a estado: ${c.estado}`);
    });

    // Cleanup: Desconectar el socket cuando el componente se desmonta
    return () => { socket.disconnect(); };
    }, []);

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
    try {
      await fetch(`${API_URL}/notificaciones/${id}/leer`, { method: "PUT" });
    } catch (e) {
      console.error(e);
    }
  };

  const limpiar = async () => {
    setNotificaciones([]);
    try {
      const correo = localStorage.getItem("pacienteEmail");
      if (correo) {
        await fetch(`${API_URL}/notificaciones/${correo}/limpiar`, { method: "DELETE" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const iconos: Record<string, string> = {
    NUEVA_CITA: "📅",
    RECORDATORIO: "🔔",
    ESTADO: "📋",
    ACTUALIZACION: "🔄",
  };
  const colores: Record<string, string> = {
    NUEVA_CITA: "border-cyan-500/40 bg-cyan-500/5",
    RECORDATORIO: "border-amber-500/40 bg-amber-500/5",
    ESTADO: "border-emerald-500/40 bg-emerald-500/5",
    ACTUALIZACION: "border-slate-500/40 bg-slate-800",
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none"} transition-all bg-slate-800 border-r border-slate-700 flex flex-col z-30 shrink-0 h-full whitespace-nowrap`}>
        <div className="p-4 px-6 flex items-center gap-4 border-b border-slate-700/50 h-[73px]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl text-cyan-400">≡</button>
          <div>
            <span className="text-base font-bold text-slate-100 uppercase">LAB. GAMBOA</span>
            <p className="text-[11px] text-cyan-400 uppercase tracking-widest font-medium">Panel de Usuario</p>
          </div>
        </div>
        <div className="py-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mb-3 text-slate-900 font-bold text-2xl">{userName.charAt(0)}</div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">{userName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{userEmail}</p>
        </div>
        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-paciente" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-paciente/programar-cita" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">📅</span> Programar Cita</Link>
          <Link href="/dashboard-paciente/resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">🧬</span> Resultados Clínicos</Link>
          <Link href="/dashboard-paciente/notificaciones" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 transition-colors text-sm">
            <span className="text-lg">🔔</span> Notificaciones
            {noLeidas > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{noLeidas}</span>}
          </Link>
          <Link href="#" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">⚙️</span> Configuración</Link>
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => localStorage.clear()} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-900 p-6 md:p-10">
        <div className="max-w-3xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-cyan-400">≡</button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  🔔 Notificaciones
                  {noLeidas > 0 && (
                    <span className="text-sm bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">{noLeidas} nuevas</span>
                  )}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Alertas del sistema en tiempo real</p>
              </div>
            </div>
            {notificaciones.length > 0 && (
              <button onClick={limpiar} className="text-xs text-slate-500 hover:text-rose-400 transition-colors border border-slate-700 rounded-lg px-3 py-2">
                Limpiar todo
              </button>
            )}
          </div>

          {/* Estado en vivo */}
          <div className="flex items-center gap-2 mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <p className="text-xs text-emerald-400 font-medium">Conectado al sistema — recibiendo alertas en tiempo real</p>
          </div>

          {/* Lista de notificaciones */}
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <span className="text-5xl mb-4">🔕</span>
              <p className="text-base font-semibold">Sin notificaciones</p>
              <p className="text-sm text-slate-600 mt-1">Las alertas aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarLeida(n.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${!n.leida ? colores[n.tipo] ?? "border-slate-700 bg-slate-800" : "border-slate-800 bg-slate-800/50 opacity-60"}`}
                >
                  <div className="w-10 h-10 shrink-0 bg-slate-900 rounded-full flex items-center justify-center text-xl">
                    {iconos[n.tipo] ?? "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">{n.mensaje}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{n.hora}</p>
                  </div>
                  {!n.leida && (
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0 mt-1.5"></span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
