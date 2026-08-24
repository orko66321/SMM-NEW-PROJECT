import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../services/token.service.js";
import { findUserByApiKey } from "../services/apiKey.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// Loads the user fresh from the DB on every request (rather than trusting
// role/status baked into the JWT) so that an admin demotion or account
// suspension takes effect immediately — not after the access token's TTL
// expires. The extra query is a deliberate, cheap trade for that guarantee.
//
// Phase 4: also accepts an `X-API-Key` header as an alternative credential
// (checked first, so a reseller script never needs a JWT/refresh-token
// dance) — see services/apiKey.service.ts. Same DB-verified role/status
// guarantee either way; only the credential lookup differs.
export const authenticate = asyncHandler(async (req, _res, next) => {
    const apiKeyHeader = req.headers["x-api-key"];
    if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
        const user = await findUserByApiKey(apiKeyHeader);
        if (!user)
            throw AppError.unauthorized("Invalid API key");
        if (user.status !== "ACTIVE")
            throw AppError.forbidden("Account is suspended");
        req.user = user;
        return next();
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        throw AppError.unauthorized("Missing bearer token");
    }
    const token = header.slice("Bearer ".length);
    let payload;
    try {
        payload = verifyAccessToken(token);
    }
    catch {
        throw AppError.unauthorized("Invalid or expired token");
    }
    const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
    });
    if (!user)
        throw AppError.unauthorized("User no longer exists");
    if (user.status !== "ACTIVE")
        throw AppError.forbidden("Account is suspended");
    req.user = user;
    next();
});
// Role check is against the DB-verified `req.user` set by `authenticate`
// above — never against any value read from the request body/query/params,
// so parameter tampering (e.g. `{ "role": "ADMIN" }` in a request body)
// cannot influence authorization.
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(AppError.unauthorized());
        if (!roles.includes(req.user.role))
            return next(AppError.forbidden("Insufficient permissions"));
        next();
    };
}
