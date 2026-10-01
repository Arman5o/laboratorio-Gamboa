"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { API_URL } from "../utils/api";

// ─── Botón Google oficial (usa FedCM/credential flow, sin popup) ─────────────
// GoogleLogin devuelve credential (id_token) que el backend valida via userinfo
const GoogleBoton = ({
  onSuccess,
  onError,
}: {
  onSuccess: (credential: string) => void;
  onError: () => void;
}) => (
  <GoogleLogin
    onSuccess={(credentialResponse) => {
      if (credentialResponse.credential) {
        onSuccess(credentialResponse.credential);
      } else {
        onError();
      }
    }}
    onError={onError}
    theme="filled_black"
    size="large"
    width="340"
    text="continue_with"
    shape="rectangular"
    logo_alignment="center"
  />
);

// ─── Página principal de Login ───────────────────────────────────────────────
export default function Login() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // ⚠️ CLAVE: evita el Hydration Error — el botón de Google solo se monta en cliente
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Marcar que ya estamos en el cliente
    setMounted(true);

    // Limpiar sesión previa
    localStorage.removeItem('pacienteEmail');
    localStorage.removeItem('pacienteName');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    localStorage.removeItem('token');

    // Detectar estado de red
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Login con correo / contraseña ─────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensajeError(null);

    const credenciales = { correo: correo.trim(), password };

    try {
      // 1. Intentar como Administrador
      const resAdmin = await fetch(`${API_URL}/usuarios/login-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales),
      });

      if (resAdmin.ok) {
        const dataAdmin = await resAdmin.json();
        const adminEncontrado = dataAdmin.usuario;
        localStorage.setItem('token', dataAdmin.token);
        localStorage.setItem('adminEmail', adminEncontrado.email || adminEncontrado.correo);
        localStorage.setItem('adminName', adminEncontrado.nombre);
        router.push("/dashboard-admin");
        return;
      }

      // 2. Intentar como Paciente
      const resPaciente = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales),
      });

      if (resPaciente.ok) {
        const dataPaciente = await resPaciente.json();
        const usuarioEncontrado = dataPaciente.usuario;
        localStorage.setItem('token', dataPaciente.token);
        localStorage.setItem('pacienteEmail', usuarioEncontrado.correo);
        localStorage.setItem('pacienteName', usuarioEncontrado.nombre);
        router.push("/dashboard-paciente");
        return;
      }

      // 3. Ambos fallaron
      setMensajeError("Acceso denegado. El correo o la contraseña son incorrectos.");
    } catch (error) {
      console.error("Error de conexión:", error);
      setMensajeError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setCargando(false);
    }
  };

  // ─── Login con Google ───────────────────────────────────────────────────────
  // Recibe el id_token (credential) del nuevo flujo GoogleLogin FedCM
  const handleGoogleSuccess = async (credential: string) => {
    setCargando(true);
    setMensajeError(null);

    try {
      const res = await fetch(`${API_URL}/usuarios/login-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential }),
      });

      if (res.ok) {
        const data = await res.json();
        const usuarioEncontrado = data.usuario;
        localStorage.setItem('token', data.token);

        if (usuarioEncontrado.rol === 'admin') {
          localStorage.setItem('adminEmail', usuarioEncontrado.email || usuarioEncontrado.correo);
          localStorage.setItem('adminName', usuarioEncontrado.nombre);
          router.push("/dashboard-admin");
        } else {
          localStorage.setItem('pacienteEmail', usuarioEncontrado.correo);
          localStorage.setItem('pacienteName', usuarioEncontrado.nombre);
          router.push("/dashboard-paciente");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setMensajeError(errData.message || "Falló la autenticación con Google. Intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error Google Login:", error);
      setMensajeError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setCargando(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">

        {/* Encabezado */}
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">LAB. GAMBOA</h1>
          <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SISTEMA DE AGENTES INTELIGENTES
          </p>
        </div>

        <div className="p-8 pt-4">

          {/* Mensaje de Error */}
          {mensajeError && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Error de Autenticación</p>
                <p className="text-xs text-slate-300 mt-0.5">{mensajeError}</p>
              </div>
            </div>
          )}

          {/* Formulario correo / contraseña */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Correo Electrónico</label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                placeholder="ejemplo@correo.com"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              {!isOnline && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center py-2.5 rounded-lg mb-3">
                  ⚠️ SIN CONEXIÓN A INTERNET
                </div>
              )}
              <button
                type="submit"
                disabled={cargando || !isOnline}
                className="w-full flex justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold py-3.5 px-4 rounded-lg transition-colors shadow-lg cursor-pointer tracking-widest"
              >
                {cargando ? "AUTENTICANDO..." : (!isOnline ? "SISTEMA FUERA DE LÍNEA" : "INICIAR SESIÓN")}
              </button>
            </div>
          </form>

          {/* Separador y botón de Google */}
          <div className="mt-6">
            <div className="relative flex items-center py-2 mb-4">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase">o</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <div className="flex justify-center w-full">
              {/* Solo se renderiza en cliente para evitar Hydration Error */}
              {mounted ? (
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
                  <GoogleBoton
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      console.error('Google Login Falló');
                      setMensajeError("No se pudo iniciar sesión con Google. Asegúrate de que las cookies de terceros estén habilitadas en Chrome.");
                    }}
                  />
                </GoogleOAuthProvider>
              ) : (
                // Placeholder con las mismas dimensiones para no causar layout shift
                <div className="w-full h-[44px] bg-slate-800/50 rounded-lg border border-slate-600 animate-pulse" />
              )}
            </div>
          </div>

          {/* Links del footer */}
          <div className="mt-8 flex flex-col items-center space-y-4 border-t border-slate-700 pt-6">
            <Link href="/recuperar-password" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              ¿Perdiste tu contraseña?
            </Link>
            <div className="text-sm text-slate-400">
              ¿No tienes Cuenta?{' '}
              <Link href="/registro" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
                Regístrate aquí
              </Link>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-slate-500 hover:text-cyan-400 font-medium transition-colors flex items-center gap-2 text-sm">
          <span>←</span> Volver al Inicio
        </Link>
      </div>
    </main>
  );
}