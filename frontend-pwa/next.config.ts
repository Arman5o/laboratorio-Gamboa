import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import path from "path";

const withPWA = withPWAInit({
  dest: "public",
  // Desactivamos la PWA en desarrollo para que no guarde caché molesto mientras programas
  disable: process.env.NODE_ENV === "development", 
  register: true,
});

const nextConfig: NextConfig = {
  // Apunta al directorio del frontend para silenciar el warning de lockfiles múltiples
  outputFileTracingRoot: path.join(__dirname),
};

export default withPWA(nextConfig);