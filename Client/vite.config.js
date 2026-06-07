import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://api.talkative.co.in",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "https://api.talkative.co.in",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
