"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

const CATALOGO_EXAMENES = [
  "Análisis de Sangre (Rutina)",
  "Detección Molecular (PCR)",
  "Análisis de Orina (Completo)",
  "Perfil Lipídico",
  "Prueba de Tolerancia a la Glucosa"
];

export default function ResultadosClinicos() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [userEmail, setUserEmail] = useState("Cargando...");
  const [userName, setUserName] = useState("Cargando...");

  const [citas, setCitas] = useState<any[]>([]);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [modalDescargaExitosa, setModalDescargaExitosa] = useState(false);
  const [citaEditando, setCitaEditando] = useState<any>(null); 
  const [citaCancelando, setCitaCancelando] = useState<any>(null); 

  useEffect(() => {
    if (window.innerWidth >= 768) setIsSidebarOpen(true);

    const correoGuardado = localStorage.getItem('pacienteEmail');
    const nombreGuardado = localStorage.getItem('pacienteName');
    
    if (!correoGuardado || correoGuardado === "undefined") {
      router.push("/login");
      return;
    }

    setUserEmail(correoGuardado);
    setUserName(nombreGuardado || "Paciente Registrado");

    const cargarCitasDesdeBD = async () => {
      setCitas([]); 
      try {
        const ipActual = window.location.hostname;
        const respuesta = await fetchAuth(`${API_URL}/citas/paciente/${correoGuardado}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (respuesta.ok) {
          const datosBD = await respuesta.json();
          const misCitas = datosBD.filter((c: any) => c.pacienteCorreo?.toLowerCase() === correoGuardado.toLowerCase());
          const citasFormateadas = misCitas.map((cita: any) => ({ ...cita, id: cita._id }));
          setCitas(citasFormateadas.reverse());
        }
      } catch (error) { 
        console.error("Error BD:", error); 
      }
    };

    cargarCitasDesdeBD();

    // Tiempo Real (WebSockets)
    const socket = io(API_URL);
    socket.on('citaActualizada', (cita) => {
      if (cita.pacienteCorreo?.toLowerCase() === correoGuardado.toLowerCase()) {
        cargarCitasDesdeBD();
      }
    });

    return () => { socket.disconnect(); };
    }, []);

  const handleDescargarPDF = (id: string) => { 
    setDescargando(id); 
    setTimeout(() => { 
      const citaConResultado = citas.find(c => c.id === id);
      if (citaConResultado && citaConResultado.resultadoPdf) {
        const enlace = document.createElement("a");
        enlace.href = citaConResultado.resultadoPdf;
        enlace.download = `Resultado_LabGamboa_${citaConResultado.examen.replace(/\s+/g, '_')}.pdf`; 
        enlace.click();
        setModalDescargaExitosa(true); 
      } else {
        alert("Error: El documento PDF no se encontró en la base de datos.");
      }
      setDescargando(null); 
    }, 1000); 
  };

  const handleGuardarEdicion = async () => {
    try {
      const ipActual = window.location.hostname;
      const respuesta = await fetchAuth(`${API_URL}/citas/${citaEditando.id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examen: citaEditando.examen, fecha: citaEditando.fecha, hora: citaEditando.hora })
      });
      if (respuesta.ok) {
        const citasActualizadas = citas.map(c => c.id === citaEditando.id ? citaEditando : c);
        setCitas(citasActualizadas); 
        setCitaEditando(null); 
      } else { 
        alert("Error al editar."); 
      }
    } catch (error) { 
      console.error(error); 
      alert("Error de conexión al servidor."); 
    }
  };

  const handleConfirmarCancelacion = async () => {
    try {
      const ipActual = window.location.hostname;
      const respuesta = await fetchAuth(`${API_URL}/citas/${citaCancelando.id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        const citasActualizadas = citas.filter(c => c.id !== citaCancelando.id);
        setCitas(citasActualizadas); 
        setCitaCancelando(null); 
      } else { 
        alert("Error al cancelar."); 
      }
    } catch (error) { 
      console.error(error); 
      alert("Error de conexión al servidor."); 
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full whitespace-nowrap
        transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shrink-0
        ${!isSidebarOpen ? 'md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden' : 'md:w-64'}
      `}>
        <div className="p-4 px-6 flex items-center gap-4 border-b border-slate-700/50 h-[73px]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors">≡</button>
          <div>
            <span className="text-base font-bold text-slate-100 tracking-wider uppercase">LAB. GAMBOA</span>
            <p className="text-[11px] text-cyan-400 uppercase tracking-widest font-medium">Panel de Usuario</p>
          </div>
        </div>

        <div className="py-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-slate-800 text-slate-900 font-bold text-2xl">
            {userName.charAt(0)}
          </div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">{userName}</p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{userEmail}</p>
        </div>

        <nav className="flex-1 py-2 flex flex-col">
          <Link href="/dashboard-paciente" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
            <span className="text-lg">🏠</span> Dashboard Principal
          </Link>
          <Link href="/dashboard-paciente/programar-cita" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
            <span className="text-lg">📅</span> Programar Cita
          </Link>
          <Link href="/dashboard-paciente/resultados" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 transition-colors text-sm">
            <span className="text-lg">🧬</span> Resultados Clínicos
          </Link>
          <Link href="/dashboard-paciente/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
            <span className="text-lg">🔔</span> Notificaciones
          </Link>
          <Link href="#" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
            <span className="text-lg">⚙️</span> Configuración
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => { localStorage.clear(); }} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 hover:text-slate-900 text-rose-400 font-bold py-2.5 rounded-lg transition-colors border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 relative w-full">
        <div className="bg-slate-800/50 border-b border-slate-800 p-4 px-8 hidden md:flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-wider uppercase">EXPEDIENTE CLÍNICO</h1>
            <p className="text-xs text-cyan-400 font-mono tracking-widest mt-0.5">Historial de: {userEmail}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
          <h2 className="text-sm text-slate-500 uppercase tracking-widest mb-6">MIS RESULTADOS Y RESERVAS</h2>
          
          <div className="space-y-4">
            {citas.map((cita) => (
              <div key={cita.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-500 transition-colors shadow-lg">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1">{cita.examen}</h3>
                  <p className="text-sm text-slate-400">Programado para el: <span className="text-slate-300 font-medium">{cita.fecha}</span> a las <span className="text-cyan-400 font-mono">{cita.hora}</span></p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest border w-full sm:w-auto text-center ${cita.estado === 'completada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : cita.estado === 'confirmada' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : cita.estado === 'cancelada' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                    {(cita.estado || 'pendiente').toUpperCase()}
                  </div>

                  {cita.estado === 'completada' ? (
                    <button onClick={() => handleDescargarPDF(cita.id)} disabled={descargando === cita.id} className="w-full sm:w-auto bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-slate-900 font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                      {descargando === cita.id ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <><span>↓</span> DESCARGAR PDF</>}
                    </button>
                  ) : (
                    <div className="flex w-full sm:w-auto gap-2">
                      <button onClick={() => setCitaEditando({ ...cita })} className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"><span>👁</span> VER DETALLES</button>
                      <button onClick={() => setCitaCancelando(cita)} className="flex-1 sm:flex-none bg-transparent border border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"><span>🗑</span> CANCELAR</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {citas.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                <p className="text-slate-500">No tienes citas programadas ni historial de resultados.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal PDF Exitoso */}
      {modalDescargaExitosa && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <span className="text-4xl text-emerald-400">✓</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Descarga Completada</h2>
            <p className="text-slate-400 mb-6 text-sm">Su informe de laboratorio ha sido guardado exitosamente.</p>
            <button onClick={() => setModalDescargaExitosa(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-lg transition-colors text-sm cursor-pointer">CERRAR</button>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles / Editar Cita */}
      {citaEditando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-cyan-400 mb-1">Detalles de la Reserva</h2>
            <p className="text-slate-400 text-xs mb-6 uppercase tracking-widest">ID: {citaEditando.id}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase">Tipo de Examen</label>
                <select value={citaEditando.examen} onChange={(e) => setCitaEditando({ ...citaEditando, examen: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400">
                  {CATALOGO_EXAMENES.map((ex) => <option key={ex} value={ex}>{ex}</option> )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1 uppercase">Fecha</label>
                  <input type="date" value={citaEditando.fecha} onChange={(e) => setCitaEditando({ ...citaEditando, fecha: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"/>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1 uppercase">Hora</label>
                  <input type="time" value={citaEditando.hora} onChange={(e) => setCitaEditando({ ...citaEditando, hora: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"/>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setCitaEditando(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer">VOLVER</button>
              <button onClick={handleGuardarEdicion} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer">GUARDAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Cita */}
      {citaCancelando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <span className="text-4xl text-rose-400">!</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">¿Cancelar Cita?</h2>
            <p className="text-slate-400 mb-6 text-sm">Está a punto de cancelar su reserva para <span className="text-rose-400 font-bold">{citaCancelando.examen}</span>.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleConfirmarCancelacion} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer">SÍ, CONFIRMAR CANCELACIÓN</button>
              <button onClick={() => setCitaCancelando(null)} className="w-full bg-transparent border border-slate-600 text-slate-200 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer">VOLVER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}