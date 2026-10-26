import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

/**
 * The browser only ever talks to this origin: `/api/*` is proxied to the Spring Boot API. Keeping it same-origin is what
 * lets the API's SameSite=Lax session cookies and its Origin check work without CORS (the Host header is kept as is).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = (env.BACKEND_URL || "http://127.0.0.1:8081").replace(/\/$/, "");
  const port = Number(env.WEB_PORT || 3006);
  const proxy = { "/api": { target: backend, changeOrigin: false, xfwd: true } };
  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: { port, strictPort: true, proxy },
    preview: { port, strictPort: true, proxy },
    build: { outDir: env.BUILD_DIR || "dist", sourcemap: false },
  };
});
