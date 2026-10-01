// Ruta: app/offline/page.tsx
"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
          <span className="text-4xl">📡</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Sin Conexión a Internet</h1>
        <p className="text-slate-400 mb-8 text-sm">
          El Sistema Lab. Gamboa requiere una conexión activa para acceder a la base de datos de pacientes y resultados.
        </p>
        
        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 rounded-lg text-sm transition-colors mb-3 cursor-pointer"
        >
          REINTENTAR CONEXIÓN
        </button>
        
        <Link href="/" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    </main>
  );
}