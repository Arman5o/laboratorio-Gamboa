"use client";

import { useEffect, useState } from "react";
import { conectarSocket } from "./utils/api";
import { dispararNotificacionNativa, solicitarPermisoNotificaciones } from "./utils/notificacionesNativas";

export default function GestorNotificacionesPush() {
  const [permiso, setPermiso] = useState<NotificationPermission>("default");
  const [mostrarBanner, setMostrarBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    setPermiso(Notification.permission);

    // Si aún no ha decidido, ofrecer activarlas
    if (Notification.permission === "default") {
      const bannerVisto = sessionStorage.getItem("banner_notif_visto");
      if (!bannerVisto) {
        setMostrarBanner(true);
      }
    }

    // Registrar Service Worker personalizado o existente para asegurar soporte en móviles
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Conectar WebSocket global para recibir alertas aunque el usuario navegue en cualquier página
    const socket = conectarSocket();

    socket.on("connect", () => {
      console.log("🔔 [Push PWA] WebSocket conectado en tiempo real:", socket.id);
    });

    const reproducirSonido = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Tono D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // Tono A5 (bip agradable)
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (e) {}
    };

    const manejarNotificacionEntrante = (tipo: string, mensaje: string, datosCita?: any) => {
      const correoPaciente = (localStorage.getItem("pacienteEmail") || "").trim().toLowerCase();
      const correoAdmin = (localStorage.getItem("adminEmail") || "").trim().toLowerCase();

      const citaCorreo = (datosCita?.pacienteCorreo || datosCita?.correo || "").trim().toLowerCase();

      // Verificar si la notificación corresponde al usuario actual (Paciente o Admin)
      const esAdmin = !!correoAdmin;
      const esParaAdmin = esAdmin && (tipo === "NUEVA_CITA" || datosCita?.destinatario === "admin" || !citaCorreo);
      const esParaPaciente = !!correoPaciente && (citaCorreo === correoPaciente || !citaCorreo);
      const esParaMi = esParaAdmin || esParaPaciente;

      if (esParaMi) {
        reproducirSonido();

        let titulo = "🔔 Lab. Gamboa — Notificación";
        let cuerpoNotif = mensaje;

        const estado = (datosCita?.estado || "").toLowerCase();

        if (estado === "confirmada") {
          titulo = "✅ ¡Cita Aprobada por el Laboratorio!";
          cuerpoNotif = `Tu cita para ${datosCita?.examen || "el estudio"} ha sido confirmada para el ${datosCita?.fecha} a las ${datosCita?.hora}.`;
        } else if (estado === "cancelada") {
          titulo = "❌ Cita Cancelada";
          cuerpoNotif = `Tu reserva para ${datosCita?.examen || "el estudio"} del ${datosCita?.fecha} ha sido cancelada.`;
        } else if (estado === "completada" || datosCita?.resultadoPdf) {
          titulo = "🔬 ¡Resultados Médicos Listos!";
          cuerpoNotif = `El informe y resultados de tu ${datosCita?.examen || "análisis"} ya están disponibles para descargar.`;
        } else if (tipo === "NUEVA_CITA") {
          titulo = "📅 Cita Programada";
        } else if (tipo === "RECORDATORIO") {
          titulo = "⏰ Recordatorio de Cita Médica";
        } else if (tipo === "ACTUALIZACION") {
          titulo = "🔄 Cita Reprogramada";
        }

        dispararNotificacionNativa({
          titulo,
          cuerpo: cuerpoNotif,
          url: estado === "completada" ? "/dashboard-paciente/resultados" : correoAdmin ? "/dashboard-admin/notificaciones" : "/dashboard-paciente/notificaciones",
          tag: `cita-${datosCita?._id || Date.now()}`,
        });
      }
    };

    socket.on("agente:nuevaCita", (d: any) => {
      manejarNotificacionEntrante("NUEVA_CITA", d.mensaje, d.cita);
    });

    socket.on("agente:recordatorio", (d: any) => {
      manejarNotificacionEntrante("RECORDATORIO", d.mensaje, d.cita);
    });

    socket.on("agente:estadoCita", (d: any) => {
      manejarNotificacionEntrante("ESTADO", d.mensaje, d.cita);
    });

    socket.on("citaActualizada", (c: any) => {
      const estadoC = (c.estado || "").toLowerCase();
      let textoMsg = `Tu cita de ${c.examen} ha sido actualizada a: ${c.estado}`;
      if (estadoC === "confirmada") textoMsg = `El laboratorio ha aprobado tu cita para ${c.examen}.`;
      if (estadoC === "cancelada") textoMsg = `Tu cita para ${c.examen} fue cancelada.`;
      if (estadoC === "completada") textoMsg = `Tus resultados para ${c.examen} ya están cargados en el sistema.`;

      manejarNotificacionEntrante("ESTADO", textoMsg, c);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const activarNotificaciones = async () => {
    const res = await solicitarPermisoNotificaciones();
    setPermiso(res);
    setMostrarBanner(false);
    sessionStorage.setItem("banner_notif_visto", "true");

    if (res === "granted") {
      dispararNotificacionNativa({
        titulo: "🔔 Notificaciones Activadas",
        cuerpo: "Recibirás alertas en tu barra de notificaciones como en WhatsApp.",
      });
    }
  };

  const descartarBanner = () => {
    setMostrarBanner(false);
    sessionStorage.setItem("banner_notif_visto", "true");
  };

  if (!mostrarBanner || permiso === "granted") return null;

  return (
    <div className="bg-gradient-to-r from-cyan-900/90 via-slate-900/90 to-cyan-950/90 border-b border-cyan-500/40 text-slate-200 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md z-40 relative">
      <div className="flex items-center gap-2.5">
        <span className="text-xl animate-bounce">📱</span>
        <p className="font-medium">
          <strong className="text-cyan-400">¿Recibir alertas en la barra del teléfono?</strong> Actívalas para avisarte cuando haya cambios en tus citas o resultados.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={activarNotificaciones}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-md"
        >
          Activar Alertas
        </button>
        <button
          onClick={descartarBanner}
          className="text-slate-400 hover:text-slate-200 px-2 py-1 text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
