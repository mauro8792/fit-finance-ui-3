import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Usar webpack en lugar de turbopack para compatibilidad con next-pwa
  turbopack: {},
  // PWA se configurará después del build con workbox
};

export default nextConfig;
