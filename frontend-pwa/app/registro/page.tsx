"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "../utils/api";

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: "",
    ci: "",
    celular: "",
    correo: "",
    password: "",
    confirmarPassword: "",
  });

  const [errores, setErrors] = useState({
    nombre: "",
    ci: "",
    celular: "",
    correo: "",
    password: "",
    confirmarPassword: "",
  });

  const [mostrarExito, setMostrarExito] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let errorMsg = "";

    if (name === "nombre") {
      const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
      if (!regexLetras.test(value)) {
        errorMsg = "Solo se permiten letras y espacios.";
      }
    }

    if (name === "ci" || name === "celular") {
      const regexNumeros = /^[0-9]*$/;
      if (!regexNumeros.test(value)) {
        errorMsg = "Solo se permiten números.";
      }
    }

    if (name === "correo") {
      if (value.length > 0 && !value.endsWith("@gmail.com")) {
        errorMsg = "Debe ser un correo @gmail.com válido.";
      }
    }

    if (name === "password") {
      const minLength = value.length >= 8;
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      
      if (!minLength || !hasUpper || !hasLower || !hasNumber) {
        errorMsg = "La contraseña debe cumplir con todos los requisitos de seguridad.";
      }
    }

    if (name === "confirmarPassword") {
      if (value.length > 0 && value !== formData.password) {
        errorMsg = "Las contraseñas no coinciden.";
      }
    }

    setFormData({ ...formData, [name]: value });
    setErrors({ ...errores, [name]: errorMsg });
  };

  const isFormValid = 
    Object.values(errores).every((err) => err === "") &&
    Object.values(formData).every((val) => val !== "");

  const handleRegistroExitoso = async () => {
    if (isFormValid) {
      setIsSubmitting(true);
      
      try {
        // IP DINÁMICA APLICADA
        const ipActual = window.location.hostname;
        const respuesta = await fetch(`${API_URL}/usuarios/registro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: formData.nombre,
            ci: formData.ci,
            celular: formData.celular,
            correo: formData.correo,
            password: formData.password
          }),
        });

        if (respuesta.ok) {
          setMostrarExito(true);
        } else {
          const errorData = await respuesta.json();
          alert(`Aviso: ${errorData.message || 'Ocurrió un error al registrar.'}`);
        }
      } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-lg bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        <div className="text-center pt-8 pb-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-cyan-400 tracking-wider">LAB. GAMBOA</h1>
          <p className="text-slate-400 text-sm mt-1">CREAR NUEVA CUENTA</p>
        </div>

        <div className="p-8">
          <form className="space-y-5">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Nombre Completo</label>
              <input 
                type="text" 
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.nombre ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                placeholder="Ej. Juan Pérez" 
              />
              {errores.nombre && <p className="text-rose-500 text-xs mt-1">{errores.nombre}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-400 text-sm mb-1">C.I.</label>
                <input 
                  type="text" 
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.ci ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                  placeholder="1234567" 
                />
                {errores.ci && <p className="text-rose-500 text-xs mt-1">{errores.ci}</p>}
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Celular</label>
                <input 
                  type="text" 
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.celular ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                  placeholder="70000000" 
                />
                {errores.celular && <p className="text-rose-500 text-xs mt-1">{errores.celular}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Correo electrónico (@gmail.com)</label>
              <input 
                type="email" 
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.correo ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                placeholder="ejemplo@gmail.com" 
              />
              {errores.correo && <p className="text-rose-500 text-xs mt-1">{errores.correo}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Contraseña</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                  placeholder="Mínimo 8 caracteres" 
                />
                
                {/* Indicadores de fortaleza de contraseña */}
                <div className="mt-2 space-y-1">
                  <p className={`text-[10px] flex items-center gap-1 ${formData.password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span>{formData.password.length >= 8 ? '✓' : '○'}</span> Mínimo 8 caracteres
                  </p>
                  <p className={`text-[10px] flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span>{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span> Al menos 1 mayúscula
                  </p>
                  <p className={`text-[10px] flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span>{/[a-z]/.test(formData.password) ? '✓' : '○'}</span> Al menos 1 minúscula
                  </p>
                  <p className={`text-[10px] flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span>{/[0-9]/.test(formData.password) ? '✓' : '○'}</span> Al menos 1 número
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Confirmar</label>
                <input 
                  type="password" 
                  name="confirmarPassword"
                  value={formData.confirmarPassword}
                  onChange={handleChange}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-all ${errores.confirmarPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} 
                  placeholder="Repita su contraseña" 
                />
                {errores.confirmarPassword && <p className="text-rose-500 text-xs mt-1">{errores.confirmarPassword}</p>}
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleRegistroExitoso}
              disabled={!isFormValid || isSubmitting}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-colors mt-6 shadow-lg flex justify-center items-center gap-2
                ${isFormValid && !isSubmitting
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20 cursor-pointer' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'}`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                  GUARDANDO...
                </>
              ) : (
                "CREAR CUENTA"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/login" className="text-slate-400 hover:text-cyan-400 font-medium transition-colors flex items-center gap-2">
          <span>←</span> Volver al Login
        </Link>
      </div>

      {mostrarExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center transform transition-all scale-100 opacity-100">
            
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <span className="text-4xl text-emerald-400">✓</span>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-100 mb-2">¡Registro Exitoso!</h2>
            <p className="text-slate-400 mb-6">
              Su cuenta ha sido creada correctamente en el sistema del <span className="text-cyan-400 font-bold">Laboratorio Gamboa</span>. Ahora puede iniciar sesión con sus credenciales.
            </p>
            
            <Link 
              href="/login"
              className="block w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-cyan-500/20 uppercase tracking-wider"
            >
              IR AL INICIO DE SESIÓN
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}