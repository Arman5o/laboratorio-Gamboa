"use client";

import AgenteIA from "../components/AgenteIA";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import { API_URL } from "../utils/api";

type Cita = {
  _id: string;
  examen: string;
  fecha: string;
  hora: string;
  estado: string;
};

export default function DashboardPaciente() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userEmail, setUserEmail] = useState("Cargando...");
  const [userName, setUserName] = useState("Cargando...");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargandoCitas, setCargandoCitas] = useState(true);

  useEffect(() => {
    const correoGuardado = localStorage.getItem("pacienteEmail");
    const nombreGuardado = localStorage.getItem("pacienteName");

    if (correoGuardado && correoGuardado !== "undefined") {
      setUserEmail(correoGuardado);
      setUserName(nombreGuardado || "Paciente Registrado");

      // Cargar citas del paciente
      const ipActual = window.location.hostname;
      fetchAuth(`${API_URL}/citas`)
        .then((res) => res.json())
        .then((data: any[]) => {
          // Filtrar solo las citas del paciente actual
          const propias = data.filter(
            (c: any) => c.pacienteCorreo === correoGuardado
          );
          setCitas(propias.slice(0, 5)); // Últimas 5
        })
        .catch(() => setCitas([]))
        .finally(() => setCargandoCitas(false));
    } else {
      router.push("/login");
    }
  }, []);

  const estadoColor: Record<string, string> = {
    pendiente: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    confirmada: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    cancelada: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    completada: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  };

  const proxima = citas.find((c) => c.estado === "pendiente" || c.estado === "confirmada");

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
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mb-3 text-slate-900 font-bold text-2xl">
            {userName.charAt(0)}
          </div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">{userName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{userEmail}</p>
        </div>

        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-paciente" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span className="text-lg">🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-paciente/programar-cita" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">📅</span> Programar Cita</Link>
          <Link href="/dashboard-paciente/resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">🧬</span> Resultados Clínicos</Link>
          <Link href="/dashboard-paciente/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
            <span className="text-lg">🔔</span> Notificaciones
          </Link>
          <Link href="#" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">⚙️</span> Configuración</Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => localStorage.clear()} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-900 p-6 md:p-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-cyan-400 mr-4">≡</button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Bienvenido, <span className="text-cyan-400">{userName.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">Aquí está el resumen de tu actividad en el laboratorio.</p>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl">📅</div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Total Citas</p>
              <p className="text-3xl font-bold text-cyan-400">{cargandoCitas ? "—" : citas.length}</p>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">⏳</div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Pendientes</p>
              <p className="text-3xl font-bold text-amber-400">
                {cargandoCitas ? "—" : citas.filter((c) => c.estado === "pendiente").length}
              </p>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">✅</div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Completadas</p>
              <p className="text-3xl font-bold text-emerald-400">
                {cargandoCitas ? "—" : citas.filter((c) => c.estado === "completada").length}
              </p>
            </div>
          </div>
        </div>

        {/* Próxima cita */}
        {proxima && (
          <div className="mb-8 bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-6 flex items-start gap-5">
            <span className="text-4xl">🔔</span>
            <div className="flex-1">
              <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-1">Próxima Cita Programada</p>
              <p className="text-lg font-bold text-slate-100">{proxima.examen}</p>
              <p className="text-sm text-slate-400 mt-1">
                📆 {proxima.fecha} &nbsp;·&nbsp; 🕐 {proxima.hora}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${estadoColor[proxima.estado] ?? "text-slate-400"}`}>
              {proxima.estado.toUpperCase()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Últimas citas */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest mb-4">Historial de Citas</h2>
            {cargandoCitas ? (
              <p className="text-slate-400 text-sm animate-pulse">Cargando citas...</p>
            ) : citas.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-slate-400 text-sm">No tienes citas registradas aún.</p>
                <Link href="/dashboard-paciente/programar-cita" className="mt-4 inline-block bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-2 px-5 rounded-lg text-sm transition-colors">
                  Programar mi primera cita
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {citas.map((cita) => (
                  <div key={cita._id} className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-3 border border-slate-700/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{cita.examen}</p>
                      <p className="text-xs text-slate-500 mt-0.5">📆 {cita.fecha} &nbsp; 🕐 {cita.hora}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${estadoColor[cita.estado] ?? "text-slate-400"}`}>
                      {cita.estado.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Acciones Rápidas</h2>
            <Link href="/dashboard-paciente/programar-cita" className="flex items-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 px-4 rounded-lg text-sm transition-colors">
              <span className="text-xl">📅</span> Nueva Cita
            </Link>
            <Link href="/dashboard-paciente/resultados" className="flex items-center gap-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-lg text-sm transition-colors">
              <span className="text-xl">🧬</span> Ver Resultados
            </Link>
            <div className="mt-auto border-t border-slate-700 pt-4">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Horario de atención</p>
              <p className="text-sm text-slate-300">🕗 Lunes a Viernes</p>
              <p className="text-sm text-slate-300">08:00 — 18:00 hrs</p>
            </div>
          </div>

        </div>
      </main>
      <AgenteIA rol="paciente" />
    </div>
  );
}