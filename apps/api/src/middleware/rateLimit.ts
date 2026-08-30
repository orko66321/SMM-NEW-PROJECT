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

// Build spec §10 — cap ticket creation / replies per user so the AI Support
// automation engine can't be used to hammer the provider API. Keyed by
// authenticated user id (falls back to IP for safety) since these routes are
// always behind `authenticate`.
export const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
  message: { error: "Too many ticket actions. Please try again later." },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
