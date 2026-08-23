import pino from "pino";
import { env } from "../env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.isProduction ? "info" : "debug",
  transport: env.isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
  // Never let secrets/tokens leak into logs.
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash", "*.token"],
});
