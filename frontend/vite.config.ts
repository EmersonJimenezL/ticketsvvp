import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Por defecto apuntamos al backend clásico en :3000.
  // Si necesitas otro puerto/host, define VITE_API_PROXY_TARGET.
  const target = env.VITE_API_PROXY_TARGET || "http://localhost:3000";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
