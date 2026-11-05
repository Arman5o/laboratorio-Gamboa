import type { Metadata, Viewport } from "next";
import "./globals.css";
import NetworkStatus from "./NetworkStatus"; // <-- 1. IMPORTAMOS EL DETECTOR
import GestorNotificacionesPush from "./GestorNotificacionesPush";

export const metadata: Metadata = {
  title: "Lab Gamboa | PWA",
  description: "Sistema Web Progresivo para Laboratorios Clínicos",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Gestor global de Notificaciones en la barra del teléfono */}
        <GestorNotificacionesPush />
        
        {/* Aviso de pérdida de conexión */}
        <NetworkStatus />
        
        {children}
      </body>
    </html>
  );
}