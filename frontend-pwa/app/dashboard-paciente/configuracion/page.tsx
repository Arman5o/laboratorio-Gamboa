"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuth } from "../../utils/fetchAuth";
import { API_URL } from "../../utils/api";
import AgenteIA from "../../components/AgenteIA";

export default function ConfiguracionPaciente() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [userEmail, setUserEmail] = useState("Cargando...");
  const [userName, setUserName] = useState("Cargando...");

  // Formulario Perfil
  const [perfil, setPerfil] = useState({
    nombre: "",
    correo: "",
    ci: "",
    celular: "",
    createdAt: "",
  });
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Formulario Seguridad / Cambiar Contraseña
  const [passData, setPassData] = useState({
    passwordActual: "",
    nuevaPassword: "",
    confirmarPassword: "",
  });
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Preferencias del Sistema (Guardadas localmente)
  const [preferencias, setPreferencias] = useState({
    notifEmail: true,
    notifSonido: true,
    recordatoriosIA: true,
  });

  useEffect(() => {
    if (window.innerWidth >= 768) setIsSidebarOpen(true);

    const email = localStorage.getItem("pacienteEmail");
    const nombre = localStorage.getItem("pacienteName");

    if (!email || email === "undefined") {
      router.push("/login");
      return;
    }

    setUserEmail(email);
    setUserName(nombre || "Paciente Registrado");

    // Cargar perfil desde el backend
    const cargarDatos = async () => {
      try {
        const res = await fetchAuth(`${API_URL}/usuarios/perfil/${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setPerfil({
            nombre: data.nombre || "",
            correo: data.correo || email,
            ci: data.ci || "",
            celular: data.celular || "",
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString("es-EC") : "—",
          });
        } else {
          // Fallback con localStorage si el backend no lo encuentra
          setPerfil((prev) => ({
            ...prev,
            nombre: nombre || "",
            correo: email,
          }));
        }
      } catch (e) {
        console.error("Error al cargar perfil:", e);
      } finally {
        setCargandoPerfil(false);
      }
    };

    cargarDatos();

    // Cargar preferencias guardadas
    const prefsGuardadas = localStorage.getItem("paciente_prefs");
    if (prefsGuardadas) {
      try {
        setPreferencias(JSON.parse(prefsGuardadas));
      } catch (e) {}
    }
  }, []);

  // Actualizar datos del perfil
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil(null);

    try {
      const res = await fetchAuth(`${API_URL}/usuarios/perfil/${encodeURIComponent(userEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: perfil.nombre,
          ci: perfil.ci,
          celular: perfil.celular,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMensajePerfil({ tipo: "exito", texto: "¡Tu perfil se ha actualizado correctamente!" });
        setUserName(perfil.nombre);
        localStorage.setItem("pacienteName", perfil.nombre);
      } else {
        setMensajePerfil({ tipo: "error", texto: data.message || "No se pudo actualizar el perfil." });
      }
    } catch (err) {
      setMensajePerfil({ tipo: "error", texto: "Error de conexión al servidor." });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Cambiar contraseña
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPassword(true);
    setMensajePassword(null);

    if (passData.nuevaPassword !== passData.confirmarPassword) {
      setMensajePassword({ tipo: "error", texto: "La nueva contraseña y su confirmación no coinciden." });
      setGuardandoPassword(false);
      return;
    }

    if (passData.nuevaPassword.length < 8) {
      setMensajePassword({ tipo: "error", texto: "La nueva contraseña debe tener mínimo 8 caracteres." });
      setGuardandoPassword(false);
      return;
    }

    try {
      const res = await fetchAuth(`${API_URL}/usuarios/cambiar-password/${encodeURIComponent(userEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordActual: passData.passwordActual,
          nuevaPassword: passData.nuevaPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMensajePassword({ tipo: "exito", texto: "¡Contraseña actualizada con éxito!" });
        setPassData({ passwordActual: "", nuevaPassword: "", confirmarPassword: "" });
      } else {
        setMensajePassword({ tipo: "error", texto: data.message || "Error al actualizar la contraseña." });
      }
    } catch (err) {
      setMensajePassword({ tipo: "error", texto: "Error de conexión al servidor." });
    } finally {
      setGuardandoPassword(false);
    }
  };

  // Alternar preferencia
  const togglePreferencia = (clave: keyof typeof preferencias) => {
    const nuevas = { ...preferencias, [clave]: !preferencias[clave] };
    setPreferencias(nuevas);
    localStorage.setItem("paciente_prefs", JSON.stringify(nuevas));
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Overlay móvil */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full whitespace-nowrap
        transition-transform duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:shrink-0
        ${!isSidebarOpen ? "md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden" : "md:w-64"}
      `}
      >
        <div className="p-4 px-6 flex items-center gap-4 border-b border-slate-700/50 h-[73px]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-2xl text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ≡
          </button>
          <div>
            <span className="text-base font-bold text-slate-100 tracking-wider uppercase">LAB. GAMBOA</span>
            <p className="text-[11px] text-cyan-400 uppercase tracking-widest font-medium">Panel de Usuario</p>
          </div>
        </div>

        <div className="py-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-slate-800 text-slate-900 font-bold text-2xl">
            {userName.charAt(0)}
          </div>
          <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase truncate w-full text-center px-4">
            {userName}
          </p>
          <p className="text-xs text-slate-400 mt-1 truncate w-full text-center px-4">{userEmail}</p>
        </div>

        <nav className="flex-1 py-2 flex flex-col">
          <Link
            href="/dashboard-paciente"
            className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"
          >
            <span className="text-lg">🏠</span> Dashboard Principal
          </Link>
          <Link
            href="/dashboard-paciente/programar-cita"
            className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"
          >
            <span className="text-lg">📅</span> Programar Cita
          </Link>
          <Link
            href="/dashboard-paciente/resultados"
            className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"
          >
            <span className="text-lg">🧬</span> Resultados Clínicos
          </Link>
          <Link
            href="/dashboard-paciente/notificaciones"
            className="flex items-center gap-3 px-6 py-3.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-400 border-l-4 border-transparent transition-colors text-sm"
          >
            <span className="text-lg">🔔</span> Notificaciones
          </Link>
          <Link
            href="/dashboard-paciente/configuracion"
            className="flex items-center gap-3 px-6 py-3.5 bg-cyan-500 text-slate-900 font-bold border-l-4 border-slate-100 transition-colors text-sm"
          >
            <span className="text-lg">⚙️</span> Configuración
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Link
            href="/login"
            onClick={() => localStorage.clear()}
            className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-rose-500 hover:text-slate-900 text-rose-400 font-bold py-2.5 rounded-lg transition-colors border border-slate-700 text-xs"
          >
            <span>▼</span> CERRAR SESIÓN
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 relative w-full">
        <div className="bg-slate-800/50 border-b border-slate-800 p-4 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-2xl text-cyan-400 focus:outline-none">
              ≡
            </button>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-100 tracking-wider uppercase">CONFIGURACIÓN DE CUENTA</h1>
              <p className="text-[11px] md:text-xs text-cyan-400 font-mono tracking-widest mt-0.5">Perfil, Seguridad y Preferencias</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-700">
              <span className="text-2xl text-cyan-400">👤</span>
              <div>
                <h2 className="text-base font-bold text-slate-100">Información del Paciente</h2>
                <p className="text-xs text-slate-400">Actualiza tus datos de contacto registrados para el expediente y citas</p>
              </div>
            </div>

            {mensajePerfil && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 ${
                  mensajePerfil.tipo === "exito"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                }`}
              >
                <span>{mensajePerfil.tipo === "exito" ? "✓" : "⚠️"}</span>
                <p>{mensajePerfil.texto}</p>
              </div>
            )}

            {cargandoPerfil ? (
              <div className="py-8 text-center text-slate-500 text-sm animate-pulse">Cargando datos del perfil...</div>
            ) : (
              <form onSubmit={handleGuardarPerfil} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={perfil.nombre}
                      onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Correo Electrónico (Solo Lectura)</label>
                    <input
                      type="email"
                      disabled
                      value={perfil.correo}
                      className="w-full bg-slate-950/60 border border-slate-800 text-slate-500 rounded-lg px-4 py-2.5 text-sm cursor-not-allowed outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Cédula de Identidad (CI)</label>
                    <input
                      type="text"
                      value={perfil.ci}
                      onChange={(e) => setPerfil({ ...perfil, ci: e.target.value })}
                      placeholder="Ej: 12345678"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Número de Celular</label>
                    <input
                      type="tel"
                      value={perfil.celular}
                      onChange={(e) => setPerfil({ ...perfil, celular: e.target.value })}
                      placeholder="Ej: 71234567"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={guardandoPerfil}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-slate-900 font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                  >
                    {guardandoPerfil ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SECCIÓN 2: SEGURIDAD Y CONTRASEÑA */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-700">
              <span className="text-2xl text-cyan-400">🔒</span>
              <div>
                <h2 className="text-base font-bold text-slate-100">Seguridad y Acceso</h2>
                <p className="text-xs text-slate-400">Modifica tu contraseña para mantener tu historial médico protegido</p>
              </div>
            </div>

            {mensajePassword && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 ${
                  mensajePassword.tipo === "exito"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                }`}
              >
                <span>{mensajePassword.tipo === "exito" ? "✓" : "⚠️"}</span>
                <p>{mensajePassword.texto}</p>
              </div>
            )}

            <form onSubmit={handleCambiarPassword} className="space-y-5">
              <div>
                <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={passData.passwordActual}
                  onChange={(e) => setPassData({ ...passData, passwordActual: e.target.value })}
                  placeholder="Introduce tu contraseña actual"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={passData.nuevaPassword}
                    onChange={(e) => setPassData({ ...passData, nuevaPassword: e.target.value })}
                    placeholder="Mínimo 8 car., Mayús, Minús y Núm"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={passData.confirmarPassword}
                    onChange={(e) => setPassData({ ...passData, confirmarPassword: e.target.value })}
                    placeholder="Repite la nueva contraseña"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-slate-900 font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                >
                  {guardandoPassword ? "ACTUALIZANDO..." : "CAMBIAR CONTRASEÑA"}
                </button>
              </div>
            </form>
          </div>

          {/* SECCIÓN 3: PREFERENCIAS DEL SISTEMA */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-700">
              <span className="text-2xl text-cyan-400">🔔</span>
              <div>
                <h2 className="text-base font-bold text-slate-100">Preferencias de Alertas y Asistencia IA</h2>
                <p className="text-xs text-slate-400">Personaliza la forma en que el laboratorio te notifica y te asiste</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Notificaciones por Correo Electrónico</p>
                  <p className="text-xs text-slate-400 mt-0.5">Recibir copia del protocolo y recordatorios en tu bandeja de entrada</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePreferencia("notifEmail")}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    preferencias.notifEmail ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 bg-slate-900 rounded-full shadow-md" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Alertas Proactivas del Agente IA (AIDA)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Permitir sugerencias de horarios de menor congestión y ayuno</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePreferencia("recordatoriosIA")}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    preferencias.recordatoriosIA ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 bg-slate-900 rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      <AgenteIA rol="paciente" />
    </div>
  );
}
