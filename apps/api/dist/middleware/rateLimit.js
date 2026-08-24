import rateLimit from "express-rate-limit";
// NOTE (Phase 2): backed by in-memory store, which is fine for a single
// process but resets on restart and does not share state across horizontally
// scaled instances. Swap the `store` option for a Redis-backed store
// (rate-limit-redis) before running more than one API instance.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again later." },
});
export const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many orders submitted. Please slow down." },
});
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
});
