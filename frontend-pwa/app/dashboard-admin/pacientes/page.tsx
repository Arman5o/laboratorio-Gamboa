"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function GestionarPacientes() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Cargando...");
  const [adminEmail, setAdminEmail] = useState("Cargando...");

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  
  // Estados para el Modal de Consentimiento (Edición)
  const [modalConsentimiento, setModalConsentimiento] = useState(false);
  const [passwordConsentimiento, setPasswordConsentimiento] = useState("");
  
  // Estados para el Modal de Edición
  const [modalEdicion, setModalEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({ nombre: "", ci: "", celular: "", correo: "" });

  // Estados para el Modal de Crear Cuenta
  const [modalCrear, setModalCrear] = useState(false);
  const [datosNuevo, setDatosNuevo] = useState({ nombre: "", ci: "", celular: "", correo: "", password: "" });

  // NUEVOS ESTADOS PARA EL EXPEDIENTE CLÍNICO
  const [modalExpediente, setModalExpediente] = useState(false);
  const [historialPaciente, setHistorialPaciente] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    const nombreGuardado = localStorage.getItem('adminName');
    const correoGuardado = localStorage.getItem('adminEmail');
    
    if (nombreGuardado && correoGuardado) {
      setAdminName(nombreGuardado);
      setAdminEmail(correoGuardado);
      cargarPacientes();
    } else {
      router.push("/login");
    }
    }, []);

  const cargarPacientes = async () => {
    try {
      const respuesta = await fetchAuth(`${API_URL}/usuarios`);
      if (respuesta.ok) {
        const datosBD = await respuesta.json();
        setPacientes(datosBD.map((p: any) => ({ ...p, id: p._id })).reverse());
      }
    } catch (error) {
      console.error("Error al cargar pacientes:", error);
    } finally {
      setCargando(false);
    }
  };

  // FUNCIONES PARA EDICIÓN SEGURA (Con contraseña)
  const iniciarEdicion = (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setPasswordConsentimiento("");
    setModalConsentimiento(true);
  };

  const verificarConsentimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const respuesta = await fetchAuth(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: pacienteSeleccionado.correo, password: passwordConsentimiento })
      });

      if (respuesta.ok) {
        setModalConsentimiento(false);
        setDatosEdicion({
          nombre: pacienteSeleccionado.nombre,
          ci: pacienteSeleccionado.ci || "",
          celular: pacienteSeleccionado.celular || "",
          correo: pacienteSeleccionado.correo
        });
        setModalEdicion(true);
      } else {
        alert("Clave de verificación incorrecta. Consentimiento denegado.");
      }
    } catch (error) {
      alert("Error de conexión al verificar.");
    }
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const respuesta = await fetchAuth(`${API_URL}/usuarios/${pacienteSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEdicion)
      });

      if (respuesta.ok) {
        alert("Datos actualizados correctamente.");
        setModalEdicion(false);
        cargarPacientes();
      } else {
        alert("Error al guardar los cambios.");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const respuesta = await fetchAuth(`${API_URL}/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosNuevo)
      });

      if (respuesta.ok) {
        alert("Cuenta de paciente creada exitosamente.");
        setModalCrear(false);
        setDatosNuevo({ nombre: "", ci: "", celular: "", correo: "", password: "" });
        cargarPacientes();
      } else {
        const errorData = await respuesta.json();
        alert(`Error: ${errorData.message || 'No se pudo crear la cuenta'}`);
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    }
  };

  // NUEVA FUNCIÓN: Cargar el expediente de un paciente
  const verExpediente = async (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setModalExpediente(true);
    setCargandoHistorial(true);
    try {
      const respuesta = await fetchAuth(`${API_URL}/citas`);
      if (respuesta.ok) {
        const todasLasCitas = await respuesta.json();
        // Filtramos para obtener solo las citas de este paciente
        const citasDelPaciente = todasLasCitas.filter((c: any) => c.pacienteCorreo === paciente.correo);
        // Ordenamos para que las más recientes salgan primero
        setHistorialPaciente(citasDelPaciente.reverse());
      }
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p => 
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
          <Link href="/dashboard-admin/gestionar-citas" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>📅</span> Agenda e Historial</Link>
          <Link href="/dashboard-admin/pacientes" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span>👥</span> Pacientes</Link>
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>🔬</span> Cargar Resultados</Link>
          <Link href="/dashboard-admin/reportes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>📊</span> Reportes</Link>
          <Link href="/dashboard-admin/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔔</span> Notificaciones</Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => { localStorage.removeItem('adminEmail'); localStorage.removeItem('adminName'); }} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 w-full relative">
        
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider">Directorio de Pacientes</h1>
              <p className="text-slate-400 text-sm uppercase tracking-widest mt-1">Gestión de cuentas y control de privacidad.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="🔍 Buscar paciente..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-cyan-400 outline-none w-full sm:w-72 shadow-md"
              />

              <button 
                onClick={() => setModalCrear(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto cursor-pointer"
              >
                <span>+</span> NUEVO PACIENTE
              </button>
            </div>
          </div>

          {cargando ? (
            <div className="flex justify-center h-40 items-center"><span className="animate-spin border-4 border-cyan-500 border-t-transparent w-8 h-8 rounded-full"></span></div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-400">No se encontró ningún paciente con ese nombre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {pacientesFiltrados.map((paciente) => (
                <div key={paciente.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col justify-between shadow-md hover:border-cyan-500/50 transition-colors">
                  
                  {/* CABECERA DE LA TARJETA CON EL NUEVO BOTÓN */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-xl border border-slate-600">👤</div>
                      <div>
                        <h3 className="font-bold text-slate-100 truncate w-32 sm:w-40">{paciente.nombre}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {paciente.id.slice(-6)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => verExpediente(paciente)}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] sm:text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-slate-600 flex items-center gap-1 cursor-pointer"
                    >
                      <span>📂</span> Ver expediente
                    </button>
                  </div>

                  <button 
                    onClick={() => iniciarEdicion(paciente)}
                    className="w-full bg-slate-900 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-500/30 py-2.5 rounded-lg font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔒</span> SOLICITAR ACCESO Y EDITAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 0: VER EXPEDIENTE CLÍNICO */}
      {modalExpediente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/50 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wider">Expediente Clínico</h2>
                <p className="text-sm text-slate-400 mt-1">Historial del paciente: <strong className="text-white">{pacienteSeleccionado?.nombre}</strong></p>
              </div>
              <button onClick={() => setModalExpediente(false)} className="text-slate-400 hover:text-rose-400 text-3xl font-bold transition-colors cursor-pointer">×</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {cargandoHistorial ? (
                <div className="flex justify-center py-10"><span className="animate-spin border-4 border-cyan-500 border-t-transparent w-8 h-8 rounded-full"></span></div>
              ) : historialPaciente.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-400">Este paciente no tiene historial de citas registrado en el laboratorio.</p>
                </div>
              ) : (
                historialPaciente.map((cita: any, index: number) => (
                  <div key={index} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <p className="font-bold text-emerald-400 text-sm uppercase">{cita.examen}</p>
                      <p className="text-xs text-slate-400 mt-1 font-mono">Fecha: {cita.fecha} | Hora: {cita.hora}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-center w-full sm:w-auto ${cita.estado === 'completada' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : cita.estado === 'cancelada' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {cita.estado}
                      </span>
                      {/* Botón para descargar el PDF si la cita está completada y tiene el archivo */}
                      {cita.resultadoPdf && (
                        <a 
                          href={cita.resultadoPdf} 
                          download={`Resultado_${cita.examen.replace(/\s+/g, '_')}_${cita.fecha}.pdf`} 
                          className="text-[10px] bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
                        >
                          <span>⬇️</span> DESCARGAR PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setModalExpediente(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-sm cursor-pointer transition-colors uppercase tracking-widest">
                CERRAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONSENTIMIENTO */}
      {modalConsentimiento && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-4xl block mb-2">🔒</span>
              <h2 className="text-lg font-bold text-amber-400">Consentimiento Requerido</h2>
              <p className="text-xs text-slate-400 mt-2">
                Para editar los datos de <span className="font-bold text-slate-200">{pacienteSeleccionado?.nombre}</span>, se debe autorizar la acción ingresando su clave.
              </p>
            </div>
            <form onSubmit={verificarConsentimiento} className="space-y-4">
              <input 
                type="password" 
                required
                placeholder="Contraseña del paciente..."
                value={passwordConsentimiento}
                onChange={(e) => setPasswordConsentimiento(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:border-amber-400 outline-none text-center tracking-widest"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalConsentimiento(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">CANCELAR</button>
                <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">VERIFICAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDICIÓN */}
      {modalEdicion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/50 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Editar Datos Personales</h2>
            <form onSubmit={guardarEdicion} className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1 block">Nombre Completo</label><input type="text" value={datosEdicion.nombre} onChange={(e)=>setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-cyan-400 outline-none"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 mb-1 block">C.I.</label><input type="text" value={datosEdicion.ci} onChange={(e)=>setDatosEdicion({...datosEdicion, ci: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-cyan-400 outline-none"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Celular</label><input type="text" value={datosEdicion.celular} onChange={(e)=>setDatosEdicion({...datosEdicion, celular: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-cyan-400 outline-none"/></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Correo</label><input type="email" value={datosEdicion.correo} onChange={(e)=>setDatosEdicion({...datosEdicion, correo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:border-cyan-400 outline-none"/></div>
              
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setModalEdicion(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">CERRAR</button>
                <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 rounded-lg text-sm cursor-pointer">ACTUALIZAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR CUENTA */}
      {modalCrear && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-emerald-500/50 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-emerald-400">Crear Cuenta Asistida</h2>
              <p className="text-xs text-slate-400">Registro manual para pacientes de la tercera edad o sin acceso web.</p>
            </div>
            <form onSubmit={handleCrearCuenta} className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1 block">Nombre Completo</label><input type="text" required value={datosNuevo.nombre} onChange={(e)=>setDatosNuevo({...datosNuevo, nombre: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 mb-1 block">C.I.</label><input type="text" required value={datosNuevo.ci} onChange={(e)=>setDatosNuevo({...datosNuevo, ci: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Celular</label><input type="text" required value={datosNuevo.celular} onChange={(e)=>setDatosNuevo({...datosNuevo, celular: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none"/></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Correo Asignado</label><input type="email" required value={datosNuevo.correo} onChange={(e)=>setDatosNuevo({...datosNuevo, correo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none"/></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Asignar Contraseña</label><input type="text" required value={datosNuevo.password} onChange={(e)=>setDatosNuevo({...datosNuevo, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none"/></div>
              
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setModalCrear(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">CANCELAR</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">CREAR CUENTA</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}