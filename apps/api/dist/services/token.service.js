import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
export function signAccessToken(userId) {
    // JWT_ACCESS_TTL is validated as a non-empty string by the env schema
    // (documented in .env.example as e.g. "15m"); jsonwebtoken's types want
    // its specific StringValue template-literal type, which a dynamically
    // loaded env var can never satisfy structurally — cast at this one
    // boundary rather than losing env validation elsewhere.
    const options = { expiresIn: env.JWT_ACCESS_TTL };
    return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}
export function verifyAccessToken(token) {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub) {
        throw new Error("Malformed token payload");
    }
    return { sub: payload.sub };
}
// Refresh tokens are opaque high-entropy random values, not JWTs — the
// server is the only party that can look them up, so there is nothing to
// gain from making them self-describing. Only a SHA-256 hash is stored,
// so a leaked database dump does not hand out usable refresh tokens.
export function generateRefreshTokenValue() {
    return crypto.randomBytes(64).toString("hex");
}
export function hashRefreshToken(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
export function refreshTokenExpiry() {
    const days = env.REFRESH_TOKEN_TTL_DAYS;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
