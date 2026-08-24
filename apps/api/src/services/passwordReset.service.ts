import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { sendMail } from "../lib/mailer.js";
import { env } from "../env.js";
import { ARGON2_OPTIONS } from "./auth.service.js";
import type { ForgotPasswordInput, ResetPasswordInput } from "@smm/shared";

const TOKEN_TTL_MINUTES = 30;

function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Always resolves the same way regardless of whether the account exists —
 * same account-enumeration defense as loginUser's generic error message
 * (see auth.service.ts) applied to "does this email/username have an
 * account" instead of "is this password right."
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: input.identifier.toLowerCase() }, { username: input.identifier }] },
  });
  if (!user) return;

  const tokenValue = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(tokenValue),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${tokenValue}`;
  await sendMail(
    user.email,
    "Reset your password",
    `We received a request to reset your password. This link expires in ${TOKEN_TTL_MINUTES} minutes:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  );
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest("This reset link is invalid or has expired");
  }

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // A password reset should invalidate every existing session, not just
    // rotate the credential while old refresh tokens stay valid — same
    // reasoning as the refresh-token-reuse handling in auth.service.ts.
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
