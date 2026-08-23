import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load the repo-root .env regardless of the process's cwd — npm workspace
// scripts run with cwd set to apps/api, so a bare `dotenv/config` would
// silently look in the wrong place and every var would fall back to
// whatever default (or fail the schema below).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Fail fast at boot if secrets/config are missing or weak — never let the
// process come up half-configured and silently degrade security.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters — generate with `openssl rand -base64 48`"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_DOMAIN: z.string().optional(),
  // Encrypts provider API keys / payment gateway credentials at rest in
  // Postgres (see lib/crypto.ts) — must decode to exactly 32 bytes for
  // AES-256-GCM. Generate with `openssl rand -base64 32`.
  ENCRYPTION_KEY: z.string().refine(
    (v) => {
      try {
        return Buffer.from(v, "base64").length === 32;
      } catch {
        return false;
      }
    },
    { message: "ENCRYPTION_KEY must be base64 for exactly 32 bytes — generate with `openssl rand -base64 32`" },
  ),
  // Used to build absolute callback/redirect URLs for payment gateways
  // (e.g. bKash's callbackURL) — must be reachable by the gateway/browser,
  // not just localhost, once a real gateway is enabled.
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  // Where a payment gateway callback redirects the browser back to once
  // confirm() has resolved — the web app, not the API.
  FRONTEND_BASE_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Refusing to start with invalid environment configuration");
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
};
