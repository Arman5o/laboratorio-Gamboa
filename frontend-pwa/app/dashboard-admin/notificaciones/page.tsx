"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../../utils/api";

type Notificacion = {
  id: string;
  tipo: string;
  mensaje: string;
  hora: string;
  leida: boolean;
  cita?: any;
};

export default function NotificacionesAdmin() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const idRef = useRef(1);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("adminEmail");
    const nombre = localStorage.getItem("adminName");
    if (!email) { router.push("/login"); return; }
    setAdminEmail(email);
    setAdminName(nombre ?? "Administrador");

    const ipActual = window.location.hostname;
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Cargar historial de notificaciones desde la DB
    const cargarNotificaciones = async () => {
      try {
        const res = await fetch(`${API_URL}/notificaciones/admin`);
        if (res.ok) {
          const data = await res.json();
          const historial = data.map((n: any) => ({
             id: n._id,
             tipo: n.tipo,
             mensaje: n.mensaje,
             hora: n.hora,
             leida: n.leida,
             cita: n.cita,
          }));
          setNotificaciones(historial);
        }
      } catch (err) {
        console.error("Error al cargar notificaciones:", err);
      }
    };
    cargarNotificaciones();

    const agregar = (tipo: string, mensaje: string, cita?: any) => {
      setNotificaciones((prev) => [
        {
          id: Date.now().toString(),
          tipo,
          mensaje,
          hora: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
          leida: false,
          cita,
        },
        ...prev,
      ].slice(0, 100));
    };

    socket.on("agente:nuevaCita", (d: any) => agregar("NUEVA_CITA", d.mensaje, d.cita));
    socket.on("agente:recordatorio", (d: any) => agregar("RECORDATORIO", d.mensaje, d.cita));
    socket.on("agente:estadoCita", (d: any) => agregar("ESTADO", d.mensaje, d.cita));
    socket.on("citaActualizada", (c: any) => agregar("ACTUALIZACION", `Cita actualizada: ${c.examen} — ${c.pacienteNombre ?? c.pacienteCorreo} → ${c.estado}`, c));

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
      await fetch(`${API_URL}/notificaciones/admin/limpiar`, { method: "DELETE" });
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
    ACTUALIZACION: "border-slate-600 bg-slate-800",
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
            <p className="text-[11px] text-cyan-400 uppercase tracking-widest font-medium">Panel de Control</p>
          </div>
        </div>
        <div className="py-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mb-3 border-2 border-cyan-500">
            <svg className="w-10 h-10 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          </div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">{adminName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{adminEmail}</p>
        </div>
        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-admin" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-admin/gestionar-citas" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">📅</span> Gestionar Citas</Link>
          <Link href="/dashboard-admin/pacientes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">👥</span> Pacientes</Link>
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔬</span> Subir Resultados</Link>
          <Link href="/dashboard-admin/reportes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">📊</span> Reportes</Link>
          <Link href="/dashboard-admin/notificaciones" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm">
            <span className="text-lg">🔔</span> Notificaciones
            {noLeidas > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{noLeidas}</span>}
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => { localStorage.removeItem("adminEmail"); localStorage.removeItem("adminName"); }} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-900 p-6 md:p-10">
        <div className="max-w-4xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-cyan-400">≡</button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                  🔔 Centro de Notificaciones
                  {noLeidas > 0 && (
                    <span className="text-sm bg-rose-500 text-white font-bold px-2.5 py-1 rounded-full">{noLeidas} nuevas</span>
                  )}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Alertas del sistema en tiempo real para el administrador</p>
              </div>
            </div>
            {notificaciones.length > 0 && (
              <button onClick={limpiar} className="text-xs text-slate-500 hover:text-rose-400 transition-colors border border-slate-700 rounded-lg px-3 py-2">
                Limpiar todo
              </button>
            )}
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { tipo: "NUEVA_CITA", label: "Nuevas Citas", icono: "📅", color: "text-cyan-400" },
              { tipo: "RECORDATORIO", label: "Recordatorios", icono: "🔔", color: "text-amber-400" },
              { tipo: "ESTADO", label: "Cambios Estado", icono: "📋", color: "text-emerald-400" },
              { tipo: "ACTUALIZACION", label: "Actualizaciones", icono: "🔄", color: "text-slate-300" },
            ].map(({ tipo, label, icono, color }) => (
              <div key={tipo} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">{icono}</p>
                <p className={`text-2xl font-bold ${color}`}>{notificaciones.filter((n) => n.tipo === tipo).length}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Estado en vivo */}
          <div className="flex items-center gap-2 mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <p className="text-xs text-emerald-400 font-medium">Sistema activo — recibiendo eventos del Agente IA en tiempo real</p>
          </div>

          {/* Lista */}
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <span className="text-5xl mb-4">🔕</span>
              <p className="text-base font-semibold">Sin notificaciones aún</p>
              <p className="text-sm text-slate-600 mt-1">Cuando un paciente cree o modifique una cita, verás la alerta aquí.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarLeida(n.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${!n.leida ? colores[n.tipo] ?? "border-slate-700 bg-slate-800" : "border-slate-800 bg-slate-800/50 opacity-60"}`}
                >
                  <div className="w-11 h-11 shrink-0 bg-slate-900 rounded-full flex items-center justify-center text-2xl">{iconos[n.tipo] ?? "📋"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">{n.mensaje}</p>
                    {n.cita && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.cita.examen && <span className="text-[11px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400">🧪 {n.cita.examen}</span>}
                        {n.cita.fecha && <span className="text-[11px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400">📆 {n.cita.fecha}</span>}
                        {n.cita.hora && <span className="text-[11px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full text-cyan-400 font-mono">🕐 {n.cita.hora}</span>}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-2">{n.hora}</p>
                  </div>
                  {!n.leida && <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0 mt-1.5"></span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
