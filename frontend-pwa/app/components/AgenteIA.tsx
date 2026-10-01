"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { fetchAuth } from "../utils/fetchAuth";
import { API_URL } from "../utils/api";

// ─── TIPOS ───────────────────────────────────────────────
type Rol = "paciente" | "admin";

type Mensaje = {
  id: number;
  de: "usuario" | "agente";
  texto: string;
  hora: string;
  tipo?: "normal" | "opciones" | "fecha" | "hora" | "confirmacion" | "exito" | "error";
  opciones?: string[];
  dataCita?: CitaForm;
  pensamiento?: string; // razonamiento interno de AIDA
};

type CitaForm = {
  examen: string;
  fecha: string;
  hora: string;
};

type FlujoCita =
  | "idle"
  | "esperando_examen"
  | "esperando_fecha"
  | "esperando_hora"
  | "confirmando"
  | "creando";

type Notificacion = {
  id: number;
  tipo: string;
  mensaje: string;
  hora: string;
  leida: boolean;
};

type LogAgente = {
  _id: string;
  fecha: string;
  accion: string;
  descripcion: string;
  citasNotificadas: number;
  resultado: string;
  createdAt: string;
};

type MoodAgente = "idle" | "thinking" | "happy" | "health" | "confirm" | "alert";

const EXAMENES = [
  "Análisis de Sangre (Rutina)",
  "Detección Molecular (PCR)",
  "Análisis de Orina (Completo)",
  "Perfil Lipídico",
  "Prueba de Tolerancia a la Glucosa",
];

const FRASES_PENSANDO = [
  "Analizando tu mensaje...",
  "Procesando con mis algoritmos...",
  "Revisando el historial...",
  "Formulando la mejor respuesta...",
  "Consultando mi base de conocimiento...",
  "Razonando sobre tu consulta...",
];

// ─── AVATAR AIDA ─────────────────────────────────────────
function AvatarAIDA({ mood, size = "md" }: { mood: MoodAgente; size?: "sm" | "md" | "lg" }) {
  const emoji: Record<MoodAgente, string> = {
    idle: "🤖",
    thinking: "🧠",
    happy: "✨",
    health: "🩺",
    confirm: "✅",
    alert: "⚠️",
  };
  const sizeClass = {
    sm: "w-7 h-7 text-sm",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl",
  }[size];

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br from-cyan-600/30 to-violet-600/30 border border-cyan-500/40 rounded-full flex items-center justify-center shrink-0`}
      style={{ animation: mood === "thinking" ? "pulse-brain 1s ease-in-out infinite" : "float 4s ease-in-out infinite" }}
    >
      {emoji[mood]}
    </div>
  );
}

// ─── PANEL DE PENSAMIENTO ─────────────────────────────────
function PanelPensamiento({ visible }: { visible: boolean }) {
  const [fraseIdx, setFraseIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setFraseIdx(0);
    const intervalo = setInterval(() => {
      setFraseIdx((i) => (i + 1) % FRASES_PENSANDO.length);
    }, 1400);
    return () => clearInterval(intervalo);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex gap-2 items-start" style={{ animation: "fadeIn 0.3s ease-out" }}>
      <AvatarAIDA mood="thinking" size="sm" />
      <div className="bg-slate-800/80 border border-violet-500/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                style={{ animationDelay: `${d * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-widest">
            AIDA pensando
          </span>
        </div>
        <p
          className="text-[11px] text-slate-400 italic"
          style={{ animation: "fadeIn 0.4s ease-out", key: fraseIdx } as any}
        >
          💭 {FRASES_PENSANDO[fraseIdx]}
        </p>
      </div>
    </div>
  );
}

// ─── BURBUJA DE PENSAMIENTO REAL ─────────────────────────────────
// Muestra el razonamiento interno real de AIDA (chain-of-thought)
function BurbujaRazonamiento({ pensamiento }: { pensamiento: string }) {
  const [expandido, setExpandido] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setExpandido(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex gap-2 items-start" style={{ animation: "fadeIn 0.4s ease-out" }}>
      <div className="w-7 h-7 shrink-0 bg-violet-600/20 border border-violet-500/40 rounded-full flex items-center justify-center text-sm mt-1">
        💭
      </div>
      <div className="max-w-[85%]">
        <button
          onClick={() => setExpandido(!expandido)}
          className="flex items-center gap-2 text-[10px] text-violet-400 font-bold uppercase tracking-widest mb-1 hover:text-violet-300 transition-colors"
        >
          <span style={{ animation: expandido ? "none" : "none" }}>👁</span>
          Pensamiento interno de AIDA
          <span className="text-violet-500">{expandido ? "▲" : "▼"}</span>
        </button>
        {expandido && (
          <div
            className="bg-violet-950/50 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3"
            style={{ animation: "fadeIn 0.3s ease-out" }}
          >
            <p className="text-[11px] text-violet-300/80 italic leading-relaxed">{pensamiento}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RENDER DE MARKDOWN SIMPLE ───────────────────────────
function TextoAgente({ texto }: { texto: string }) {
  // Procesar negrita **texto** y saltos de línea
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-xs leading-relaxed whitespace-pre-wrap">
      {partes.map((parte, i) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i} className="text-white font-semibold">{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
    </p>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
export default function AgenteIA({ rol }: { rol: Rol }) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"chat" | "notifs" | "actividad">("chat");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [historial, setHistorial] = useState<Array<{ de: string; texto: string }>>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mood, setMood] = useState<MoodAgente>("idle");
  const [flujo, setFlujo] = useState<FlujoCita>("idle");
  const [citaForm, setCitaForm] = useState<Partial<CitaForm>>({});
  const [horariosDisp, setHorariosDisp] = useState<string[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [logsAgente, setLogsAgente] = useState<LogAgente[]>([]);
  const [pulsando, setPulsando] = useState(false);
  const [notifNueva, setNotifNueva] = useState(false);
  const [inputFecha, setInputFecha] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  // Sesión única de chat (para memoria multi-turno)
  const sessionId = useRef<string>(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const hoy = new Date().toISOString().split("T")[0];

  // ─── INIT ──────────────────────────────────────────────
  useEffect(() => {
    setMensajes([]);
  }, [rol]);

  // ─── WEBSOCKET ─────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const correoActual = typeof window !== "undefined" ? localStorage.getItem("pacienteEmail") : "";

    const esParaMi = (d: any) => {
      if (rol === "admin") return true; // Admin ve todo
      if (d?.cita?.pacienteCorreo) return d.cita.pacienteCorreo === correoActual;
      if (d?.pacienteCorreo) return d.pacienteCorreo === correoActual;
      return false;
    };

    const agregarNotif = (tipo: string, mensaje: string) => {
      setNotificaciones((p) =>
        [{ id: idRef.current++, tipo, mensaje, hora: hora(), leida: false }, ...p].slice(0, 30)
      );
      setNotifNueva(true);
      setPulsando(true);
      setTimeout(() => setPulsando(false), 2000);
    };

    socket.on("agente:nuevaCita", (d: any) => {
      if (esParaMi(d)) agregarNotif("NUEVA_CITA", d.mensaje);
    });
    socket.on("agente:recordatorio", (d: any) => {
      if (esParaMi(d)) agregarNotif("RECORDATORIO", d.mensaje);
    });
    socket.on("agente:estadoCita", (d: any) => {
      if (esParaMi(d)) agregarNotif("ESTADO", d.mensaje);
    });
    socket.on("citaActualizada", (c: any) => {
      if (esParaMi(c)) agregarNotif("ACTUALIZACION", `Cita actualizada: ${c.examen} → ${c.estado}`);
    });

    return () => { socket.disconnect(); };
  }, []);

  // ─── AUTO-SCROLL ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  // ─── CARGAR LOGS ───────────────────────────────────────
  const cargarLogs = async () => {
    try {
      const res = await fetchAuth(`${API_URL}/agente-ia/logs`);
      if (res.ok) setLogsAgente(await res.json());
    } catch (error) {
      console.error("Error al cargar logs del agente", error);
    }
  };

  const ejecutarRecordatoriosManual = async () => {
    try {
      setCargando(true);
      const res = await fetchAuth(`${API_URL}/agente-ia/ejecutar-recordatorios`, { method: "POST" });
      if (res.ok) await cargarLogs();
    } catch (error) {
      console.error("Error al ejecutar recordatorios", error);
    } finally {
      setCargando(false);
    }
  };

  // ─── HELPERS ───────────────────────────────────────────
  const hora = () =>
    new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });

  const agente = (texto: string, tipo: Mensaje["tipo"] = "normal", extras?: Partial<Mensaje>): Mensaje => ({
    id: idRef.current++,
    de: "agente",
    texto,
    hora: hora(),
    tipo,
    ...extras,
  });

  const usuario = (texto: string): Mensaje => ({
    id: idRef.current++,
    de: "usuario",
    texto,
    hora: hora(),
  });

  const push = (...msgs: Mensaje[]) => setMensajes((p) => [...p, ...msgs]);

  // Agrega al historial de contexto (para enviar al backend)
  const addHistorial = (de: string, texto: string) => {
    setHistorial((h) => [...h, { de, texto }].slice(-12));
  };

  // ─── HORARIOS DISPONIBLES ──────────────────────────────
  const calcularHorariosLibres = async (fecha: string): Promise<string[]> => {
    try {
      const res = await fetchAuth(`${API_URL}/citas`);
      const todas = await res.json();
      const ocupadas: number[] = todas
        .filter((c: any) => c.fecha === fecha && c.estado !== "cancelada")
        .map((c: any) => {
          const [h, m] = c.hora.split(":").map(Number);
          return h * 60 + m;
        });

      const libres: string[] = [];
      for (let min = 8 * 60; min < 18 * 60; min += 30) {
        const conflicto = ocupadas.some((o) => Math.abs(o - min) < 30);
        if (!conflicto) {
          const h = Math.floor(min / 60).toString().padStart(2, "0");
          const m = (min % 60).toString().padStart(2, "0");
          libres.push(`${h}:${m}`);
          if (libres.length >= 8) break;
        }
      }
      return libres;
    } catch {
      return ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    }
  };

  // ─── CREAR CITA ────────────────────────────────────────
  const crearCita = async (form: CitaForm) => {
    setFlujo("creando");
    setMood("confirm");
    const correo = localStorage.getItem("pacienteEmail") ?? "";
    const nombre = localStorage.getItem("pacienteName") ?? "";

    try {
      const res = await fetchAuth(`${API_URL}/citas/nueva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteCorreo: correo,
          pacienteNombre: nombre,
          examen: form.examen,
          fecha: form.fecha,
          hora: form.hora,
          estado: "pendiente",
        }),
      });

      if (res.ok) {
        push(
          agente(
            `✅ **¡Cita confirmada!**\n\n📋 **${form.examen}**\n📆 ${form.fecha}\n🕐 ${form.hora}\n\nRecibirás una confirmación por correo electrónico. ¡Hasta pronto! 😊`,
            "exito"
          )
        );
        setMood("happy");
        setTimeout(() => setMood("idle"), 3000);
        setFlujo("idle");
        setCitaForm({});
      } else {
        const data = await res.json();
        setMood("alert");
        if (data.tipoError === "DUPLICADO_DIA") {
          push(
            agente(
              `⚠️ Ya tienes una cita activa para el **${form.fecha}**. Por favor elige otra fecha:`,
              "fecha"
            )
          );
          setFlujo("esperando_fecha");
        } else if (data.tipoError === "HORARIO_OCUPADO") {
          push(
            agente(
              `⚠️ El horario **${form.hora}** ya está ocupado. Te sugiero las **${data.sugerencia}**. ¿Quieres usar ese horario?`,
              "opciones",
              { opciones: [`Sí, usar ${data.sugerencia}`, "Elegir otro horario"] }
            )
          );
          setFlujo("esperando_hora");
          setCitaForm((p) => ({ ...p }));
          setHorariosDisp([data.sugerencia]);
        } else if (data.tipoError === "FECHA_PASADA") {
          push(agente(`⚠️ No puedes elegir una fecha en el pasado. Por favor elige una fecha válida:`, "fecha"));
          setFlujo("esperando_fecha");
        } else if (data.tipoError === "HORA_PASADA") {
          push(agente(`⚠️ La hora que elegiste ya pasó el día de hoy. Por favor elige otro horario:`, "opciones", { opciones: horariosDisp }));
          setFlujo("esperando_hora");
        } else {
          push(agente("❌ Hubo un error al crear la cita. Por favor intenta de nuevo.", "error"));
          setFlujo("idle");
          setCitaForm({});
          setTimeout(() => setMood("idle"), 2000);
        }
      }
    } catch {
      push(agente("❌ No pude conectarme con el servidor. Verifica que el sistema esté activo.", "error"));
      setFlujo("idle");
      setCitaForm({});
      setMood("idle");
    }
  };

  // ─── INICIAR FLUJO DE CITA ─────────────────────────────
  const iniciarFlujoCita = (mostrarSaludo = true) => {
    setMood("health");
    if (mostrarSaludo) {
      push(agente("¡Perfecto! Te ayudo a programar tu cita 🩺\n\n**¿Qué tipo de estudio necesitas?**", "opciones", { opciones: EXAMENES }));
    } else {
      push(agente("**¿Qué tipo de estudio necesitas?**", "opciones", { opciones: EXAMENES }));
    }
    setFlujo("esperando_examen");
    setCitaForm({});
  };

  // ─── MANEJAR SELECCIÓN DE OPCIÓN (botones) ─────────────
  const handleOpcion = async (opcion: string) => {
    push(usuario(opcion));

    if (flujo === "confirmando") {
      if (opcion === "✅ Confirmar cita") {
        const form = citaForm as CitaForm;
        push(agente("⏳ Registrando tu cita..."));
        await crearCita(form);
      } else if (opcion === "❌ Cancelar") {
        setFlujo("idle");
        setCitaForm({});
        setMood("idle");
        push(agente("Cita cancelada. ¿Puedo ayudarte con algo más? 😊"));
      } else if (opcion === "✏️ Cambiar horario") {
        setFlujo("esperando_hora");
        push(agente("Claro, selecciona un nuevo horario:", "opciones", { opciones: horariosDisp }));
      }
    } else {
      await enviarAlBackend(opcion);
    }
  };

  // ─── MANEJAR FECHA ─────────────────────────────────────
  const handleFecha = async (fecha: string) => {
    if (!fecha) return;
    setInputFecha("");
    push(usuario(`📆 ${fecha}`));
    await enviarAlBackend(fecha);
  };

  // ─── ENVIAR AL BACKEND (chat inteligente AIDA con razonamiento) ──
  const enviarAlBackend = async (texto: string) => {
    setCargando(true);
    setMood("thinking");
    const correo = localStorage.getItem("pacienteEmail") ?? "";
    const nombre = localStorage.getItem("pacienteName") ?? "";

    // Snapshot del historial actual para enviarlo
    const historialSnapshot = [...historial, { de: "usuario", texto }].slice(-12);

    try {
      const res = await fetchAuth(`${API_URL}/agente-ia/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: texto,
          rol,
          sessionId: sessionId.current,
          pacienteCorreo: correo || undefined,
          nombrePaciente: nombre || undefined,
          historial: historialSnapshot,
        }),
      });
      const data = await res.json();
      setMood("happy");

      // Actualizar slots si vienen del NLU
      if (data.citaSlots) {
        setCitaForm(data.citaSlots);
      }

      // Procesar acciones del NLU
      if (data.accion) {
        if (data.accion === "PEDIR_EXAMEN") {
          setFlujo("esperando_examen");
          push(agente(data.respuesta, "opciones", {
            pensamiento: data.pensamiento || "",
            opciones: data.opcionesExamen || EXAMENES
          }));
        } else if (data.accion === "PEDIR_FECHA") {
          setFlujo("esperando_fecha");
          push(agente(data.respuesta, "fecha", {
            pensamiento: data.pensamiento || ""
          }));
        } else if (data.accion === "PEDIR_HORA") {
          setFlujo("esperando_hora");
          if (data.citaSlots?.fecha) {
             const libres = await calcularHorariosLibres(data.citaSlots.fecha);
             setHorariosDisp(libres);
             push(agente(data.respuesta, "opciones", {
               pensamiento: data.pensamiento || "",
               opciones: libres.length > 0 ? libres : ["No hay horarios libres"]
             }));
          } else {
             push(agente(data.respuesta, "normal", { pensamiento: data.pensamiento || "" }));
          }
        } else if (data.accion === "CONFIRMAR_CITA") {
          setFlujo("confirmando");
          push(agente(data.respuesta, "confirmacion", {
            pensamiento: data.pensamiento || "",
            dataCita: data.citaSlots as CitaForm
          }));
        }
      } else {
        // Respuesta normal sin acción específica
        push(agente(data.respuesta, "normal", {
          pensamiento: data.pensamiento || "",
        }));
      }

      // Actualizar historial de contexto
      setHistorial((h) => [
        ...h,
        { de: "usuario", texto },
        { de: "agente", texto: data.respuesta },
      ].slice(-12));

      setTimeout(() => setMood("idle"), 2500);
    } catch {
      setMood("alert");
      push(agente("Lo siento, no puedo conectarme al servidor en este momento. 🔌"));
      setTimeout(() => setMood("idle"), 2000);
    } finally {
      setCargando(false);
    }
  };


  // ─── ENVIAR MENSAJE TEXTO ──────────────────────────────
  const enviarMensaje = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;
    setInput("");
    push(usuario(texto));

    await enviarAlBackend(texto);
  };

  const notifsNoLeidas = notificaciones.filter((n) => !n.leida).length;

  // Estado en el header
  const estadoLabel: Record<MoodAgente, string> = {
    idle: "En línea · Lista para ayudarte",
    thinking: "💭 Procesando tu consulta...",
    happy: "✨ Respuesta lista",
    health: "🩺 Gestionando tu cita...",
    confirm: "⏳ Registrando cita...",
    alert: "⚠️ Atención requerida",
  };

  // ─── RENDER ────────────────────────────────────────────
  return (
    <>
      {abierto && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[380px] max-h-[620px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-700/80"
          style={{
            background: "linear-gradient(180deg, #0d1117 0%, #0f172a 100%)",
            animation: "slideUp 0.25s ease-out",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.1)",
          }}
        >
          {/* ── HEADER ── */}
          <div
            className="p-4 flex items-center gap-3 shrink-0 border-b border-slate-800"
            style={{ background: "linear-gradient(135deg, #0e7490 0%, #4f46e5 100%)" }}
          >
            <AvatarAIDA mood={mood} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-sm">AIDA</p>
                <span className="text-[9px] text-cyan-200/70 bg-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest font-medium">
                  Agente IA
                </span>
              </div>
              <p
                className="text-cyan-200 text-[10px] tracking-wide truncate"
                style={{ animation: "fadeIn 0.3s ease-out" }}
                key={mood}
              >
                {estadoLabel[mood]}
              </p>
            </div>
            <div className="flex gap-1 bg-black/20 rounded-lg p-1">
              <button
                onClick={() => setVista("chat")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${vista === "chat" ? "bg-white text-cyan-700" : "text-white/70 hover:text-white"}`}
              >
                Chat
              </button>
              <button
                onClick={() => { setVista("notifs"); setNotifNueva(false); setNotificaciones((p) => p.map((n) => ({ ...n, leida: true }))); }}
                className={`relative px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${vista === "notifs" ? "bg-white text-cyan-700" : "text-white/70 hover:text-white"}`}
              >
                {notifsNoLeidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center">
                    {notifsNoLeidas}
                  </span>
                )}
                🔔
              </button>
              {rol === "admin" && (
                <button
                  onClick={() => { setVista("actividad"); cargarLogs(); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${vista === "actividad" ? "bg-white text-cyan-700" : "text-white/70 hover:text-white"}`}
                >
                  📊
                </button>
              )}
            </div>
            <button onClick={() => setAbierto(false)} className="text-white/60 hover:text-white text-xl ml-1 transition-colors">✕</button>
          </div>

          {/* ── CHAT ── */}
          {vista === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
                {mensajes.map((msg, idx) => (
                  <>
                    {/* Mostrar pensamiento real de AIDA antes de la respuesta */}
                    {msg.de === "agente" && msg.pensamiento && (
                      <BurbujaRazonamiento key={`p-${msg.id}`} pensamiento={msg.pensamiento} />
                    )}
                    <BurbujaMensaje
                      key={msg.id}
                      msg={msg}
                      onOpcion={handleOpcion}
                      onFecha={handleFecha}
                      inputFecha={inputFecha}
                      setInputFecha={setInputFecha}
                      hoy={hoy}
                      isLast={idx === mensajes.length - 1}
                    />
                  </>
                ))}

                {/* Panel de pensamiento visible */}
                <PanelPensamiento visible={cargando} />

                <div ref={bottomRef} />
              </div>

              {/* Chips rápidos */}
              {flujo === "idle" && (
                <div className="px-3 pb-2 flex gap-2 overflow-x-auto shrink-0 border-t border-slate-800/50 pt-2">
                  {["📅 Programar cita", "⏰ Horarios", "🧪 Preparación", "📋 Mis citas"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="shrink-0 text-[11px] bg-slate-800/80 border border-slate-700/80 text-cyan-400 px-3 py-1.5 rounded-full hover:bg-cyan-900/30 hover:border-cyan-600 transition-all whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-slate-800 flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviarMensaje()}
                  placeholder={cargando ? "AIDA está pensando..." : flujo === "idle" ? "Pregúntale algo a AIDA..." : "Escribe o usa los botones de arriba..."}
                  disabled={cargando}
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none focus:border-cyan-500 focus:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={enviarMensaje}
                  disabled={cargando || !input.trim()}
                  className="w-9 h-9 bg-gradient-to-br from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 rounded-xl flex items-center justify-center transition-all shrink-0 text-white font-bold shadow-lg shadow-cyan-500/20"
                >
                  ➤
                </button>
              </div>
            </>
          )}

          {/* ── NOTIFICACIONES ── */}
          {vista === "notifs" && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500">
                  <span className="text-4xl mb-3">🔕</span>
                  <p className="text-sm">Sin notificaciones aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {notificaciones.map((n) => (
                    <div key={n.id} className={`p-4 ${!n.leida ? "bg-cyan-500/5" : ""}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">
                          {{ NUEVA_CITA: "📅", RECORDATORIO: "🔔", ESTADO: "📋", ACTUALIZACION: "🔄" }[n.tipo] ?? "📋"}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-slate-300">{n.mensaje}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{n.hora}</p>
                        </div>
                        {!n.leida && <span className="w-2 h-2 bg-cyan-400 rounded-full shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVIDAD DEL AGENTE (Solo Admin) ── */}
          {vista === "actividad" && rol === "admin" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-slate-800 shrink-0 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-cyan-400">Log de Auditoría AIDA</p>
                  <p className="text-[10px] text-slate-500">Acciones del agente autónomo</p>
                </div>
                <button
                  onClick={ejecutarRecordatoriosManual}
                  disabled={cargando}
                  className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                >
                  {cargando ? "Ejecutando..." : "▶ Ejecutar Ahora"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {logsAgente.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500">
                    <span className="text-4xl mb-3">📊</span>
                    <p className="text-sm">Sin actividad registrada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {logsAgente.map((log) => (
                      <div key={log._id} className="p-4 hover:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              log.resultado === "exito"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : log.resultado === "sin_citas"
                                ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {log.accion}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.createdAt).toLocaleString("es-EC")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{log.descripcion}</p>
                        {log.citasNotificadas > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-400 font-medium">
                            <span>📧</span> {log.citasNotificadas} emails enviados
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTÓN FLOTANTE ── */}
      <button
        onClick={() => { setAbierto(!abierto); if (!abierto) setNotifNueva(false); }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95 relative"
        style={{
          background: "linear-gradient(135deg, #0e7490, #4f46e5)",
          boxShadow: "0 8px 30px rgba(6,182,212,0.35)",
          animation: pulsando ? "ping-once 0.6s ease-out" : "float 4s ease-in-out infinite",
        }}
        title="AIDA — Agente IA"
      >
        🤖
        {notifsNoLeidas > 0 && !abierto && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
            {notifsNoLeidas > 9 ? "9+" : notifsNoLeidas}
          </span>
        )}
      </button>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping-once { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(6,182,212,.7)} 70%{transform:scale(1.1);box-shadow:0 0 0 15px rgba(6,182,212,0)} 100%{transform:scale(1)} }
        @keyframes pulse-brain { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
      `}</style>
    </>
  );
}

// ─── BURBUJA DE MENSAJE ───────────────────────────────────
function BurbujaMensaje({
  msg, onOpcion, onFecha, inputFecha, setInputFecha, hoy, isLast,
}: {
  msg: Mensaje;
  onOpcion: (op: string) => void;
  onFecha: (fecha: string) => void;
  inputFecha: string;
  setInputFecha: (v: string) => void;
  hoy: string;
  isLast: boolean;
}) {
  const esUsuario = msg.de === "usuario";

  return (
    <div
      className={`flex ${esUsuario ? "justify-end" : "justify-start"} gap-2`}
      style={{ animation: isLast ? "fadeIn 0.3s ease-out" : "none" }}
    >
      {!esUsuario && (
        <div className="w-7 h-7 shrink-0 bg-gradient-to-br from-cyan-600/20 to-violet-600/20 border border-cyan-600/30 rounded-full flex items-center justify-center text-sm mt-1">
          🤖
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col gap-2 ${esUsuario ? "items-end" : "items-start"}`}>

        {/* Burbuja de texto */}
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            esUsuario
              ? "bg-gradient-to-br from-cyan-600 to-cyan-700 text-slate-900 rounded-tr-sm"
              : msg.tipo === "exito"
              ? "bg-emerald-600/15 border border-emerald-500/30 text-slate-200 rounded-tl-sm"
              : msg.tipo === "error"
              ? "bg-rose-600/15 border border-rose-500/30 text-slate-200 rounded-tl-sm"
              : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-sm"
          }`}
        >
          {esUsuario ? (
            <p className="text-xs leading-relaxed">{msg.texto}</p>
          ) : (
            <TextoAgente texto={msg.texto} />
          )}
          <p className={`text-[10px] mt-1 text-right ${esUsuario ? "text-cyan-900/60" : "text-slate-500"}`}>
            {msg.hora}
          </p>
        </div>

        {/* Botones de opciones */}
        {msg.tipo === "opciones" && msg.opciones && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.opciones.map((op) => (
              <button
                key={op}
                onClick={() => onOpcion(op)}
                className="text-[11px] bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-600/80 hover:border-cyan-500 text-cyan-400 px-3 py-1.5 rounded-full transition-all font-medium hover:scale-105 active:scale-95"
              >
                {op}
              </button>
            ))}
          </div>
        )}

        {/* Selector de fecha */}
        {msg.tipo === "fecha" && (
          <div className="flex gap-2 mt-1 w-full">
            <input
              type="date"
              min={hoy}
              value={inputFecha}
              onChange={(e) => setInputFecha(e.target.value)}
              className="flex-1 bg-slate-800/80 border border-slate-600 text-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
            <button
              onClick={() => inputFecha && onFecha(inputFecha)}
              disabled={!inputFecha}
              className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white disabled:text-slate-500 text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              OK
            </button>
          </div>
        )}

        {/* Tarjeta de confirmación */}
        {msg.tipo === "confirmacion" && msg.dataCita && (
          <div className="w-full bg-slate-800/80 border border-cyan-500/30 rounded-xl p-4 mt-1"
            style={{ boxShadow: "0 0 20px rgba(6,182,212,0.08)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                📋 Resumen de tu cita
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🧪</span>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">Estudio:</span>{" "}
                  <strong className="text-slate-100">{msg.dataCita.examen}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">📆</span>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">Fecha:</span>{" "}
                  <strong className="text-slate-100">{msg.dataCita.fecha}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">🕐</span>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">Hora:</span>{" "}
                  <strong className="text-cyan-400 font-mono text-sm">{msg.dataCita.hora}</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onOpcion("✅ Confirmar cita")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
              >
                ✅ Confirmar
              </button>
              <button
                onClick={() => onOpcion("✏️ Cambiar horario")}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
              >
                ✏️
              </button>
              <button
                onClick={() => onOpcion("❌ Cancelar")}
                className="bg-rose-900/50 hover:bg-rose-800 text-rose-400 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
              >
                ❌
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
