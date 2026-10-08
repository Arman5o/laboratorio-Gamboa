"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function SubirResultadosAdmin() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Cargando...");
  const [adminEmail, setAdminEmail] = useState("Cargando...");
  const [citasPendientes, setCitasPendientes] = useState<any[]>([]);
  const [archivoPDF, setArchivoPDF] = useState<{ [id: string]: string }>({});
  const [subiendoId, setSubiendoId] = useState<string | null>(null);

  // NUEVOS ESTADOS PARA EL LLENADO DE RESULTADOS
  const [modalLlenar, setModalLlenar] = useState(false);
  const [citaActiva, setCitaActiva] = useState<any>(null);
  
  // Valores del formulario médico
  const [valoresLaboratorio, setValoresLaboratorio] = useState<Record<string, string>>({
    observaciones: ""
  });

  const FORMULARIOS: Record<string, { key: string, label: string }[]> = {
    'Análisis de Sangre (Rutina)': [
      { key: 'glucosa', label: 'Glucosa (mg/dL)' },
      { key: 'urea', label: 'Urea (mg/dL)' },
      { key: 'creatinina', label: 'Creatinina (mg/dL)' },
      { key: 'biometriaHematica', label: 'Biometría Hemática' },
    ],
    'Perfil Lipídico': [
      { key: 'colesterol', label: 'Colesterol Total (mg/dL)' },
      { key: 'trigliceridos', label: 'Triglicéridos (mg/dL)' },
      { key: 'hdl', label: 'Colesterol HDL (mg/dL)' },
      { key: 'ldl', label: 'Colesterol LDL (mg/dL)' },
    ],
    'Análisis de Orina (Completo)': [
      { key: 'color', label: 'Color' },
      { key: 'aspecto', label: 'Aspecto' },
      { key: 'ph', label: 'pH' },
      { key: 'densidad', label: 'Densidad' },
      { key: 'examenOrina', label: 'Examen Microscópico' },
    ],
    'Detección Molecular (PCR)': [
      { key: 'resultadoPCR', label: 'Resultado PCR (Positivo/Negativo)' },
      { key: 'ctValue', label: 'Valor CT (Ciclos)' },
    ],
    'Prueba de Tolerancia a la Glucosa': [
      { key: 'glucosaBasal', label: 'Glucosa Basal (mg/dL)' },
      { key: 'glucosa30m', label: 'Glucosa a los 30 min (mg/dL)' },
      { key: 'glucosa60m', label: 'Glucosa a los 60 min (mg/dL)' },
      { key: 'glucosa120m', label: 'Glucosa a los 120 min (mg/dL)' },
    ]
  };

  useEffect(() => {
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
        const pendientesDeResultado = datosBD
          .map((c: any) => ({ ...c, id: c._id }))
          .filter((c: any) => c.estado === 'confirmada');
        setCitasPendientes(pendientesDeResultado.reverse());
      }
    } catch (error) {
      console.error("Error al cargar citas:", error);
    }
  };

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>, idCita: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArchivoPDF({ ...archivoPDF, [idCita]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubirAlaBD = async (cita: any) => {
    if (!archivoPDF[cita.id]) {
      alert("Por favor, selecciona un archivo PDF primero.");
      return;
    }

    setSubiendoId(cita.id);
    try {
      const respuesta = await fetchAuth(`${API_URL}/citas/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...cita,
          estado: 'completada', 
          resultadoPdf: archivoPDF[cita.id] 
        })
      });

      if (respuesta.ok) {
        alert("¡PDF subido y guardado en la base de datos con éxito!");
        setCitasPendientes(citasPendientes.filter(c => c.id !== cita.id));
      } else {
        alert("Error al guardar en MongoDB.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión con el backend.");
    } finally {
      setSubiendoId(null);
    }
  };

  const abrirModalLlenado = (cita: any) => {
    setCitaActiva(cita);
    setValoresLaboratorio({
      observaciones: ""
    });
    setModalLlenar(true);
  };

  const imprimirPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden print:bg-white print:h-auto print:overflow-visible">
      
      {/* ESTILOS DE IMPRESIÓN PARA EL REPORTE MÉDICO */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #plantilla-resultado, #plantilla-resultado * { visibility: visible; }
          #plantilla-resultado { position: absolute; left: 0; top: 0; width: 100%; color: black !important; background: white !important; font-family: sans-serif; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* FONDO OSCURO EN MÓVIL */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm no-print" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* BARRA LATERAL */}
      <aside className={`no-print
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
          <Link href="/dashboard-admin/gestionar-citas" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>📅</span> Agenda e Historial</Link>
          <Link href="/dashboard-admin/pacientes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>👥</span> Pacientes</Link>
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span>🔬</span> Cargar Resultados</Link>
          <Link href="/dashboard-admin/reportes" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>📊</span> Reportes</Link>
          <Link href="/dashboard-admin/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔔</span> Notificaciones</Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => { localStorage.removeItem('adminEmail'); localStorage.removeItem('adminName'); }} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 w-full relative print:h-auto print:bg-white print:overflow-visible">
        
        {/* BARRA SUPERIOR */}
        <nav className="no-print bg-slate-800 border-b border-slate-700 p-4 px-6 flex items-center justify-between z-20 shrink-0 shadow-md h-[73px]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors">≡</button>
            <span className="text-base font-bold text-slate-100 uppercase tracking-widest">LAB. GAMBOA</span>
          </div>
          <div className="hidden sm:block px-4 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400">
            Admin: <span className="text-cyan-400">{adminName}</span>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-print">
          <h1 className="text-2xl font-bold text-slate-100 mb-2 uppercase tracking-wider">SUBIR RESULTADOS FINALES</h1>
          <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest">Selecciona el PDF correspondiente o llena los datos para generar uno nuevo.</p>

          <div className="space-y-6">
            {citasPendientes.length === 0 ? (
               <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl">
                 <p className="text-slate-400">No hay citas pendientes de resultados.</p>
               </div>
            ) : (
              citasPendientes.map((cita) => (
                <div key={cita.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg hover:border-cyan-500/30 transition-colors">
                  <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-emerald-400">{cita.pacienteNombre}</h3>
                      <p className="text-sm text-slate-300">Estudio: <span className="font-bold text-slate-100">{cita.examen}</span></p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">Tomado el: {cita.fecha}</span>
                  </div>
                  
                  <div className="flex flex-col xl:flex-row items-center gap-4">
                    {/* Botón para abrir el Llenado Manual */}
                    <button 
                      onClick={() => abrirModalLlenado(cita)}
                      className="w-full xl:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors border border-slate-600"
                    >
                      📝 Llenar Resultados
                    </button>

                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={(e) => handleArchivoSeleccionado(e, cita.id)}
                      className="flex-1 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
                    />
                    
                    <button 
                      onClick={() => handleSubirAlaBD(cita)}
                      disabled={!archivoPDF[cita.id] || subiendoId === cita.id}
                      className="w-full xl:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {subiendoId === cita.id ? "SUBIENDO A BD..." : "↑ GUARDAR RESULTADO"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODAL DE LLENADO DE RESULTADOS (No se imprime) */}
        {modalLlenar && citaActiva && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wider">Llenar Análisis Clínico</h2>
                  <p className="text-sm text-slate-400 mt-1">Paciente: <strong className="text-white">{citaActiva.pacienteNombre}</strong></p>
                </div>
                <button onClick={() => setModalLlenar(false)} className="text-slate-400 hover:text-rose-400 text-3xl font-bold transition-colors">×</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(FORMULARIOS[citaActiva.examen] || []).map((campo) => (
                    <div key={campo.key}>
                      <label className="text-xs text-slate-400 block mb-1">{campo.label}</label>
                      <input 
                        type="text" 
                        value={valoresLaboratorio[campo.key] || ""} 
                        onChange={e => setValoresLaboratorio({...valoresLaboratorio, [campo.key]: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                      />
                    </div>
                  ))}
                </div>
                <div><label className="text-xs text-slate-400 block mb-1">Observaciones</label><textarea value={valoresLaboratorio.observaciones || ""} onChange={e=>setValoresLaboratorio({...valoresLaboratorio, observaciones: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 h-20 resize-none"></textarea></div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setModalLlenar(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors">Cancelar</button>
                <button onClick={imprimirPDF} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                  <span>🖨️</span> Generar PDF
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-3">Al generar el PDF, guárdalo en tu PC y súbelo usando el botón "Seleccionar archivo".</p>
            </div>
          </div>
        )}

        {/* 🖨️ PLANTILLA OFICIAL DE IMPRESIÓN (OCULTA EN PANTALLA NORMAL) 🖨️ */}
        {citaActiva && (
          <div id="plantilla-resultado" className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8 min-h-screen">
            
            {/* CABECERA TIPO HOSPITAL */}
            <div className="border-b-4 border-double border-black pb-4 mb-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">LABORATORIO DE ANÁLISIS CLÍNICOS</h1>
                <h2 className="text-lg font-bold tracking-widest uppercase mt-1">GAMBOA</h2>
                <p className="text-xs mt-1 font-mono">ID de Sistema: {citaActiva.id}</p>
              </div>
              <div className="text-right text-xs font-bold border-l-2 border-black pl-4">
                <p>HORARIO DE ATENCIÓN:</p>
                <p>LUNES A VIERNES 08:00 - 18:00 HRS</p>
                <p className="mt-2 text-sm">FECHA: {citaActiva.fecha.split('-').reverse().join('/')}</p>
              </div>
            </div>

            {/* DATOS DEL PACIENTE (TABLA SUPERIOR) */}
            <div className="border-2 border-black mb-6 text-xs uppercase font-bold grid grid-cols-12 bg-gray-100">
              <div className="col-span-2 border-r border-b border-black p-2">PACIENTE:</div>
              <div className="col-span-6 border-r border-b border-black p-2 bg-white">{citaActiva.pacienteNombre}</div>
              <div className="col-span-2 border-r border-b border-black p-2">MÉDICO / BIOQ:</div>
              <div className="col-span-2 border-b border-black p-2 bg-white">{adminName}</div>
              
              <div className="col-span-2 border-r border-black p-2">ESTUDIO REF:</div>
              <div className="col-span-6 border-r border-black p-2 bg-white text-blue-900">{citaActiva.examen}</div>
              <div className="col-span-2 border-r border-black p-2">HORA TOMA:</div>
              <div className="col-span-2 border-black p-2 bg-white">{citaActiva.hora} HRS</div>
            </div>

            {/* CUERPO DEL REPORTE - RESULTADOS DINÁMICOS */}
            <div className="grid grid-cols-3 gap-4 text-xs">
              
              {/* COLUMNA 1 & 2: RESULTADOS (ocupa 2 tercios) */}
              <div className="col-span-2 border-2 border-black">
                <div className="bg-gray-200 border-b-2 border-black p-1 text-center font-bold uppercase">Resultados del Estudio</div>
                <div className="p-4 space-y-3 font-mono">
                  {(FORMULARIOS[citaActiva.examen] || []).map((campo) => (
                    <div key={campo.key} className="flex justify-between border-b border-gray-300 pb-1">
                      <span>{campo.label}:</span>
                      <span className="font-bold text-sm">{valoresLaboratorio[campo.key] || "---"}</span>
                    </div>
                  ))}
                  {(!FORMULARIOS[citaActiva.examen] || FORMULARIOS[citaActiva.examen].length === 0) && (
                    <div className="text-gray-500 italic py-4 text-center">Formato de resultados no especificado para este estudio.</div>
                  )}
                </div>
              </div>

              {/* COLUMNA 3: OBSERVACIONES FINALES */}
              <div className="border-2 border-black">
                <div className="bg-gray-200 border-b-2 border-black p-1 text-center font-bold uppercase">Observaciones Médicas</div>
                <div className="p-2 font-mono text-[11px] h-40">
                  {valoresLaboratorio.observaciones || "Resultados dentro de los parámetros de referencia normales. Se sugiere evaluación con su médico de cabecera."}
                </div>
                
                {/* SELLO DE VIGENCIA IMITANDO LA IMAGEN */}
                <div className="m-2 mt-4 border-2 border-black h-24 flex items-center justify-center text-center p-2">
                  <div>
                    <p className="font-black text-sm uppercase">SELLO Y FIRMA</p>
                    <p className="text-[10px] mt-2">VÁLIDO SOLO CON SELLO DEL LABORATORIO</p>
                  </div>
                </div>
              </div>

            </div>

            {/* NOTAS FINALES AL PIE DE PÁGINA */}
            <div className="mt-8 text-[10px] leading-tight">
              <p className="font-bold">* LOS RESULTADOS FUERA DEL RANGO NORMAL DEBEN SER INTERPRETADOS POR UN MÉDICO ESPECIALISTA.</p>
              <p>ESTE DOCUMENTO ES ESTRICTAMENTE CONFIDENCIAL Y DE USO EXCLUSIVO PARA EL PACIENTE Y SU MÉDICO TRATANTE.</p>
            </div>
            
          </div>
        )}

      </main>
    </div>
  );
}