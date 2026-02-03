import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      workbox: {
        maximumFileSizeToCacheInBytes: 3145728, // 3 MiB
      },
      manifest: {
        name: 'Converza - Enterprise Collaboration',
        short_name: 'Converza',
        description: 'Enterprise project collaboration and management platform',
        theme_color: '#1e3a5f',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          { src: '/pwa-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/favicon.png', sizes: '64x64', type: 'image/png' },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent duplicate React instances (fixes Radix hooks like useRef crashing)
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
