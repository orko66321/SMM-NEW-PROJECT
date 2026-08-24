import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../lib/logger.js";
import { env } from "../env.js";
export function notFoundHandler(req, res) {
    res.status(404).json({ error: "Not found" });
}
// Central error handler — the ONLY place that decides what error detail
// reaches the client. Operational errors (AppError) are safe to surface;
// anything else is logged in full server-side and reduced to a generic
// message for the client, so stack traces / internals never leak.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error({ err }, "Operational 5xx error");
        }
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    logger.error({ err }, "Unhandled error");
    return res.status(500).json({
        error: env.isProduction ? "Internal server error" : err?.message ?? "Internal server error",
    });
}
