import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { ARGON2_OPTIONS } from "./auth.service.js";
import type { ChangePasswordInput, UpdateProfileInput } from "@smm/shared";

export async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    notifyEmail: user.notifyEmail,
    notifyOrderUpdates: user.notifyOrderUpdates,
    notifyPromotions: user.notifyPromotions,
    apiKeyPrefix: user.apiKeyPrefix,
    apiKeyCreatedAt: user.apiKeyCreatedAt?.toISOString() ?? null,
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await prisma.user.update({ where: { id: userId }, data: input });
  return getMyProfile(userId);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");

  const valid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!valid) throw AppError.badRequest("Current password is incorrect");

  const passwordHash = await argon2.hash(input.newPassword, ARGON2_OPTIONS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Same "kill other sessions on credential change" reasoning as
    // passwordReset.service.ts's resetPassword.
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
