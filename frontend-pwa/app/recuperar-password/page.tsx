"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL } from "../utils/api";

export default function RecuperarPassword() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [ci, setCi] = useState("");
  const [celular, setCelular] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      const ipActual = window.location.hostname;
      const respuesta = await fetch(`${API_URL}/usuarios/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          correo: correo.trim(), 
          ci: ci.trim(),
          celular: celular.trim(),
          nuevaPassword: nuevaPassword 
        })
      });

      if (respuesta.ok) {
        alert("¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión con tu nueva clave.");
        router.push("/login");
      } else {
        const errorData = await respuesta.json();
        alert(`Error: ${errorData.message || "El correo ingresado no existe."}`);
        setCargando(false);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor backend.");
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">LAB. GAMBOA</h1>
          <p className="text-slate-400 text-sm mt-2">MÓDULO DE RECUPERACIÓN DE ACCESO</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleRecuperar} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Correo Electrónico Registrado</label>
              <input 
                type="email" 
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                placeholder="ejemplo@correo.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Cédula de Identidad</label>
                <input 
                  type="text" 
                  required
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Ej: 1712345678"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Celular</label>
                <input 
                  type="text" 
                  required
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Ej: 0991234567"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Nueva Contraseña</label>
              <input 
                type="password" 
                required
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                placeholder="Mínimo 8 caracteres..."
              />
              {/* Indicadores de fortaleza de contraseña */}
              <div className="mt-2 space-y-1">
                <p className={`text-[10px] flex items-center gap-1 ${nuevaPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{nuevaPassword.length >= 8 ? '✓' : '○'}</span> Mínimo 8 caracteres
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${/[A-Z]/.test(nuevaPassword) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{/[A-Z]/.test(nuevaPassword) ? '✓' : '○'}</span> Al menos 1 mayúscula
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${/[a-z]/.test(nuevaPassword) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{/[a-z]/.test(nuevaPassword) ? '✓' : '○'}</span> Al menos 1 minúscula
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${/[0-9]/.test(nuevaPassword) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{/[0-9]/.test(nuevaPassword) ? '✓' : '○'}</span> Al menos 1 número
                </p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={cargando || ci.length < 5 || celular.length < 5 || nuevaPassword.length < 8 || !/[A-Z]/.test(nuevaPassword) || !/[a-z]/.test(nuevaPassword) || !/[0-9]/.test(nuevaPassword)}
              className="w-full flex justify-center bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors mt-4 shadow-lg cursor-pointer"
            >
              {cargando ? "ACTUALIZANDO..." : "RESTABLECER CONTRASEÑA"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
              ← Volver al Login
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}