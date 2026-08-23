import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Read the single shared .env at the repo root instead of apps/web/.env,
  // so there's one source of truth for local config (see .env.example).
  envDir: path.resolve(__dirname, "../.."),
});
