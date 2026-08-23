import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
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

function publicUser(user: { id: string; username: string; email: string; role: string; status: string; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
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

  // Same generic message whether the account doesn't exist or the password
  // is wrong, and we still run argon2.verify on a dummy hash in the
  // not-found case so response timing doesn't leak which one it was.
  const dummyHash =
    "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQyMDI0$Q9G2X7l3z1n8b0y6r5t4u3v2w1x0y9z8a7b6c5d4e3f2";
  const valid = user ? await argon2.verify(user.passwordHash, input.password) : await argon2.verify(dummyHash, input.password).catch(() => false);

  if (!user || !valid) {
    throw AppError.unauthorized("Invalid username/email or password");
  }
  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is suspended");
  }

  const tokens = await issueTokenPair(user.id, meta);
  return { user: publicUser(user), ...tokens };
}

export async function refreshSession(refreshTokenValue: string, meta: RequestMeta) {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!existing) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (existing.revokedAt) {
    // A revoked (already-rotated) refresh token being reused is a strong
    // signal of theft/replay — nuke every session for this user so a stolen
    // token can't be used again even if the attacker races us here.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized("Refresh token reuse detected — all sessions revoked");
  }

  if (existing.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token expired");
  }

  if (existing.user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is suspended");
  }

  const { accessToken, refreshTokenValue: newRefreshTokenValue } = await issueTokenPair(existing.userId, meta);
  const newToken = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(newRefreshTokenValue) } });

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedById: newToken?.id },
  });

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
