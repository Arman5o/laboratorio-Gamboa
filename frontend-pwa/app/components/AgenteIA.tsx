"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { fetchAuth } from "../utils/fetchAuth";
import { API_URL, conectarSocket } from "../utils/api";

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
  recomendaciones?: string[];
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

// ─── INDICADOR DE ESCRITURA ESTILO WHATSAPP ─────────────────
function IndicadorEscribiendo({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="flex gap-2 items-end mb-2" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className="w-7 h-7 shrink-0 bg-gradient-to-br from-cyan-600/20 to-violet-600/20 border border-cyan-600/30 rounded-full flex items-center justify-center text-sm mb-1">
        🤖
      </div>
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md flex items-center gap-2">
        <span className="text-[11px] text-cyan-300 font-medium">AIDA está escribiendo</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
              style={{
                animation: "whatsappBounce 1.2s infinite ease-in-out",
                animationDelay: `${d * 180}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RENDER DE MARKDOWN SIMPLE CON EFECTO TYPEWRITER ─────
function TextoAgente({ texto, animate }: { texto: string; animate?: boolean }) {
  const [displayedLen, setDisplayedLen] = useState(animate ? 0 : texto.length);
  const yaAnimado = useRef(false);

  useEffect(() => {
    if (!animate || yaAnimado.current) {
      setDisplayedLen(texto.length);
      return;
    }
    setDisplayedLen(0);
    let current = 0;
    const interval = setInterval(() => {
      // Revelado dinámico suave estilo chat
      current += 3;
      if (current >= texto.length) {
        current = texto.length;
        yaAnimado.current = true;
        clearInterval(interval);
      }
      setDisplayedLen(current);
    }, 12);
    return () => clearInterval(interval);
  }, [texto, animate]);

  const visibleText = texto.slice(0, displayedLen);
  // Procesar negrita **texto** y saltos de línea
  const partes = visibleText.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-xs leading-relaxed whitespace-pre-wrap">
      {partes.map((parte, i) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i} className="text-white font-semibold">{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
      {animate && !yaAnimado.current && displayedLen < texto.length && (
        <span
          className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 rounded-sm align-middle"
          style={{ animation: "typingCursor 0.6s infinite" }}
        />
      )}
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
  const [mounted, setMounted] = useState(false); // Para SSR safety con createPortal
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);

  // ─── DRAG & DROP ESTADOS ───
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({ startX: 0, startY: 0, initX: 0, initY: 0, isDragging: false, moved: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Deshabilitar arrastre en computadoras (>= 640px)
    if (window.innerWidth >= 640) return;

    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragPos.x,
      initY: dragPos.y,
      isDragging: true,
      moved: false,
    };
    dragRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging || !dragRef.current?.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;

    // Tolerancia de 15px para evitar clicks accidentales como drag (especial para trackpads de laptop)
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
      dragInfo.current.moved = true;
      setDragPos({ x: dragInfo.current.initX + dx, y: dragInfo.current.initY + dy });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragInfo.current.isDragging = false;
    if (dragRef.current?.hasPointerCapture(e.pointerId)) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }

    // Si soltamos el botón y no se movió más del threshold, es un click
    if (!dragInfo.current.moved) {
      setAbierto((prev) => {
        if (prev) setNotifNueva(false);
        return !prev;
      });
    }
    // Reseteamos el flag de moved por precaución
    dragInfo.current.moved = false;
  };

  // Sesión única de chat (para memoria multi-turno)
  const sessionId = useRef<string>(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const hoy = new Date().toISOString().split("T")[0];

  // ─── INIT ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true); // El portal solo se monta en el cliente
    setMensajes([]);
  }, [rol]);

  // Mantener el input de chat siempre enfocado para escribir sin tener que volver a hacer clic
  useEffect(() => {
    if (abierto && vista === "chat") {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [abierto, vista]);

  // ─── WEBSOCKET ─────────────────────────────────────────
  useEffect(() => {
    const socket = conectarSocket();
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

  // ─── AUTO-FOCUS INPUT ─────────────────────────────────
  useEffect(() => {
    if (abierto && vista === "chat" && !cargando) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [abierto, vista, cargando]);

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

  const calcularHorariosLibres = async (fecha: string, examen?: string): Promise<string[]> => {
    try {
      const res = await fetchAuth(`${API_URL}/citas`);
      const todas = await res.json();

      const ocupadas: number[] = todas
        .filter((c: any) => c.fecha === fecha && c.estado?.toLowerCase() !== "cancelada")
        .map((c: any) => {
          const [h, m] = c.hora.split(":").map(Number);
          return h * 60 + m;
        });

      const libres: string[] = [];
      const ahora = new Date();
      const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const esHoy = fecha === hoyStr;
      const minActual = ahora.getHours() * 60 + ahora.getMinutes() + 15;

      const [fAño, fMes, fDia] = fecha.split('-').map(Number);
      const esDomingo = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;

      const requiereAyuno = examen ? /sangre|lipid|lipíd|lipidico|glucosa|ayuno|hemograma|biometr/i.test(examen) : false;

      // Si es hoy, y el examen requiere ayuno, y ya pasó el mediodía: no hay horarios disponibles
      if (esHoy && requiereAyuno && minActual >= 12 * 60) {
        return [];
      }

      // Si es hoy domingo y ya pasó el mediodía (12:00): no hay horarios disponibles
      if (esHoy && esDomingo && minActual >= 12 * 60) {
        return [];
      }

      const rangos = (esDomingo && requiereAyuno)
        ? [{ inicio: 7 * 60 + 30, fin: 11 * 60 + 30 }]
        : esDomingo
        ? [{ inicio: 7 * 60 + 30, fin: 12 * 60 }]
        : requiereAyuno
        ? [{ inicio: 7 * 60 + 30, fin: 11 * 60 + 30 }]
        : [
          { inicio: 7 * 60 + 30, fin: 11 * 60 + 30 },
          { inicio: 14 * 60, fin: 18 * 60 }
        ];

      for (const rango of rangos) {
        for (let min = rango.inicio; min <= rango.fin; min += 30) {
          if (esHoy && min < minActual) continue;

          const conflicto = ocupadas.some((o) => Math.abs(o - min) < 30);
          if (!conflicto) {
            const h = Math.floor(min / 60).toString().padStart(2, "0");
            const m = (min % 60).toString().padStart(2, "0");
            libres.push(`${h}:${m}`);
          }
        }
      }

      // Filtrar para no mostrar exagerada cantidad de botones (máximo 5 opciones estratégicas)
      if (libres.length > 5) {
        const step = Math.floor(libres.length / 5);
        return libres.filter((_, i) => i % step === 0).slice(0, 5);
      }

      return libres;
    } catch {
      const [fAño, fMes, fDia] = fecha.split('-').map(Number);
      const esDom = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;
      return esDom ? ["07:30", "08:30", "09:30", "11:00"] : ["07:30", "08:00", "09:00", "14:00"];
    }
  };

  // ─── MODIFICAR CITA EXISTENTE EN LUGAR DE DUPLICAR ─────────────
  const modificarCitaExistente = async (idCita: string, form: CitaForm) => {
    // 0. Validación de horario de atención en el frontend
    const [fAño, fMes, fDia] = (form.fecha || "").split('-').map(Number);
    const esDomingo = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;
    const horaLimite = esDomingo ? "12:00" : "18:00";

    if (form.hora && (form.hora < "07:30" || form.hora > horaLimite)) {
      setMood("alert");
      const msgHorario = esDomingo
        ? `⚠️ Los domingos atendemos solo hasta medio día (**07:30 a 12:00 hrs**). La hora **${form.hora}** no está disponible.`
        : `⚠️ La hora **${form.hora}** está fuera del horario de atención del laboratorio (**07:30 a 18:00 hrs**).`;
      push(agente(msgHorario, "error"));
      setFlujo("idle");
      return;
    }

    setFlujo("creando");
    setMood("confirm");
    try {
      const res = await fetchAuth(`${API_URL}/citas/${idCita}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examen: form.examen,
          fecha: form.fecha,
          hora: form.hora,
        }),
      });

      if (res.ok) {
        push(
          agente(
            `✅ **¡Tu cita ha sido modificada exitosamente!**\n\n🔬 **${form.examen}**\n📆 **${form.fecha}**\n🕐 **${form.hora}**\n\nHemos actualizado tu reserva sin generar registros duplicados. 😊`,
            "exito"
          )
        );
        setMood("happy");
        setTimeout(() => setMood("idle"), 3000);
        setFlujo("idle");
        setCitaForm({});
      } else {
        const data = await res.json().catch(() => ({}));
        setMood("alert");
        push(
          agente(
            `⚠️ ${data.message || "No pudimos modificar la cita con esos datos. El horario podría estar en conflicto."}`,
            "error"
          )
        );
        setFlujo("idle");
      }
    } catch {
      push(agente("❌ Error de conexión al intentar actualizar la cita.", "error"));
      setFlujo("idle");
    }
  };

  // ─── CREAR O MODIFICAR CITA ────────────────────────────
  const crearCita = async (form: CitaForm) => {
    setFlujo("creando");
    setMood("confirm");
    const correo = localStorage.getItem("pacienteEmail") ?? "";
    const nombre = localStorage.getItem("pacienteName") ?? "";

    // 0. Validación de horario de atención en el frontend
    const [fAño, fMes, fDia] = (form.fecha || "").split('-').map(Number);
    const esDomingo = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;
    const horaLimite = esDomingo ? "12:00" : "18:00";

    if (form.hora < "07:30" || form.hora > horaLimite) {
      setMood("alert");
      const msgHorario = esDomingo
        ? `⚠️ Los domingos atendemos solo medio día (**07:30 a 12:00 hrs**). La hora **${form.hora}** no está disponible.`
        : `⚠️ La hora **${form.hora}** está fuera del horario de atención del laboratorio (**07:30 a 18:00 hrs**).`;
      const opciones = esDomingo
        ? ["07:30", "08:00", "09:00", "10:00", "11:00", "11:30"]
        : ["07:30", "08:00", "08:30", "09:00", "10:00", "14:00"];
      push(
        agente(
          `${msgHorario}\n\nTe sugiero agendar en un horario de atención válido. ¿Deseas elegir alguna de estas opciones?`,
          "opciones",
          { opciones }
        )
      );
      setFlujo("esperando_hora");
      return;
    }

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
        const recsTexto = form.recomendaciones && form.recomendaciones.length > 0
          ? `\n\n📋 **Previsiones para tu cita:**\n` + form.recomendaciones.map((r: string) => `• ${r}`).join('\n')
          : '';

        push(
          agente(
            `✅ **¡Cita confirmada!**\n\n🔬 **${form.examen}**\n📆 ${form.fecha}\n🕐 ${form.hora} hrs${recsTexto}\n\nRecibirás una confirmación por correo electrónico. ¡Hasta pronto! 😊`,
            "exito"
          )
        );
        setMood("happy");
        setTimeout(() => setMood("idle"), 3000);
        setFlujo("idle");
        setCitaForm({});

        // Sincronizar reinicio de slots en la sesión del backend
        fetchAuth(`${API_URL}/agente-ia/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensaje: "__CITA_REGISTRADA__",
            rol,
            sessionId: sessionId.current,
            pacienteCorreo: correo,
            nombrePaciente: nombre,
          }),
        }).catch(() => {});
      } else {
        const data = await res.json().catch(() => ({}));
        setMood("alert");
        if (data.tipoError === "DUPLICADO_DIA") {
          const citaExistente = data.citaExistente;
          push(
            agente(
              `⚠️ Ya tienes una cita programada para el **${form.fecha}** (${citaExistente?.examen || "Examen"} a las **${citaExistente?.hora || "horario agendado"}**).\n\n💡 **Sugerencia del Agente IA:** En lugar de crear una cita duplicada, ¿prefieres modificar la cita existente con este nuevo estudio/horario (**${form.examen} a las ${form.hora}**)?`,
              "opciones",
              {
                opciones: [
                  `🔄 Modificar cita existente (${form.hora})`,
                  "📅 Elegir otra fecha",
                  "❌ Cancelar"
                ],
                dataCita: { ...form, idCitaExistente: citaExistente?._id } as any
              }
            )
          );
          setFlujo("idle"); // Espera que el usuario elija la opción
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
          push(agente(`⚠️ La hora que elegiste ya pasó el día de hoy. Por favor elige otro horario dentro de las 07:30 a 18:00:`, "opciones", { opciones: horariosDisp }));
          setFlujo("esperando_hora");
        } else {
          push(agente(`❌ ${data.message || "Hubo un error al crear la cita. Por favor intenta de nuevo."}`, "error"));
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

    if (opcion.includes("Modificar cita existente") || opcion === "🔄 Modificar cita") {
      const form = citaForm as any;
      if (form?.idCitaExistente && form?.fecha && form?.hora) {
        push(agente("⏳ Actualizando tu cita..."));
        await modificarCitaExistente(form.idCitaExistente, form);
        return;
      } else {
        push(agente("¿Qué dato deseas modificar de tu cita? Selecciona una opción:", "opciones", {
          opciones: ["✏️ Cambiar horario", "📅 Elegir otra fecha", "❌ Cancelar cita"]
        }));
        return;
      }
    }

    if (opcion.includes("Ver mis resultados") || opcion.includes("Ver resultados")) {
      push(agente("📊 Tus análisis y reportes clínicos se encuentran listos para consultar o descargar en PDF en la sección **Resultados** de tu panel de paciente.\n\n¿Deseas acceder ahora a tus resultados?", "opciones", {
        opciones: ["📂 Ir a Resultados Clínicos", "📅 Programar nueva cita"]
      }));
      return;
    }

    if (opcion.includes("Ir a Resultados Clínicos")) {
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard-paciente/resultados";
      }
      return;
    }

    if (opcion.includes("Exámenes disponibles") || opcion.includes("Exámenes del laboratorio")) {
      push(agente("🔬 **Análisis clínicos que realizamos en el Laboratorio Gamboa:**\n\n• **Análisis de Sangre (Rutina)**\n• **Detección Molecular (PCR)**\n• **Análisis de Orina (Completo)**\n• **Perfil Lipídico**\n• **Prueba de Tolerancia a la Glucosa**\n\n¿Deseas programar una cita para alguno de estos estudios?", "opciones", {
        opciones: EXAMENES
      }));
      setFlujo("esperando_examen");
      return;
    }

    if (opcion.includes("Programar nueva cita") || opcion === "📅 Programar cita") {
      iniciarFlujoCita(true);
      return;
    }

    if (opcion.includes("Ver preparación")) {
      push(agente("📋 **Preparación para análisis de laboratorio:**\n\n• **Ayuno:** 8 a 12 horas para análisis de sangre, perfil lipídico o glucosa (solo agua permitida).\n• **Orina:** Primera muestra de la mañana en frasco estéril.\n• **Recomendación:** Evitar alcohol y comidas copiosas la noche anterior.\n• **Puntualidad:** Llegar 10 minutos antes con cédula de identidad."));
      return;
    }

    if (opcion.includes("Cancelar cita")) {
      try {
        const correo = localStorage.getItem("pacienteEmail") ?? "";
        const res = await fetchAuth(`${API_URL}/citas/paciente/${correo}`);
        if (res.ok) {
          const citas = await res.json();
          const hoyStr = new Date().toISOString().split('T')[0];
          const citaActiva = citas.find((c: any) => c.fecha >= hoyStr && c.estado !== 'cancelada');
          if (citaActiva) {
            await fetchAuth(`${API_URL}/citas/${citaActiva._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ estado: "cancelada" }),
            });
            push(agente(`Tu cita para **${citaActiva.examen}** ha sido cancelada correctamente. ¿Deseas programar una nueva cita?`, "opciones", {
              opciones: ["📅 Programar cita", "⏰ Horarios"]
            }));
            setFlujo("idle");
            setCitaForm({});
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      push(agente("Tu cita ha sido cancelada. ¿Puedo ayudarte con algo más? 😊"));
      setFlujo("idle");
      setCitaForm({});
      return;
    }

    if (opcion === "📅 Elegir otra fecha") {
      push(agente("Selecciona una nueva fecha:", "fecha"));
      setFlujo("esperando_fecha");
      return;
    }

    if (opcion === "✏️ Cambiar horario") {
      setFlujo("esperando_hora");
      const fechaParaHorarios = citaForm.fecha || new Date().toISOString().split('T')[0];
      const libres = await calcularHorariosLibres(fechaParaHorarios, citaForm.examen);
      setHorariosDisp(libres);
      const [fAño, fMes, fDia] = fechaParaHorarios.split('-').map(Number);
      const esDom = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;
      push(agente(`Selecciona un nuevo horario disponible dentro de nuestra atención (${esDom ? "07:30 a 12:00" : "07:30 a 18:00"}):`, "opciones", { opciones: libres }));
      return;
    }

    // Manejar 'Sí, para mañana' / 'Agendar para mañana'
    if (opcion.includes("para mañana") || opcion.includes("Agendar para mañana")) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const fechaManana = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
      push(usuario(`📆 ${fechaManana}`));
      await enviarAlBackend(fechaManana);
      return;
    }

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
        const [fAño, fMes, fDia] = (citaForm.fecha || "").split('-').map(Number);
        const esDom = (fAño && fMes && fDia) ? new Date(fAño, fMes - 1, fDia).getDay() === 0 : false;
        push(agente(`Claro, selecciona un nuevo horario dentro del horario de atención (${esDom ? "07:30 a 12:00" : "07:30 a 18:00"}):`, "opciones", { opciones: horariosDisp }));
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
        setCitaForm({
          ...data.citaSlots,
          recomendaciones: data.recomendaciones || data.citaSlots.recomendaciones
        });
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
            const libres = await calcularHorariosLibres(data.citaSlots.fecha, data.citaSlots.examen);
            setHorariosDisp(libres);
            push(agente(data.respuesta, "opciones", {
              pensamiento: data.pensamiento || "",
              opciones: libres.length > 0 ? libres : ["No hay horarios libres para este examen"]
            }));
          } else {
            push(agente(data.respuesta, "normal", { pensamiento: data.pensamiento || "" }));
          }
        } else if (data.accion === "CONFIRMAR_CITA") {
          setFlujo("confirmando");
          const formCompleto: CitaForm = {
            ...(data.citaSlots as CitaForm),
            recomendaciones: data.recomendaciones || data.citaSlots?.recomendaciones
          };
          setCitaForm(formCompleto);
          push(agente(data.respuesta, "confirmacion", {
            pensamiento: data.pensamiento || "",
            dataCita: formCompleto
          }));
        } else if (data.accion === "CITA_REGISTRADA") {
          setFlujo("idle");
          setCitaForm({});
          push(agente(data.respuesta, "exito", {
            pensamiento: data.pensamiento || ""
          }));
        }
      } else if ((data.opciones && data.opciones.length > 0) || (data.opcionesExamen && data.opcionesExamen.length > 0)) {
        push(agente(data.respuesta, "opciones", {
          pensamiento: data.pensamiento || "",
          opciones: data.opciones || data.opcionesExamen
        }));
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
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };


  // ─── ENVIAR MENSAJE TEXTO ──────────────────────────────
  const enviarMensaje = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;
    setInput("");
    inputRef.current?.focus();
    push(usuario(texto));

    // Si el usuario estaba en confirmación y escribe 'confirma la cita', 'listo', 'sí', etc.:
    if (flujo === "confirmando") {
      const normTexto = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const esConfirmacion = /\bconfirm(a|o|ar|acion|ame|ala|alo|ando)?\b/i.test(normTexto) ||
        /^(listo|si|dale|ok|okay|perfecto|adelante|bueno|de acuerdo|bien|ya|hecho|registralo|registra|registre|guardar|guarda)$/i.test(normTexto) ||
        /^(si|dale|ok|listo|confirmo|bien)\s+(por favor|porfa|adelante|gracias|la cita|mi cita|cita|bien|listo)?$/i.test(normTexto) ||
        /(guardar|guarda|registrar|registra|agendar|agenda|proceder|procede)\s+(la\s+cita|mi\s+cita|el\s+turno|turno)?/i.test(normTexto);

      if (esConfirmacion && citaForm.fecha && citaForm.hora && citaForm.examen) {
        push(agente("⏳ Registrando tu cita..."));
        await crearCita(citaForm as CitaForm);
        inputRef.current?.focus();
        return;
      }
    }

    await enviarAlBackend(texto);
    inputRef.current?.focus();
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
  // No renderizar hasta que el componente esté montado en el cliente
  // (createPortal no funciona en SSR)
  if (!mounted) return null;

  return createPortal(
    <>
      {abierto && (
        <div
          className="
            fixed z-50 flex flex-col overflow-hidden border border-slate-700/80
            /* MÓVIL: pantalla completa */
            inset-0 rounded-none
            /* ESCRITORIO: panel flotante */
            sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[380px] sm:max-h-[620px] sm:rounded-2xl
          "
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

                {/* Indicador de escritura estilo WhatsApp */}
                <IndicadorEscribiendo visible={cargando} />

                <div ref={bottomRef} />
              </div>

              {/* Chips rápidos */}
              {flujo === "idle" && (
                <div className="px-3 pb-2 shrink-0 border-t border-slate-800/50 pt-2">
                  {/* Grid en móvil, scroll en escritorio */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:gap-2">
                    {["📅 Programar cita", "⏰ Horarios", "🧪 Preparación", "📋 Mis citas"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="text-[11px] bg-slate-800/80 border border-slate-700/80 text-cyan-400 px-3 py-2 rounded-full hover:bg-cyan-900/30 hover:border-cyan-600 transition-all whitespace-nowrap text-center sm:shrink-0"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-slate-800 flex gap-2 shrink-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensaje();
                    }
                  }}
                  placeholder={cargando ? "AIDA está pensando..." : flujo === "idle" ? "Pregúntale algo a AIDA..." : "Escribe o usa los botones de arriba..."}
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none focus:border-cyan-500 focus:bg-slate-800 transition-all"
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
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log.resultado === "exito"
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
      <div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="fixed z-[9999] touch-none cursor-grab active:cursor-grabbing"
        style={{
          bottom: "24px",
          right: "24px",
          transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        }}
      >
        <button
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95 relative"
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
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping-once { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(6,182,212,.7)} 70%{transform:scale(1.1);box-shadow:0 0 0 15px rgba(6,182,212,0)} 100%{transform:scale(1)} }
        @keyframes pulse-brain { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
        @keyframes whatsappBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes messageAppear {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typingCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>,
    document.body
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
          className={`rounded-2xl px-3.5 py-2.5 ${esUsuario
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
            <TextoAgente texto={msg.texto} animate={isLast} />
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
                  <span className="text-slate-500">Estudio(s):</span>{" "}
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
                  <strong className="text-cyan-400 font-mono text-sm">{msg.dataCita.hora} hrs</strong>
                </p>
              </div>

              {/* Protocolo de recomendaciones clínicas IA */}
              {msg.dataCita.recomendaciones && msg.dataCita.recomendaciones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/60">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>📋</span> Previsiones antes del estudio:
                  </p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {msg.dataCita.recomendaciones.map((rec, i) => (
                      <li key={i} className="text-[11px] text-slate-300 leading-snug flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
