import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../services/token.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Loads the user fresh from the DB on every request (rather than trusting
// role/status baked into the JWT) so that an admin demotion or account
// suspension takes effect immediately — not after the access token's TTL
// expires. The extra query is a deliberate, cheap trade for that guarantee.
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);

  let payload: { sub: string };
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, status: true },
  });

  if (!user) throw AppError.unauthorized("User no longer exists");
  if (user.status !== "ACTIVE") throw AppError.forbidden("Account is suspended");

  req.user = user;
  next();
});

// Role check is against the DB-verified `req.user` set by `authenticate`
// above — never against any value read from the request body/query/params,
// so parameter tampering (e.g. `{ "role": "ADMIN" }` in a request body)
// cannot influence authorization.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden("Insufficient permissions"));
    next();
  };
}
