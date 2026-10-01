"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function GestionarCitas() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Cargando...");
  const [adminEmail, setAdminEmail] = useState("Cargando...");
  const [citas, setCitas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    // Si es un celular, inicia con la barra cerrada
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    const nombreGuardado = localStorage.getItem('adminName');
    const correoGuardado = localStorage.getItem('adminEmail');

    if (nombreGuardado) {
      setAdminName(nombreGuardado);
      setAdminEmail(correoGuardado || "");
      cargarCitas();
    } else {
      router.push("/login");
    }
    }, []);

  const cargarCitas = async () => {
    try {
      const respuesta = await fetchAuth(`${API_URL}/citas`);
      if (respuesta.ok) {
        const datosBD = await respuesta.json();
        setCitas(datosBD.map((c: any) => ({ ...c, id: c._id })).reverse());
      }
    } catch (error) {
      console.error("Error al cargar agenda:", error);
    }
  };

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    const citaActual = citas.find(c => c.id === id);
    try {
      await fetchAuth(`${API_URL}/citas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...citaActual, estado: nuevoEstado })
      });
      setCitas(citas.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
    } catch (error) {
      alert("Error al actualizar la base de datos.");
    }
  };

  const citasFiltradas = citas.filter(c => 
    c.pacienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.examen?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {/* FONDO OSCURO EN MÓVIL */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* BARRA LATERAL RESPONSIVA */}
      <aside className={`
        fixed md:relative top-0 left-0 z-50 h-full bg-slate-800 flex flex-col shrink-0 overflow-hidden
        transition-all duration-300 ease-in-out whitespace-nowrap
        ${isSidebarOpen ? 'w-[75%] sm:w-[60%] md:w-64 translate-x-0 border-r border-slate-700 opacity-100' : 'w-0 -translate-x-full border-0 opacity-0 pointer-events-none'} 
      `}>
        <div className="p-4 px-6 flex items-center gap-4 border-b border-slate-700/50 h-[73px]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl text-cyan-400 focus:outline-none">≡</button>
          <div>
            <span className="text-base font-bold text-slate-100 uppercase">LAB. GAMBOA</span>
            <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-medium">Panel de Control</p>
          </div>
        </div>

        <div className="py-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-slate-800"><span className="text-2xl">👨‍⚕️</span></div>
          <p className="text-xs text-cyan-400 font-bold uppercase truncate w-full text-center px-4">{adminName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{adminEmail}</p>
        </div>

        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-admin" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-admin/gestionar-citas" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span>📅</span> Agenda e Historial</Link>
          <Link href="/dashboard-admin/pacientes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>👥</span> Pacientes</Link>
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>🔬</span> Cargar Resultados</Link>
          <Link href="/dashboard-admin/reportes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">📊</span> Reportes</Link>
          <Link href="/dashboard-admin/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔔</span> Notificaciones</Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => { localStorage.removeItem('adminEmail'); localStorage.removeItem('adminName'); }} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 w-full relative">
        
        {/* BARRA SUPERIOR PERFECTAMENTE ALINEADA */}
        {!isSidebarOpen && (
          <nav className="bg-slate-800 border-b border-slate-700 p-4 px-6 flex items-center justify-between z-20 shrink-0 shadow-md h-[73px]">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors">≡</button>
              <span className="text-base font-bold text-slate-100 uppercase tracking-widest">LAB. GAMBOA</span>
            </div>
            <div className="hidden sm:block px-4 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400">
              Admin: <span className="text-cyan-400">{adminName}</span>
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2 uppercase tracking-wider">AGENDA DEL LABORATORIO</h1>
          <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest">Historial completo de citas extraído de la base de datos.</p>

          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre de paciente o examen..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-8 text-slate-200 focus:border-cyan-400 outline-none shadow-md"
          />

          <div className="space-y-4">
            {citasFiltradas.map((cita) => (
              <div key={cita.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg hover:border-cyan-500/30 transition-colors">
                <div>
                  <h3 className="text-lg font-bold text-cyan-400">{cita.pacienteNombre}</h3>
                  <p className="text-sm text-slate-300">Examen: <span className="font-bold text-slate-100">{cita.examen}</span></p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Fecha: {cita.fecha} | Hora: {cita.hora} | ID: {cita.id.slice(-5)}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-slate-900 border border-slate-600 text-center">
                      {cita.estado}
                    </span>
                    {cita.estado?.toLowerCase() === 'confirmada' && (
                      <button 
                        onClick={() => {
                          if (confirm('¿Estás seguro de cancelar esta cita? El agente notificará al paciente inmediatamente.')) {
                            actualizarEstado(cita.id, 'cancelada');
                          }
                        }}
                        className="bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white font-bold py-1 px-3 rounded text-xs cursor-pointer shadow-md transition-colors border border-slate-600 hover:border-rose-500"
                        title="Cancelar cita confirmada"
                      >
                        ❌
                      </button>
                    )}
                  </div>

                  {cita.estado === 'pendiente' && (
                    <>
                      <button onClick={() => actualizarEstado(cita.id, 'confirmada')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded text-xs transition-colors">APROBAR</button>
                      <button onClick={() => actualizarEstado(cita.id, 'cancelada')} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded text-xs transition-colors">RECHAZAR</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}