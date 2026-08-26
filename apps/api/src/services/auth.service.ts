import crypto from "node:crypto";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { AppError } from "../utils/AppError.js";
import {
  generateRefreshTokenValue,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from "./token.service.js";
import type { RegisterInput, LoginInput } from "@smm/shared";

// OWASP-recommended minimum params for argon2id (as of the 2023 cheat sheet):
// m=19 MiB, t=2, p=1. Deliberately expensive enough to slow offline cracking
// of a leaked hash dump without making legitimate logins noticeably slow.
export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { id: true },
  });
  if (existing) {
    // Deliberately vague — do not reveal *which* field collided, to avoid
    // account enumeration via the registration form.
    throw AppError.conflict("An account with this email or username already exists");
  }

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username: input.username, email: input.email, passwordHash },
    });
    await tx.wallet.create({ data: { userId: created.id, balance: 0 } });
    return created;
  });

  return publicUser(user);
}

async function issueTokenPair(userId: string, meta: RequestMeta) {
  const accessToken = signAccessToken(userId);
  const refreshTokenValue = generateRefreshTokenValue();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshTokenValue),
      expiresAt: refreshTokenExpiry(),
      createdByIp: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  return { accessToken, refreshTokenValue };
}

export async function loginUser(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: input.identifier.toLowerCase() }, { username: input.identifier }] },
  });

  // Same generic message whether the account doesn't exist, the password is
  // wrong, or the account is Google-only (no passwordHash) — and we still
  // run argon2.verify on a dummy hash in every "can't check the real one"
  // case so response timing doesn't leak which one it was, and so a
  // Google-linked email is never distinguishable from a wrong password.
  const dummyHash =
    "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQyMDI0$Q9G2X7l3z1n8b0y6r5t4u3v2w1x0y9z8a7b6c5d4e3f2";
  const valid = user?.passwordHash
    ? await argon2.verify(user.passwordHash, input.password)
    : await argon2.verify(dummyHash, input.password).catch(() => false);

  if (!user || !valid || !user.passwordHash) {
    throw AppError.unauthorized("Invalid username/email or password");
  }
  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is suspended");
  }

  const tokens = await issueTokenPair(user.id, meta);
  return { user: publicUser(user), ...tokens };
}

// How long after a token was rotated a second use of it is still treated as
// an honest race (two requests genuinely both holding the same not-yet-
// rotated cookie) rather than a theft/replay signal. Long enough to cover
// realistic same-tab/multi-tab request skew, short enough that it's no
// practical help to an actual attacker replaying a token they captured off
// a network log sometime after the legitimate rotation.
const REUSE_GRACE_MS = 10_000;

export async function refreshSession(refreshTokenValue: string, meta: RequestMeta) {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!existing) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (existing.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token expired");
  }

  if (existing.user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is suspended");
  }

  // Atomically claim this token for rotation — the WHERE clause only
  // matches if it's still unrevoked at the instant of this exact UPDATE,
  // not just at the SELECT above. Two honest requests can legitimately race
  // here holding the same still-fresh token (the frontend briefly firing
  // two refresh attempts before either resolves — see
  // apps/web/src/api/client.ts's refreshAuthSession, which dedupes that
  // specific case — or two separate browser tabs racing independently,
  // which same-tab dedup can't cover). The loser lands below.
  const claim = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (claim.count === 0) {
    // Someone else already rotated this token. `existing.revokedAt` (read
    // *before* the race resolved) can't tell us whether that happened a
    // moment ago or long ago — re-read the row to find out, since that's
    // the actual signal that distinguishes "two honest requests raced"
    // from "a stale token is being replayed" (real theft/replay defense
    // still applies past the grace window — nuke every session).
    const current = await prisma.refreshToken.findUniqueOrThrow({ where: { id: existing.id } });
    const revokedMsAgo = Date.now() - (current.revokedAt?.getTime() ?? 0);
    if (revokedMsAgo > REUSE_GRACE_MS) {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw AppError.unauthorized("Refresh token reuse detected — all sessions revoked");
    }
    throw AppError.unauthorized("Refresh token already used");
  }

  const { accessToken, refreshTokenValue: newRefreshTokenValue } = await issueTokenPair(existing.userId, meta);
  const newToken = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(newRefreshTokenValue) } });
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { replacedById: newToken?.id } });

  return { user: publicUser(existing.user), accessToken, refreshTokenValue: newRefreshTokenValue };
}

export async function logoutSession(refreshTokenValue: string) {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getPublicUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  return publicUser(user);
}

// ── Google OAuth ("Sign in with Google") ────────────────────────────────

interface GoogleIdentity {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * The only code path that decides whether a Google credential is real —
 * verifies the ID token's signature, audience, and expiry against Google's
 * own public keys via google-auth-library, mirroring the project's existing
 * rule that a client-supplied credential is never trusted on its own (see
 * services/payments/types.ts's PaymentGateway.confirm() for the same
 * "always re-verify server-side" pattern applied to payments instead of
 * identity). A fresh client is constructed per call rather than cached at
 * module scope — cheap, and avoids any question of stale config if
 * GOOGLE_CLIENT_ID is ever rotated without a restart.
 */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!env.googleAuthEnabled || !env.GOOGLE_CLIENT_ID) {
    throw AppError.badRequest("Google sign-in is not configured");
  }

  const client = new OAuth2Client();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw AppError.unauthorized("Invalid Google credential");
  }

  if (!payload?.sub || !payload.email) {
    throw AppError.unauthorized("Invalid Google credential");
  }
  // Google can issue tokens for unverified email addresses (e.g. a linked
  // but unconfirmed account) — refusing those closes off account takeover
  // via an email the "owner" doesn't actually control yet.
  if (!payload.email_verified) {
    throw AppError.unauthorized("This Google account's email is not verified");
  }

  return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name, picture: payload.picture };
}

/** Derives a usernameSchema-valid candidate from an email's local part — collision handling happens in the caller. */
function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `user${cleaned}`.padEnd(3, "0");
}

/**
 * Registers a new user or signs in an existing one from a verified Google
 * identity, and always returns a normal JWT session — from this point on a
 * Google-originated session is indistinguishable from a password one to
 * every other part of the app (RBAC, wallet, orders, etc. don't know or
 * care how the session started).
 *
 * Linking rule: an existing account is matched by googleId first (repeat
 * Google sign-ins), then by email (a password-created account whose owner
 * later uses "Continue with Google" gets googleId attached rather than a
 * duplicate account created) — same "email is the real identity" reasoning
 * as registerUser's conflict check above.
 */
export async function googleAuth(idToken: string, meta: RequestMeta) {
  const identity = await verifyGoogleIdToken(idToken);

  let user = await prisma.user.findUnique({ where: { googleId: identity.googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: identity.email } });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: identity.googleId, avatarUrl: identity.picture ?? existingByEmail.avatarUrl },
      });
    } else {
      const base = usernameFromEmail(identity.email);
      let username = base;
      // A handful of collision retries is plenty — usernames derived from a
      // real email rarely collide, and a fully random fallback guarantees
      // termination without an unbounded loop.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
        if (!taken) break;
        username = `${base}${crypto.randomInt(1000, 9999)}`;
      }

      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username,
            email: identity.email,
            googleId: identity.googleId,
            avatarUrl: identity.picture,
            passwordHash: null,
          },
        });
        await tx.wallet.create({ data: { userId: created.id, balance: 0 } });
        return created;
      });
    }
  } else if (identity.picture && identity.picture !== user.avatarUrl) {
    // Keep the avatar reasonably fresh on repeat logins — cheap, and never
    // touches anything security-relevant.
    user = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: identity.picture } });
  }

  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is suspended");
  }

  const tokens = await issueTokenPair(user.id, meta);
  return { user: publicUser(user), ...tokens };
}
