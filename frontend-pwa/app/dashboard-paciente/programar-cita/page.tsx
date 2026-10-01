"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";

const CATALOGO_EXAMENES = [
  "Análisis de Sangre (Rutina)",
  "Detección Molecular (PCR)",
  "Análisis de Orina (Completo)",
  "Perfil Lipídico",
  "Prueba de Tolerancia a la Glucosa"
];

export default function ProgramarCita() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userEmail, setUserEmail] = useState("Cargando...");
  const [userName, setUserName] = useState("Cargando...");

  const [formData, setFormData] = useState({ examen: CATALOGO_EXAMENES[0], fecha: "", hora: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  // Paneles de control de errores
  const [panelConflictoHorario, setPanelConflictoHorario] = useState(false);
  const [panelMismoDia, setPanelMismoDia] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [sugerenciaIA, setSugerenciaIA] = useState<string>("08:00");
  const [citaDuplicadaInfo, setCitaDuplicadaInfo] = useState<any>(null);

  // Estados del Agente IA Optimizador
  const [mensajeIA, setMensajeIA] = useState("Selecciona un estudio y una fecha para buscar un espacio libre en la agenda.");
  const [horarioProactivo, setHorarioProactivo] = useState<string | null>(null);

  // Múltiples recomendaciones clínicas detalladas (incluyendo alcohol y preparación previa)
  const [recomendacionesIA, setRecomendacionesIA] = useState<string[]>([]);

  const [fechaMinima, setFechaMinima] = useState("");

  useEffect(() => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    setFechaMinima(`${yyyy}-${mm}-${dd}`);

    const correoGuardado = localStorage.getItem('pacienteEmail');
    const nombreGuardado = localStorage.getItem('pacienteName');

    if (correoGuardado && correoGuardado !== "undefined") {
      setUserEmail(correoGuardado);
      setUserName(nombreGuardado || "Paciente Registrado");
    } else {
      router.push("/login");
    }
  }, []);

  // 🧠 IA PROACTIVA: Genera recomendaciones clínicas incluyendo restricciones de alcohol y tiempos
  useEffect(() => {
    let recs: string[] = [];

    if (formData.examen.includes("Lipídico")) {
      recs = [
        "🚫 72 horas antes (3 días): Evita por completo el consumo de bebidas alcohólicas, ya que alteran gravemente los triglicéridos y el colesterol.",
        "🍽️ Días previos: Mantén una dieta equilibrada, evitando comidas excesivamente grasosas o pesadas.",
        "🌙 Noche anterior: Ayuno estricto de 12 a 14 horas obligatorias (solo ingesta de agua natural permitida).",
        "👕 Al acudir a la clínica: Viste ropa cómoda con mangas holgadas y trae tu cédula de identidad."
      ];
    } else if (formData.examen.includes("Glucosa")) {
      recs = [
        "🚫 48 horas antes: Suspende el consumo de bebidas alcohólicas y azúcares refinados para prevenir falsos picos glucémicos.",
        "🌙 Noche anterior: Ayuno obligatorio de 8 a 10 horas antes de presentarse al laboratorio.",
        "🚫 Restricciones: No consumas café, chicles ni realices ejercicio intenso antes de la prueba.",
        "🆔 Documentación: Presenta tu documento de identidad en recepción."
      ];
    } else if (formData.examen.includes("Sangre")) {
      recs = [
        "🚫 24 a 48 horas antes: Evita la ingesta de alcohol para no alterar los parámetros hematológicos ni hepáticos.",
        "🌙 Noche anterior: Ayuno recomendado de 8 horas para garantizar precisión analítica.",
        "💧 Hidratación: Puedes beber agua pura en moderación si tienes sed.",
        "🆔 Documentación: Ten lista tu cédula de identidad para el registro de admisión."
      ];
    } else if (formData.examen.includes("PCR")) {
      recs = [
        "🚫 24 horas antes: Evita el consumo de alcohol y tabaco para prevenir irritaciones en la mucosa respiratoria.",
        "🧬 2 horas antes: No consumas alimentos, líquidos, chicles ni realices enjuagues bucales.",
        "😷 Bioseguridad: Acude obligatoriamente con barbijo y mantén distanciamiento en sala de espera.",
        "🆔 Documentación: Presenta tu identificación personal al ingresar al cubículo."
      ];
    } else if (formData.examen.includes("Orina")) {
      recs = [
        "🚫 24 horas antes: Cero consumo de bebidas alcohólicas y alimentos con pigmentos fuertes (como remolacha).",
        "🧴 Higiene previa: Realiza un aseo genital externo adecuado antes de recolectar la muestra.",
        "🧬 Técnica de recolección: Desecha el primer chorro de orina y recolecta únicamente el chorro medio en el frasco estéril.",
        "🆔 Documentación: Entrega el frasco rotulado junto con tu cédula de identidad."
      ];
    } else {
      recs = [
        "🚫 24 horas antes: Evita el consumo de alcohol para asegurar condiciones basales óptimas.",
        "🌙 Noche anterior: Descansa al menos 8 horas y evita situaciones de estrés extremo.",
        "🆔 Documentación: Trae tu cédula de identidad y llega 10 minutos antes de tu turno."
      ];
    }

    setRecomendacionesIA(recs);

    if (!formData.fecha) {
      setMensajeIA(`Estudio seleccionado: ${formData.examen}. Selecciona una fecha para buscar el horario ideal.`);
      setHorarioProactivo(null);
      return;
    }

    setMensajeIA("🤖 Analizando agenda del laboratorio y calculando el turno óptimo...");

    const calcularDisponibilidad = async () => {
      try {
        let horaIdeal = "08:00";
        if (formData.examen.includes("Sangre") || formData.examen.includes("Lipídico") || formData.examen.includes("Glucosa")) {
          horaIdeal = "07:15";
        } else if (formData.examen.includes("PCR")) {
          horaIdeal = "09:30";
        } else if (formData.examen.includes("Orina")) {
          horaIdeal = "08:45";
        }

        const ipActual = window.location.hostname;
        const respuesta = await fetchAuth(`${API_URL}/citas`);
        let citasOcupadas = [];
        if (respuesta.ok) {
          const todasLasCitas = await respuesta.json();
          citasOcupadas = todasLasCitas.filter((c: any) => c.fecha === formData.fecha && c.estado !== 'cancelada');
        }

        const aMinutos = (h: string) => { const [horas, mins] = h.split(':').map(Number); return horas * 60 + mins; };
        const minAHoras = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

        let minActual = aMinutos(horaIdeal);
        let libre = false;
        let horaSugeridaFinal = horaIdeal;

        while (!libre && minActual < 18 * 60) {
          horaSugeridaFinal = minAHoras(minActual);
          const conflicto = citasOcupadas.some((c: any) => Math.abs(aMinutos(c.hora) - minActual) < 30);
          if (!conflicto) {
            libre = true;
          } else {
            minActual += 30;
          }
        }

        setHorarioProactivo(horaSugeridaFinal);
        setMensajeIA(`Para el ${formData.fecha}, el agente IA sugiere agendar a las ${horaSugeridaFinal} por menor congestión.`);

      } catch (error) {
        console.error(error);
        setHorarioProactivo("08:00");
      }
    };

    const timer = setTimeout(() => { calcularDisponibilidad(); }, 500);
    return () => clearTimeout(timer);
  }, [formData.fecha, formData.examen]);

  const handleProgramar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPanelConflictoHorario(false);
    setPanelMismoDia(false);
    setErrorValidacion(null);

    if (formData.hora < "08:00" || formData.hora > "18:00") {
      setErrorValidacion("El horario de atención es estrictamente de 08:00 a 18:00 hrs.");
      setIsSubmitting(false);
      return;
    }

    const correoExacto = localStorage.getItem('pacienteEmail');
    const nombreExacto = localStorage.getItem('pacienteName');

    if (!correoExacto) {
      setIsSubmitting(false);
      return;
    }

    try {
      const ipActual = window.location.hostname;
      const respuesta = await fetchAuth(`${API_URL}/citas/nueva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteCorreo: correoExacto,
          pacienteNombre: nombreExacto,
          examen: formData.examen,
          fecha: formData.fecha,
          hora: formData.hora,
          estado: "pendiente"
        })
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        setMostrarExito(true);
      } else if (respuesta.status === 409 || respuesta.status === 400) {
        if (data.tipoError === 'DUPLICADO_DIA') {
          setCitaDuplicadaInfo(data.citaExistente);
          setPanelMismoDia(true);
        } else if (data.tipoError === 'FECHA_PASADA') {
          alert("❌ No puedes programar citas en fechas pasadas.");
        } else if (data.tipoError === 'HORA_PASADA') {
          setSugerenciaIA(data.sugerencia || "09:00");
          setPanelConflictoHorario(true);
        } else {
          setSugerenciaIA(data.sugerencia || "09:00");
          setPanelConflictoHorario(true);
        }
      } else {
        setSugerenciaIA("09:00");
        setPanelConflictoHorario(true);
      }
    } catch (error) {
      console.error(error);
      setSugerenciaIA("09:00");
      setPanelConflictoHorario(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">

      <aside className={`${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'} transition-all bg-slate-800 border-r border-slate-700 flex flex-col z-30 shrink-0 h-full whitespace-nowrap`}>
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
          <Link href="/dashboard-paciente" className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"><span className="text-lg">🏠</span> Dashboard Principal</Link>
          <Link href="/dashboard-paciente/programar-cita" className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 text-sm"><span className="text-lg">📅</span> Programar Cita</Link>
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

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-900 p-4 md:p-8">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-lg">
            <h1 className="text-lg font-bold text-slate-100 uppercase mb-6">Programar Reserva Biológica</h1>

            {errorValidacion && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 text-rose-300 text-sm flex items-center gap-3">
                <span className="text-2xl">⏰</span>
                <p>{errorValidacion}</p>
              </div>
            )}

            {panelMismoDia && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/40 rounded-xl p-5 text-rose-200">
                <div className="flex items-center gap-2 mb-2 font-bold text-rose-400 text-base"><span>📅</span><p>Cita activa en esta fecha</p></div>
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  Ya cuentas con un turno para <strong className="text-white">{citaDuplicadaInfo?.examen}</strong> a las <strong className="text-cyan-400 font-mono">{citaDuplicadaInfo?.hora}</strong>. Edita tu cita actual si deseas modificarla.
                </p>
                <div className="flex gap-3 mt-4">
                  <Link href="/dashboard-paciente/resultados" className="flex-1 text-center bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-2.5 px-4 rounded-lg text-xs uppercase transition-colors">Ir a Editar Cita</Link>
                  <button type="button" onClick={() => setPanelMismoDia(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer">Elegir otra fecha</button>
                </div>
              </div>
            )}

            {panelConflictoHorario && (
              <div className="mb-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-amber-300">
                <div className="flex items-center gap-2 mb-1 font-bold"><span>⚠️</span><p>Horario ocupado</p></div>
                <p className="text-xs text-slate-300 mb-3">La hora choca con otro turno. La IA sugiere programar a las <strong className="text-cyan-400 font-mono text-sm">{sugerenciaIA}</strong>.</p>
                <button type="button" onClick={() => { setFormData({ ...formData, hora: sugerenciaIA }); setPanelConflictoHorario(false); }} className="bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-2 px-4 rounded-lg text-xs uppercase cursor-pointer transition-colors">
                  Aplicar hora sugerida ({sugerenciaIA})
                </button>
              </div>
            )}

            <form onSubmit={handleProgramar} className="space-y-6">
              <div>
                <label className="block text-slate-400 text-xs mb-2 uppercase tracking-widest">Tipo de Estudio Biológico</label>
                <select value={formData.examen} onChange={(e) => setFormData({ ...formData, examen: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none">
                  {CATALOGO_EXAMENES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 text-xs mb-2 uppercase tracking-widest">Fecha Requerida</label>
                  <input type="date" required min={fechaMinima} value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-2 uppercase tracking-widest">Hora (08:00 a 18:00)</label>
                  <input type="time" required min="08:00" max="18:00" value={formData.hora} onChange={(e) => setFormData({ ...formData, hora: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-slate-900 font-bold py-4 rounded-lg shadow-lg cursor-pointer">
                {isSubmitting ? "VERIFICANDO..." : "CONFIRMAR RESERVA"}
              </button>
            </form>
          </div>

          {/* 🤖 AGENTE IA CON PROTOCOLO CLÍNICO Y RESTRICCIONES DE ALCOHOL 🤖 */}
          <div className="lg:col-span-2 bg-slate-800 border border-cyan-500/30 rounded-xl p-6 shadow-xl flex flex-col space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-bold text-cyan-400 text-sm">Agente IA Optimizador</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Protocolo Médico Preventivo</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{mensajeIA}</p>

            {/* LISTA DE MÚLTIPLES RECOMENDACIONES CLÍNICAS */}
            {recomendacionesIA.length > 0 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> Guía de Preparación y Asistencia:
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  {recomendacionesIA.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-cyan-400 font-bold shrink-0 mt-0.5">▸</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {horarioProactivo && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hora: horarioProactivo })}
                className="w-full bg-slate-900 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 font-bold py-2.5 px-4 rounded-lg text-xs uppercase cursor-pointer transition-colors"
              >
                Aplicar hora sugerida ({horarioProactivo})
              </button>
            )}
          </div>

        </div>
      </main>

      {/* MODAL ÉXITO */}
      {mostrarExito && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30"><span className="text-4xl text-emerald-400">✓</span></div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Reserva Confirmada</h2>
            <p className="text-slate-400 mb-6 text-sm">El Agente IA ha optimizado tu turno de manera silenciosa.</p>
            <Link href="/dashboard-paciente/resultados" className="block w-full text-center bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 rounded-lg text-sm">VER MIS CITAS</Link>
          </div>
        </div>
      )}
    </div>
  );
}