import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8 flex justify-center">
          <span className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
            <span className="w-8 h-8 rounded-full bg-cyan-400 animate-pulse"></span>
          </span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight mb-4">
          Laboratorio Clínico <span className="text-cyan-400">Gamboa</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl mb-10">
          Sistema Web Progresivo de Gestión Administrativa y Reserva de Citas con Agentes Inteligentes.
        </p>
        
        <Link 
          href="/login" 
          className="inline-block bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-10 rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          INGRESAR AL SISTEMA
        </Link>
      </div>
    </main>
  );
}