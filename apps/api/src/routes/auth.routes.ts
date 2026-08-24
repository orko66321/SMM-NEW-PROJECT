import { Router } from "express";
import type { Request, Response } from "express";
import { forgotPasswordSchema, googleAuthSchema, loginSchema, registerSchema, resetPasswordSchema } from "@smm/shared";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../env.js";
import {
  getPublicUserById,
  googleAuth,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from "../services/auth.service.js";
import { requestPasswordReset, resetPassword } from "../services/passwordReset.service.js";

export const authRouter = Router();

const REFRESH_COOKIE = "refreshToken";

function setRefreshCookie(res: Response, value: string) {
  res.cookie(REFRESH_COOKIE, value, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/auth",
  });
}

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await registerUser(req.body);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshTokenValue } = await loginUser(req.body, meta(req));
    setRefreshCookie(res, refreshTokenValue);
    res.json({ user, accessToken });
  }),
);

authRouter.post(
  "/google",
  authLimiter,
  validate(googleAuthSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshTokenValue } = await googleAuth(req.body.idToken, meta(req));
    setRefreshCookie(res, refreshTokenValue);
    res.json({ user, accessToken });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw AppError.unauthorized("No refresh token provided");
    const { user, accessToken, refreshTokenValue } = await refreshSession(token, meta(req));
    setRefreshCookie(res, refreshTokenValue);
    res.json({ user, accessToken });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await logoutSession(token);
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body);
    // Always 204 regardless of whether the account exists — see
    // passwordReset.service.ts's account-enumeration comment.
    res.status(204).end();
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPassword(req.body);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getPublicUserById(req.user!.id);
    res.json({ user });
  }),
);
