"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function GestionarCitas() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Cargando...");
  const [adminEmail, setAdminEmail] = useState("Cargando...");
  const [citas, setCitas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  // Estado para el modal / panel "Ver Todo"
  const [panelVerTodoAbierto, setPanelVerTodoAbierto] = useState(false);
  const [filtroEstadoModal, setFiltroEstadoModal] = useState<string>("todos");
  const [busquedaModal, setBusquedaModal] = useState("");
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

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

  // Manejador para cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelVerTodoAbierto(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    setActualizandoId(id);
    const citaActual = citas.find(c => c.id === id);
    try {
      const res = await fetchAuth(`${API_URL}/citas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...citaActual, estado: nuevoEstado })
      });
      if (res.ok) {
        setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
      } else {
        alert("Error al actualizar la base de datos.");
      }
    } catch (error) {
      console.error("Error al actualizar la cita:", error);
      alert("Error al actualizar la base de datos.");
    } finally {
      setActualizandoId(null);
    }
  };

  // Funciones auxiliares para el manejo de fechas
  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDisplay = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  };

  const normalizarAFechaIso = (fechaStr: string) => {
    if (!fechaStr) return '';
    const limpia = fechaStr.split('T')[0].trim();
    if (limpia.includes('/')) {
      const partes = limpia.split('/');
      if (partes.length === 3 && partes[2].length === 4) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
    return limpia;
  };

  // Fechas dinámicas para Mañana, Hoy y Ayer
  const { fechaHoyIso, fechaMananaIso, fechaAyerIso, tituloManana, tituloHoy, tituloAyer } = useMemo(() => {
    const hoy = new Date();

    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    return {
      fechaHoyIso: formatIso(hoy),
      fechaMananaIso: formatIso(manana),
      fechaAyerIso: formatIso(ayer),
      tituloManana: `Mañana – ${formatDisplay(manana)}`,
      tituloHoy: `Hoy – ${formatDisplay(hoy)}`,
      tituloAyer: `Ayer – ${formatDisplay(ayer)}`
    };
  }, []);

  // Filtrado de búsqueda en la vista principal
  const citasFiltradas = useMemo(() => {
    return citas.filter(c => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase().trim();
      const nombre = (c.pacienteNombre || '').toLowerCase();
      const correo = (c.pacienteCorreo || '').toLowerCase();
      const examen = (c.examen || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      return nombre.includes(q) || correo.includes(q) || examen.includes(q) || id.includes(q);
    });
  }, [citas, busqueda]);

  // Clasificación estricta de las citas en los 3 días solicitados
  const citasManana = useMemo(() => {
    return citasFiltradas.filter(c => normalizarAFechaIso(c.fecha) === fechaMananaIso);
  }, [citasFiltradas, fechaMananaIso]);

  const citasHoy = useMemo(() => {
    return citasFiltradas.filter(c => normalizarAFechaIso(c.fecha) === fechaHoyIso);
  }, [citasFiltradas, fechaHoyIso]);

  const citasAyer = useMemo(() => {
    return citasFiltradas.filter(c => normalizarAFechaIso(c.fecha) === fechaAyerIso);
  }, [citasFiltradas, fechaAyerIso]);

  // Estadísticas para el panel modal de "Ver Todo"
  const statsModal = useMemo(() => {
    const total = citas.length;
    const pendientes = citas.filter(c => (!c.estado || c.estado.toLowerCase() === 'pendiente')).length;
    const confirmadas = citas.filter(c => c.estado?.toLowerCase() === 'confirmada').length;
    const completadas = citas.filter(c => c.estado?.toLowerCase() === 'completada').length;
    const canceladas = citas.filter(c => c.estado?.toLowerCase() === 'cancelada').length;
    return { total, pendientes, confirmadas, completadas, canceladas };
  }, [citas]);

  // Citas para el modal "Ver Todo" (con filtro por estado y búsqueda independiente)
  const citasVerTodo = useMemo(() => {
    return citas.filter(c => {
      if (filtroEstadoModal !== 'todos') {
        const est = (c.estado || 'pendiente').toLowerCase();
        if (est !== filtroEstadoModal.toLowerCase()) return false;
      }
      if (!busquedaModal.trim()) return true;
      const q = busquedaModal.toLowerCase().trim();
      const nombre = (c.pacienteNombre || '').toLowerCase();
      const correo = (c.pacienteCorreo || '').toLowerCase();
      const examen = (c.examen || '').toLowerCase();
      const fecha = (c.fecha || '').toLowerCase();
      const hora = (c.hora || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      return nombre.includes(q) || correo.includes(q) || examen.includes(q) || fecha.includes(q) || hora.includes(q) || id.includes(q);
    });
  }, [citas, filtroEstadoModal, busquedaModal]);

  // Renderizador de tarjeta de cita individual
  const renderTarjetaCita = (cita: any, enModal = false) => {
    const estadoLower = (cita.estado || 'pendiente').toLowerCase();
    const esPendiente = !cita.estado || estadoLower === 'pendiente';
    const esConfirmada = estadoLower === 'confirmada';
    const esCompletada = estadoLower === 'completada';
    const esCancelada = estadoLower === 'cancelada';
    const estaActualizando = actualizandoId === cita.id;

    // Etiqueta relativa para el modal
    const fechaNorm = normalizarAFechaIso(cita.fecha);
    let etiquetaDia = '';
    if (fechaNorm === fechaHoyIso) etiquetaDia = 'Hoy';
    else if (fechaNorm === fechaMananaIso) etiquetaDia = 'Mañana';
    else if (fechaNorm === fechaAyerIso) etiquetaDia = 'Ayer';

    return (
      <div 
        key={cita.id} 
        className="bg-slate-800 border border-slate-700 p-5 md:p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg hover:border-cyan-500/30 transition-all"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h3 className="text-lg font-bold text-cyan-400">
              {cita.pacienteNombre || cita.pacienteCorreo}
            </h3>
            {enModal && etiquetaDia && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                etiquetaDia === 'Hoy' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                etiquetaDia === 'Mañana' ? 'bg-amber-500/20 text-yellow-300 border-amber-500/40' :
                'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                {etiquetaDia}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-300">
            Examen: <span className="font-bold text-slate-100">{cita.examen}</span>
          </p>
          
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Fecha: {cita.fecha} | Hora: {cita.hora} | ID: {cita.id ? cita.id.slice(-5) : '---'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-center border ${
              esConfirmada ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              esCompletada ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
              esCancelada ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {cita.estado || 'PENDIENTE'}
            </span>

            {esConfirmada && (
              <button 
                disabled={estaActualizando}
                onClick={() => {
                  if (confirm('¿Estás seguro de cancelar esta cita? El paciente y el agente serán notificados.')) {
                    actualizarEstado(cita.id, 'cancelada');
                  }
                }}
                className="bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer shadow-md transition-colors border border-slate-600 hover:border-rose-500 disabled:opacity-50"
                title="Cancelar cita confirmada"
              >
                ❌
              </button>
            )}
          </div>

          {esPendiente && (
            <div className="flex items-center gap-2">
              <button 
                disabled={estaActualizando}
                onClick={() => actualizarEstado(cita.id, 'confirmada')} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                APROBAR
              </button>
              <button 
                disabled={estaActualizando}
                onClick={() => actualizarEstado(cita.id, 'cancelada')} 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                RECHAZAR
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizador de los banners de cabecera de cada día
  const renderBannerDia = (titulo: string, cantidad: number) => {
    return (
      <div className="bg-[#093548] border border-cyan-600/40 rounded-xl px-5 py-3 shadow-md flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-yellow-300 tracking-wide">
          {titulo}
        </h2>
        <span className="text-xs bg-slate-900/80 text-cyan-300 font-semibold px-3 py-1 rounded-full border border-cyan-700/50">
          {cantidad} {cantidad === 1 ? 'cita' : 'citas'}
        </span>
      </div>
    );
  };

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
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full whitespace-nowrap
        transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shrink-0
        ${!isSidebarOpen ? 'md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden' : 'md:w-64'}
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
        <nav className="bg-slate-800 border-b border-slate-700 p-4 px-6 flex items-center justify-between z-20 shrink-0 shadow-md h-[73px]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors">≡</button>
            <span className="text-base font-bold text-slate-100 uppercase tracking-widest">LAB. GAMBOA</span>
          </div>
          <div className="hidden sm:block px-4 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400">
            Admin: <span className="text-cyan-400">{adminName}</span>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* ENCABEZADO CON BOTÓN 'VER TODO' */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider">
                AGENDA DEL LABORATORIO
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 uppercase tracking-widest">
                HISTORIAL COMPLETO DE CITAS EXTRAÍDO DE LA BASE DE DATOS.
              </p>
            </div>

            <button
              id="btn-ver-todo"
              onClick={() => setPanelVerTodoAbierto(true)}
              className="bg-gradient-to-r from-cyan-800 to-cyan-700 hover:from-cyan-700 hover:to-cyan-600 text-yellow-300 font-bold px-7 py-3 rounded-xl border border-cyan-500/60 shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-base flex items-center justify-center gap-2 self-start sm:self-auto"
            >
              <span>Ver Todo</span>
            </button>
          </div>

          {/* BUSCADOR */}
          <div className="mb-6">
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre de paciente o examen..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-cyan-400 outline-none shadow-md transition-colors"
            />
          </div>

          {/* SECCIONES CLASIFICADAS: MAÑANA, HOY, AYER */}
          <div className="space-y-8">
            
            {/* SECCIÓN 1: MAÑANA */}
            <div className="space-y-4">
              {renderBannerDia(tituloManana, citasManana.length)}
              {citasManana.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-5 text-center text-slate-500 text-sm">
                  No hay citas programadas para mañana.
                </div>
              ) : (
                <div className="space-y-3">
                  {citasManana.map(cita => renderTarjetaCita(cita))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: HOY */}
            <div className="space-y-4">
              {renderBannerDia(tituloHoy, citasHoy.length)}
              {citasHoy.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-5 text-center text-slate-500 text-sm">
                  No hay citas programadas para hoy.
                </div>
              ) : (
                <div className="space-y-3">
                  {citasHoy.map(cita => renderTarjetaCita(cita))}
                </div>
              )}
            </div>

            {/* SECCIÓN 3: AYER */}
            <div className="space-y-4">
              {renderBannerDia(tituloAyer, citasAyer.length)}
              {citasAyer.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-5 text-center text-slate-500 text-sm">
                  No hubo citas registradas ayer.
                </div>
              ) : (
                <div className="space-y-3">
                  {citasAyer.map(cita => renderTarjetaCita(cita))}
                </div>
              )}
            </div>

          </div>

          {/* MENSAJE INFORMATIVO INFERIOR */}
          <div className="mt-8 p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>Mostrando únicamente citas de los 3 días principales (Ayer, Hoy y Mañana).</span>
            <button
              onClick={() => setPanelVerTodoAbierto(true)}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
            >
              Consultar historial completo en "Ver Todo" →
            </button>
          </div>

        </div>
      </main>

      {/* MODAL / PANEL 'VER TODO' DONDE SE VEN TODAS LAS CITAS Y SUS ESTADOS */}
      {panelVerTodoAbierto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPanelVerTodoAbierto(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO DEL MODAL */}
            <div className="p-5 md:p-6 border-b border-slate-700/80 bg-slate-800/60 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-100 uppercase tracking-wide">
                    PANEL GENERAL DE CITAS Y ESTADOS
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Historial completo con todas las citas registradas en el laboratorio y su estado en tiempo real.
                </p>
              </div>

              <button
                onClick={() => setPanelVerTodoAbierto(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-600 transition-colors cursor-pointer shrink-0"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* FILTROS DE ESTADO Y BUSCADOR DENTRO DEL MODAL */}
            <div className="p-5 md:p-6 border-b border-slate-700/60 bg-slate-800/30 space-y-4">
              
              {/* Pestañas de estado con contadores */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setFiltroEstadoModal('todos')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    filtroEstadoModal === 'todos' 
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  Todas ({statsModal.total})
                </button>
                <button
                  onClick={() => setFiltroEstadoModal('pendiente')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    filtroEstadoModal === 'pendiente' 
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                      : 'bg-slate-800 text-amber-400/90 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  Pendientes ({statsModal.pendientes})
                </button>
                <button
                  onClick={() => setFiltroEstadoModal('confirmada')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    filtroEstadoModal === 'confirmada' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-800 text-emerald-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  Confirmadas ({statsModal.confirmadas})
                </button>
                <button
                  onClick={() => setFiltroEstadoModal('completada')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    filtroEstadoModal === 'completada' 
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20' 
                      : 'bg-slate-800 text-cyan-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  Completadas ({statsModal.completadas})
                </button>
                <button
                  onClick={() => setFiltroEstadoModal('cancelada')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    filtroEstadoModal === 'cancelada' 
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20' 
                      : 'bg-slate-800 text-rose-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  Canceladas ({statsModal.canceladas})
                </button>
              </div>

              {/* Input buscador dentro del modal */}
              <input
                type="text"
                placeholder="🔍 Filtrar por nombre, correo, examen, fecha (YYYY-MM-DD) o ID..."
                value={busquedaModal}
                onChange={(e) => setBusquedaModal(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-400 outline-none transition-colors"
              />
            </div>

            {/* LISTA DE TODAS LAS CITAS */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
              {citasVerTodo.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-400 text-base font-medium">No se encontraron citas con los filtros seleccionados.</p>
                  <p className="text-slate-500 text-xs mt-1">Intenta seleccionar otra categoría o cambiar el término de búsqueda.</p>
                </div>
              ) : (
                citasVerTodo.map(cita => renderTarjetaCita(cita, true))
              )}
            </div>

            {/* PIE DEL MODAL */}
            <div className="p-4 px-6 border-t border-slate-700/80 bg-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div>
                Mostrando <strong className="text-slate-200">{citasVerTodo.length}</strong> de <strong className="text-slate-200">{statsModal.total}</strong> citas en total
              </div>
              <button
                onClick={() => setPanelVerTodoAbierto(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors shadow-md"
              >
                Volver a la Agenda
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}