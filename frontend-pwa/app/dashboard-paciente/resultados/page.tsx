"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";
import AgenteIA from "../../components/AgenteIA";

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

  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [sugerenciaEdicion, setSugerenciaEdicion] = useState<string | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Al abrir edición, resetear estados
  const handleAbrirEdicion = (cita: any) => {
    setCitaEditando({ ...cita });
    setErrorEdicion(null);
    setSugerenciaEdicion(null);
  };

  // Validar en tiempo real los cambios del modal de edición
  const validarCambioEdicion = (nuevaFecha: string, nuevaHora: string, examen: string) => {
    if (!nuevaFecha || !nuevaHora) {
      setErrorEdicion(null);
      setSugerenciaEdicion(null);
      return;
    }

    const ahora = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hoyStr = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;

    // 1. Validar fecha pasada
    if (nuevaFecha < hoyStr) {
      setErrorEdicion("La fecha seleccionada ya pasó. Debe ser a partir de hoy.");
      setSugerenciaEdicion(null);
      return;
    }

    // 2. Validar fuera de horario de atención (07:30 - 18:00)
    const [h, m] = nuevaHora.split(':').map(Number);
    const minTotal = h * 60 + m;
    const minApertura = 7 * 60 + 30; // 07:30
    const minCierre = 18 * 60;       // 18:00

    const examenesAyuno = ["Análisis de Sangre (Rutina)", "Perfil Lipídico", "Prueba de Tolerancia a la Glucosa"];
    const requiereAyuno = examenesAyuno.includes(examen);

    if (minTotal < minApertura || minTotal > minCierre) {
      setErrorEdicion(`La hora ${nuevaHora} está fuera del horario de atención del laboratorio (07:30 a 18:00 hrs).`);
      setSugerenciaEdicion(requiereAyuno ? "08:00" : "09:30");
      return;
    }

    // 3. Si requiere ayuno y es después de las 11:30
    if (requiereAyuno && minTotal > (11 * 60 + 30)) {
      setErrorEdicion(`Este examen (${examen}) requiere ayuno matutino. No se recomienda después de las 11:30 hrs.`);
      setSugerenciaEdicion("08:00");
      return;
    }

    // 4. Si es hoy y ya pasó la hora
    if (nuevaFecha === hoyStr) {
      const minActual = ahora.getHours() * 60 + ahora.getMinutes() + 15;
      if (minTotal < minActual) {
        setErrorEdicion(`La hora ${nuevaHora} ya pasó o no cumple con los 15 minutos de anticipación requeridos.`);
        const hSugerida = Math.min(Math.max(Math.ceil(minActual / 30) * 30, minApertura), minCierre);
        if (hSugerida <= minCierre) {
          const hh = pad(Math.floor(hSugerida / 60));
          const mm = pad(hSugerida % 60);
          setSugerenciaEdicion(`${hh}:${mm}`);
        } else {
          setSugerenciaEdicion(null);
        }
        return;
      }
    }

    // Si todo está correcto
    setErrorEdicion(null);
    setSugerenciaEdicion(null);
  };


  const handleGuardarEdicion = async () => {
    if (!citaEditando) return;
    
    // Validar antes de guardar
    if (citaEditando.hora < "07:30" || citaEditando.hora > "18:00") {
      setErrorEdicion("El horario de atención es estrictamente de 07:30 a 18:00 hrs.");
      setSugerenciaEdicion("08:00");
      return;
    }

    setGuardandoEdicion(true);
    try {
      const respuesta = await fetchAuth(`${API_URL}/citas/${citaEditando.id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examen: citaEditando.examen, fecha: citaEditando.fecha, hora: citaEditando.hora })
      });
      
      const data = await respuesta.json().catch(() => ({}));

      if (respuesta.ok) {
        const citasActualizadas = citas.map(c => c.id === citaEditando.id ? { ...citaEditando } : c);
        setCitas(citasActualizadas); 
        setCitaEditando(null); 
        setErrorEdicion(null);
        setSugerenciaEdicion(null);
      } else if (respuesta.status === 409 || respuesta.status === 400) {
        if (data.tipoError === 'HORARIO_OCUPADO') {
          setErrorEdicion(`El horario ${citaEditando.hora} ya está reservado o en conflicto con otro turno.`);
          setSugerenciaEdicion(data.sugerencia || "08:30");
        } else if (data.tipoError === 'DUPLICADO_DIA') {
          setErrorEdicion("Ya cuentas con otra cita registrada para esta misma fecha.");
          setSugerenciaEdicion(null);
        } else {
          setErrorEdicion(data.message || "No se pudo actualizar la cita con esos datos.");
          if (data.sugerencia) setSugerenciaEdicion(data.sugerencia);
        }
      } else { 
        setErrorEdicion("Error al guardar cambios en el servidor."); 
      }
    } catch (error) { 
      console.error(error); 
      setErrorEdicion("Error de conexión al servidor."); 
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleConfirmarCancelacion = async () => {
    try {
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
          <Link href="/dashboard-paciente/configuracion" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm">
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
        {/* Header responsive con botón menú para móviles */}
        <div className="bg-slate-800/50 border-b border-slate-800 p-4 px-6 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-2xl text-cyan-400 focus:outline-none">≡</button>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-100 tracking-wider uppercase">EXPEDIENTE CLÍNICO</h1>
              <p className="text-[11px] md:text-xs text-cyan-400 font-mono tracking-widest mt-0.5 truncate max-w-[200px] sm:max-w-md">Historial: {userEmail}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
          <h2 className="text-xs md:text-sm text-slate-500 uppercase tracking-widest mb-6">MIS RESULTADOS Y RESERVAS</h2>
          
          <div className="space-y-4">
            {citas.map((cita) => (
              <div key={cita.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-500 transition-colors shadow-lg">
                <div className="flex-1 min-w-[180px]">
                  <h3 className="text-base md:text-lg font-bold text-slate-100 mb-1.5 whitespace-normal leading-snug">{cita.examen}</h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Programado para el: <span className="text-slate-300 font-medium">{cita.fecha}</span> a las <span className="text-cyan-400 font-mono font-bold">{cita.hora}</span>
                  </p>
                </div>

                {/* LOS TRES CUADROS EN PILA (ESTADO, VER DETALLES, CANCELAR) */}
                <div className="flex flex-col gap-2.5 w-full md:w-48 shrink-0">
                  {/* Cuadro 1: PENDIENTE / CONFIRMADA / ETC */}
                  <div className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest border text-center uppercase shadow-sm ${cita.estado === 'completada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : cita.estado === 'confirmada' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : cita.estado === 'cancelada' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                    {cita.estado || 'pendiente'}
                  </div>

                  {cita.estado === 'completada' ? (
                    <button onClick={() => handleDescargarPDF(cita.id)} disabled={descargando === cita.id} className="w-full bg-cyan-500/10 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-slate-900 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs uppercase shadow-sm">
                      {descargando === cita.id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <><span>↓</span> DESCARGAR PDF</>}
                    </button>
                  ) : (
                    <>
                      {/* Cuadro 2: VER DETALLES */}
                      <button onClick={() => handleAbrirEdicion(cita)} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2.5 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm uppercase tracking-wider">
                        <span>👁</span> VER DETALLES
                      </button>

                      {/* Cuadro 3: CANCELAR */}
                      <button onClick={() => setCitaCancelando(cita)} className="w-full bg-transparent border border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-slate-900 font-bold py-2.5 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm uppercase tracking-wider">
                        <span>🗑</span> CANCELAR
                      </button>
                    </>
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

      {/* Modal Ver Detalles / Editar Cita con ASISTENTE IA */}
      {citaEditando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-cyan-400">Detalles de la Reserva</h2>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full font-mono">EDITAR</span>
            </div>
            <p className="text-slate-400 text-xs mb-5 uppercase tracking-widest font-mono">ID: {citaEditando.id}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Tipo de Examen</label>
                <select 
                  value={citaEditando.examen} 
                  onChange={(e) => {
                    const nuevoEx = e.target.value;
                    setCitaEditando({ ...citaEditando, examen: nuevoEx });
                    validarCambioEdicion(citaEditando.fecha, citaEditando.hora, nuevoEx);
                  }} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-sm"
                >
                  {CATALOGO_EXAMENES.map((ex) => <option key={ex} value={ex}>{ex}</option> )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Fecha</label>
                  <input 
                    type="date" 
                    value={citaEditando.fecha} 
                    onChange={(e) => {
                      const nuevaF = e.target.value;
                      setCitaEditando({ ...citaEditando, fecha: nuevaF });
                      validarCambioEdicion(nuevaF, citaEditando.hora, citaEditando.examen);
                    }} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Hora (07:30 a 18:00)</label>
                  <input 
                    type="time" 
                    value={citaEditando.hora} 
                    onChange={(e) => {
                      const nuevaH = e.target.value;
                      setCitaEditando({ ...citaEditando, hora: nuevaH });
                      validarCambioEdicion(citaEditando.fecha, nuevaH, citaEditando.examen);
                    }} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>

              {/* 🤖 ADVERTENCIA / SUGERENCIA DEL AGENTE IA EN TIEMPO REAL */}
              {errorEdicion && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl shrink-0">🤖</span>
                    <div>
                      <p className="font-bold text-amber-400 mb-0.5">Advertencia del Agente IA:</p>
                      <p className="text-slate-300 leading-relaxed">{errorEdicion}</p>
                    </div>
                  </div>

                  {sugerenciaEdicion && (
                    <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-cyan-400 font-medium">
                        💡 Horario recomendado: <strong className="font-mono text-white text-sm">{sugerenciaEdicion}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCitaEditando({ ...citaEditando, hora: sugerenciaEdicion });
                          validarCambioEdicion(citaEditando.fecha, sugerenciaEdicion, citaEditando.examen);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs uppercase cursor-pointer transition-colors shrink-0"
                      >
                        Aplicar {sugerenciaEdicion}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => { setCitaEditando(null); setErrorEdicion(null); setSugerenciaEdicion(null); }} 
                className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer order-2 sm:order-1"
              >
                VOLVER
              </button>
              <button 
                onClick={handleGuardarEdicion} 
                disabled={guardandoEdicion || !!errorEdicion}
                className="w-full sm:flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer order-1 sm:order-2"
              >
                {guardandoEdicion ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
              </button>
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
      {/* Agente IA Asistente */}
      <AgenteIA rol="paciente" />
    </div>
  );
}