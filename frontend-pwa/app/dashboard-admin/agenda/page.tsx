"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

export default function AdminAgenda() {
  const router = useRouter();
  const [citas, setCitas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const cargarAgenda = async () => {
    try {
      const ip = window.location.hostname;
      const res = await fetchAuth(`${API_URL}/citas`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Mapeamos _id a id y ordenamos para mostrar las más recientes primero
        setCitas(data.map((c: any) => ({ ...c, id: c._id })).reverse());
      }
    } catch (e) {
      console.error("Error al cargar la agenda:", e);
    }
  };

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      router.push("/login");
      return;
    }
    cargarAgenda();
    }, []);

  // FUNCIÓN REAL PARA GUARDAR EL ESTADO EN MONGODB
  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const ip = window.location.hostname;
      const res = await fetchAuth(`${API_URL}/citas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (res.ok) {
        // Actualizamos el estado localmente para que se refleje al instante
        setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
        alert(`Cita actualizada exitosamente a: ${nuevoEstado.toUpperCase()}`);
      } else {
        alert("Error al actualizar la cita en la base de datos.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor backend.");
    }
  };

  const citasFiltradas = citas.filter(c => 
    (c.pacienteNombre && c.pacienteNombre.toLowerCase().includes(busqueda.toLowerCase())) ||
    (c.pacienteCorreo && c.pacienteCorreo.toLowerCase().includes(busqueda.toLowerCase())) ||
    (c.examen && c.examen.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 p-6 md:p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">AGENDA DEL LABORATORIO</h1>
          <p className="text-sm text-slate-400 mt-1">Historial completo de citas extraído directamente de la base de datos.</p>
        </div>

        <div className="mb-6">
          <input 
            type="text"
            placeholder="Buscar por nombre de paciente, correo o examen..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors shadow-md"
          />
        </div>

        <div className="space-y-4">
          {citasFiltradas.map((cita) => (
            <div key={cita.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
              <div>
                <h3 className="text-lg font-bold text-cyan-400 mb-1">{cita.pacienteNombre || cita.pacienteCorreo}</h3>
                <p className="text-sm text-slate-300">Examen: <strong className="text-slate-100">{cita.examen}</strong></p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Fecha: {cita.fecha} | Hora: {cita.hora} | ID: {cita.id}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {(!cita.estado || cita.estado === 'pendiente') ? (
                  <>
                    <button 
                      onClick={() => handleCambiarEstado(cita.id, 'confirmada')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg text-xs cursor-pointer shadow-md transition-colors"
                    >
                      APROBAR
                    </button>
                    <button 
                      onClick={() => handleCambiarEstado(cita.id, 'cancelada')}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-5 rounded-lg text-xs cursor-pointer shadow-md transition-colors"
                    >
                      RECHAZAR
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      cita.estado?.toLowerCase() === 'confirmada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 
                      cita.estado?.toLowerCase() === 'completada' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {cita.estado}
                    </div>
                    {cita.estado?.toLowerCase() === 'confirmada' && (
                      <button 
                        onClick={() => {
                          if (confirm('¿Estás seguro de cancelar esta cita? El agente notificará al paciente inmediatamente.')) {
                            handleCambiarEstado(cita.id, 'cancelada');
                          }
                        }}
                        className="bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow-md transition-colors border border-slate-600 hover:border-rose-500"
                        title="Cancelar cita confirmada"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {citasFiltradas.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-500">No se encontraron citas registradas.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}