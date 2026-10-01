import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NetworkStatus from "./NetworkStatus"; // <-- 1. IMPORTAMOS EL DETECTOR

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 2. COLOCAMOS EL AVISO AQUÍ PARA QUE APAREZCA EN TODAS LAS PANTALLAS */}
        <NetworkStatus />
        
        {children}
      </body>
    </html>
  );
}