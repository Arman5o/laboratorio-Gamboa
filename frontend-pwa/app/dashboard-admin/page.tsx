"use client";

import AgenteIA from "../components/AgenteIA";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import { API_URL } from "../utils/api";

export default function DashboardAdmin() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [adminEmail, setAdminEmail] = useState("Cargando...");
  const [adminName, setAdminName] = useState("Cargando...");

  const [stats, setStats] = useState({
    citasHoy: 0,
    pacientesRegistrados: 0,
    resultadosPendientes: 0
  });

  const [citasTotales, setCitasTotales] = useState<any[]>([]); 
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [modalDiaOpen, setModalDiaOpen] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    const correoGuardado = localStorage.getItem('adminEmail');
    const nombreGuardado = localStorage.getItem('adminName');

    if (correoGuardado && correoGuardado !== "undefined") {
      setAdminEmail(correoGuardado);
      setAdminName(nombreGuardado || "Administrador");

      const cargarEstadisticasReales = async () => {
        try {
          const resCitas = await fetchAuth(`${API_URL}/citas`);
          let hoyCitas = 0;
          let pendientes = 0;

          if (resCitas.ok) {
            const citas = await resCitas.json();
            setCitasTotales(citas); 

            const fechaActual = new Date().toISOString().split('T')[0];
            hoyCitas = citas.filter((c: any) => c.fecha === fechaActual).length;
            // Citas confirmadas pero que aún no se completan (esperando resultados)
            pendientes = citas.filter((c: any) => c.estado === 'confirmada').length;
          }

          const resUsuarios = await fetchAuth(`${API_URL}/usuarios`);
          let totalPacientes = 0;

          if (resUsuarios.ok) {
            const usuarios = await resUsuarios.json();
            totalPacientes = usuarios.length;
          }

          setStats({
            citasHoy: hoyCitas,
            pacientesRegistrados: totalPacientes,
            resultadosPendientes: pendientes
          });

        } catch (error) {
          console.error("Error al conectar con la base de datos:", error);
        }
      };

      cargarEstadisticasReales();
    } else {
      router.push("/login");
    }
    }, []);

  // LÓGICA DEL CALENDARIO
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  
  const prevMonth = () => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() - 1, 1));
  const nextMonth = () => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 1));

  const y = fechaCalendario.getFullYear();
  const m = fechaCalendario.getMonth();
  const diasEnMes = new Date(y, m + 1, 0).getDate();
  let primerDiaIndex = new Date(y, m, 1).getDay(); 
  primerDiaIndex = primerDiaIndex === 0 ? 6 : primerDiaIndex - 1;

  const diasArray = [];
  for (let i = 0; i < primerDiaIndex; i++) diasArray.push(null);
  for (let i = 1; i <= diasEnMes; i++) diasArray.push(i);

  const formatFecha = (dia: number) => {
    const yyyy = fechaCalendario.getFullYear();
    const mm = String(fechaCalendario.getMonth() + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getCitasDelDia = (fechaStr: string) => {
    return citasTotales.filter(c => c.fecha === fechaStr);
  };

  const abrirModalDia = (fechaStr: string) => {
    setFechaSeleccionada(fechaStr);
    setModalDiaOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">{adminName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{adminEmail}</p>
        </div>

        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-admin" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span className="text-lg">🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-admin/gestionar-citas" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">📅</span> Gestionar Citas</Link>
          <Link href="/dashboard-admin/pacientes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">👥</span> Pacientes</Link>
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔬</span> Subir Resultados</Link>
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
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Resumen General</h2>
              <p className="text-sm text-slate-500 uppercase tracking-widest">Indicadores Reales de la Base de Datos</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Fecha del Sistema</p>
              <p className="text-sm font-mono text-cyan-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center text-2xl">📅</div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Citas Hoy</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.citasHoy}</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-2xl">👥</div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Pacientes</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.pacientesRegistrados}</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-2xl">⏳</div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Res. Pendientes</p>
                <p className="text-2xl font-bold text-amber-400">{stats.resultadosPendientes}</p>
              </div>
            </div>
          </div>

          <h2 className="text-sm text-slate-500 uppercase tracking-widest mb-6 mt-2">ACCESOS RÁPIDOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Link href="/dashboard-admin/gestionar-citas" className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all hover:-translate-y-1 group shadow-lg">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="text-3xl">📋</span></div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-cyan-400 transition-colors">REVISAR AGENDA</h3>
              <p className="text-slate-400 text-sm">Aprobar, rechazar o reprogramar las solicitudes de citas de los pacientes.</p>
            </Link>
            <Link href="/dashboard-admin/subir-resultados" className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition-all hover:-translate-y-1 group shadow-lg">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="text-3xl">🔬</span></div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors">CARGAR RESULTADOS</h3>
              <p className="text-slate-400 text-sm">Subir informes de laboratorio en formato PDF para los pacientes.</p>
            </Link>
          </div>

          {/* MÓDULO DE CALENDARIO VISUAL CON CÓDIGO DE COLORES */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-700 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100">AGENDA VISUAL</h2>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-1 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Falta Aprobar</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Esperando Resultados</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Atendido</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1.5 border border-slate-700">
                <button type="button" onClick={prevMonth} className="px-3 py-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors cursor-pointer text-lg font-bold">◀</button>
                <span className="font-bold text-cyan-400 tracking-wider min-w-[150px] text-center uppercase">
                  {meses[fechaCalendario.getMonth()]} {fechaCalendario.getFullYear()}
                </span>
                <button type="button" onClick={nextMonth} className="px-3 py-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors cursor-pointer text-lg font-bold">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase">
              <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {diasArray.map((dia, index) => {
                if (!dia) return <div key={index} className="p-2 md:p-4 bg-slate-800/50 rounded-xl border border-transparent"></div>; 
                
                const fechaStr = formatFecha(dia);
                const citasDelDia = getCitasDelDia(fechaStr);
                const tieneCitas = citasDelDia.length > 0;
                const esHoy = fechaStr === new Date().toISOString().split('T')[0];

                // Lógica de colores para el subrayado del calendario:
                // Si alguna cita es 'pendiente' -> Rojo (Falta aprobar)
                // Si alguna cita es 'confirmada' -> Naranja (Esperando resultados)
                // Si todas son 'completadas' -> Azul (Atendido)
                let colorSubrayado = "bg-rose-500";
                if (tieneCitas) {
                  const hayPendientes = citasDelDia.some(c => c.estado === 'pendiente');
                  const hayConfirmadas = citasDelDia.some(c => c.estado === 'confirmada');
                  const todasCompletadas = citasDelDia.every(c => c.estado === 'completada');

                  if (hayPendientes) {
                    colorSubrayado = "bg-rose-500"; // Rojo: Falta aprobar
                  } else if (hayConfirmadas) {
                    colorSubrayado = "bg-amber-500"; // Naranja: Esperando resultados
                  } else if (todasCompletadas) {
                    colorSubrayado = "bg-blue-500"; // Azul: Atendido
                  }
                }

                return (
                  <button 
                    key={index} 
                    type="button"
                    onClick={() => abrirModalDia(fechaStr)}
                    className={`relative flex flex-col items-center justify-center p-3 md:p-5 rounded-xl border transition-all cursor-pointer group hover:-translate-y-1
                      ${esHoy ? 'bg-cyan-900/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-900 border-slate-700 hover:border-cyan-500/50'}
                    `}
                  >
                    <span className={`text-lg md:text-xl font-bold ${esHoy ? 'text-cyan-400' : 'text-slate-300 group-hover:text-white'}`}>
                      {dia}
                    </span>
                    
                    {/* SUBRAYADO SEGÚN EL ESTADO DE LAS CITAS */}
                    {tieneCitas && (
                      <div className={`absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-1.5 rounded-full shadow-md ${colorSubrayado}`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* MODAL: VER CITAS DEL DÍA SELECCIONADO */}
      {modalDiaOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wider">Citas Programadas</h2>
                <p className="text-sm text-slate-400 mt-1">Para la fecha: <strong className="text-white">{fechaSeleccionada.split('-').reverse().join('/')}</strong></p>
              </div>
              <button onClick={() => setModalDiaOpen(false)} className="text-slate-400 hover:text-rose-400 text-3xl font-bold transition-colors cursor-pointer">×</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {getCitasDelDia(fechaSeleccionada).length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                  <span className="text-4xl block mb-3 opacity-50">☕</span>
                  <p className="text-slate-400">No hay citas programadas para este día.</p>
                </div>
              ) : (
                getCitasDelDia(fechaSeleccionada)
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((cita: any, idx: number) => {
                    
                    // Definir colores específicos para las etiquetas en el modal
                    let estiloEstado = "bg-slate-800 text-slate-300 border-slate-700";
                    let bordeIzquierdo = "border-l-slate-500";
                    let textoEstado = cita.estado;

                    if (cita.estado === 'pendiente') {
                      estiloEstado = "bg-rose-500/20 text-rose-400 border-rose-500/30";
                      bordeIzquierdo = "border-l-rose-500";
                      textoEstado = "Falta Aprobar";
                    } else if (cita.estado === 'confirmada') {
                      estiloEstado = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                      bordeIzquierdo = "border-l-amber-500";
                      textoEstado = "Esperando Resultados";
                    } else if (cita.estado === 'completada') {
                      estiloEstado = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                      bordeIzquierdo = "border-l-blue-500";
                      textoEstado = "Atendido";
                    }

                    return (
                      <div key={idx} className={`bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-l-4 ${bordeIzquierdo}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-800 text-cyan-400 px-2 py-0.5 rounded text-xs font-mono font-bold border border-slate-700">
                              ⏰ {cita.hora}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${estiloEstado}`}>
                              {textoEstado}
                            </span>
                          </div>
                          <p className="font-bold text-slate-100 text-sm truncate max-w-[220px]">{cita.pacienteNombre}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{cita.examen}</p>
                        </div>
                        <Link 
                          href="/dashboard-admin/gestionar-citas" 
                          className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded transition-colors text-center uppercase tracking-wider"
                        >
                          Ir a Gestión ➔
                        </Link>
                      </div>
                    );
                  })
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setModalDiaOpen(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-sm cursor-pointer transition-colors uppercase tracking-widest">
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
      <AgenteIA rol="admin" />

    </div>
  );
}