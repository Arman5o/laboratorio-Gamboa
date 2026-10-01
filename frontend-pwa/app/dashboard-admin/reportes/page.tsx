"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function ReportesAdmin() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Cargando...");
  const [adminEmail, setAdminEmail] = useState("Cargando...");

  // Estados para el reporte
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [citasReporte, setCitasReporte] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    const nombreGuardado = localStorage.getItem('adminName');
    const correoGuardado = localStorage.getItem('adminEmail');
    
    if (nombreGuardado) {
      setAdminName(nombreGuardado);
      setAdminEmail(correoGuardado || "");
    } else {
      router.push("/login");
    }
    }, []);

  const generarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setReporteGenerado(false);

    try {
      const respuesta = await fetchAuth(`${API_URL}/citas`);
      if (respuesta.ok) {
        const todasLasCitas = await respuesta.json();
        
        // Filtramos por rango de fechas
        const filtradas = todasLasCitas.filter((cita: any) => {
          return cita.fecha >= fechaInicio && cita.fecha <= fechaFin;
        });

        // Ordenamos por fecha y hora para que el reporte tenga un orden cronológico lógico
        filtradas.sort((a: any, b: any) => {
          const dateA = new Date(`${a.fecha}T${a.hora}`);
          const dateB = new Date(`${b.fecha}T${b.hora}`);
          return dateA.getTime() - dateB.getTime();
        });

        setCitasReporte(filtradas);
        setReporteGenerado(true);
      }
    } catch (error) {
      console.error("Error al generar reporte:", error);
      alert("Error al conectar con la base de datos.");
    } finally {
      setBuscando(false);
    }
  };

  const descargarPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden print:bg-white print:h-auto print:overflow-visible">
      
      {/* Estilos específicos para aislar la zona del reporte en PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #zona-impresion, #zona-impresion * { visibility: visible; }
          #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; color: black !important; background: white !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 1.5cm; }
        }
      `}} />

      {/* FONDO OSCURO EN MÓVIL */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* BARRA LATERAL RESPONSIVA */}
      <aside className={`no-print fixed md:relative top-0 left-0 z-50 h-full bg-slate-800 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${isSidebarOpen ? 'w-[75%] sm:w-[60%] md:w-64 translate-x-0 border-r border-slate-700 opacity-100' : 'w-0 -translate-x-full border-0 opacity-0 pointer-events-none'}`}>
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
          <Link href="/dashboard-admin/subir-resultados" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span>🔬</span> Cargar Resultados</Link>
          <Link href="/dashboard-admin/reportes" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span>📊</span> Reportes</Link>
          <Link href="/dashboard-admin/notificaciones" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:text-cyan-400 text-sm"><span className="text-lg">🔔</span> Notificaciones</Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link href="/login" onClick={() => localStorage.clear()} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 text-rose-400 font-bold py-2.5 rounded-lg border border-slate-700 text-xs">
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 w-full relative print:h-auto print:bg-white print:overflow-visible">
        
        {/* BARRA SUPERIOR PERFECTAMENTE ALINEADA */}
        {!isSidebarOpen && (
          <nav className="no-print bg-slate-800 border-b border-slate-700 p-4 px-6 flex items-center justify-between z-20 shrink-0 shadow-md h-[73px]">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors">≡</button>
              <span className="text-base font-bold text-slate-100 uppercase tracking-widest">LAB. GAMBOA</span>
            </div>
            <div className="hidden sm:block px-4 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400">
              Admin: <span className="text-cyan-400">{adminName}</span>
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          
          {/* SECCIÓN DE CONTROLES (No se imprime) */}
          <div className="no-print max-w-5xl mx-auto w-full mb-8">
            <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider mb-2">Generador de Reportes</h1>
            <p className="text-slate-400 text-sm uppercase tracking-widest mb-6">Seleccione el rango de fechas para extraer datos.</p>

            <form onSubmit={generarReporte} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-end gap-6">
              <div className="w-full md:w-1/3">
                <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Fecha Inicio</label>
                <input type="date" required value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none focus:border-cyan-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Fecha Fin</label>
                <input type="date" required value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none focus:border-cyan-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <div className="w-full md:w-1/3">
                <button type="submit" disabled={buscando} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-slate-900 font-bold py-3.5 rounded-lg transition-colors cursor-pointer shadow-lg">
                  {buscando ? "PROCESANDO..." : "GENERAR REPORTE"}
                </button>
              </div>
            </form>

            {reporteGenerado && (
              <div className="mt-6 flex justify-between items-center bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                <p className="text-emerald-400 text-sm font-bold">✓ Se encontraron {citasReporte.length} registros en el rango seleccionado.</p>
                <button onClick={descargarPDF} className="bg-slate-100 hover:bg-white text-slate-900 font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-widest shadow-lg cursor-pointer">
                  🖨️ Guardar PDF
                </button>
              </div>
            )}
          </div>

          {/* 🖨️ ZONA DE IMPRESIÓN 🖨️ */}
          {reporteGenerado && citasReporte.length > 0 && (
            <div id="zona-impresion" className="max-w-4xl mx-auto bg-white p-8 text-black min-h-screen">
              
              <div className="text-center mb-10 border-b-2 border-black pb-4">
                <h1 className="text-xl font-extrabold uppercase tracking-wide">REPORTE DEL LABORATORIOS DE ANALISIS CLINICO GAMBOA</h1>
                <p className="text-sm mt-1">Periodo: {fechaInicio.split('-').reverse().join('/')} al {fechaFin.split('-').reverse().join('/')}</p>
              </div>

              <div className="space-y-6">
                {citasReporte.map((cita, index) => (
                  <div key={index} className="border-2 border-black bg-white text-[11px] md:text-xs">
                    
                    {/* Fila 1: Paciente y Fecha */}
                    {/* Ajustado a col-span 3+6+2+1 para alinear todos los bordes a la perfección */}
                    <div className="grid grid-cols-12 border-b border-black">
                      <div className="col-span-3 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center">NOMBRE DEL PACIENTE</div>
                      <div className="col-span-6 p-2 border-r border-black flex items-center font-bold uppercase">{cita.pacienteNombre}</div>
                      <div className="col-span-2 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center">FECHA:</div>
                      <div className="col-span-1 p-2 flex items-center justify-center font-mono font-bold">{cita.fecha}</div>
                    </div>
                    
                    {/* Fila 2: Doctor y Práctica */}
                    <div className="grid grid-cols-12 border-b border-black">
                      <div className="col-span-3 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center">NOMBRE DEL DOCTOR</div>
                      <div className="col-span-6 p-2 border-r border-black flex items-center font-bold uppercase">{adminName}</div>
                      <div className="col-span-2 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center leading-tight">PRACTICA No.</div>
                      <div className="col-span-1 p-2 flex items-center justify-center font-mono">{cita.id?.slice(-4) || '---'}</div>
                    </div>

                    {/* Fila 3: Laboratorio y Duración (Hora) */}
                    <div className="grid grid-cols-12">
                      <div className="col-span-3 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center">LABORATORIO DE:</div>
                      <div className="col-span-6 p-2 border-r border-black flex items-center font-bold uppercase">{cita.examen}</div>
                      <div className="col-span-2 bg-gray-200 font-bold p-2 border-r border-black flex items-center justify-center text-center leading-tight">DURACIÓN (HORA)</div>
                      <div className="col-span-1 p-2 flex items-center justify-center font-mono">{cita.hora}</div>
                    </div>

                  </div>
                ))}
              </div>
              
              {/* Pie de página del reporte para Firma */}
              <div className="mt-16 text-center text-xs">
                <p>___________________________________</p>
                <p className="mt-1 font-bold">Firma del Profesional</p>
                <p className="uppercase">{adminName}</p>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}