import argon2 from "argon2";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { ARGON2_OPTIONS } from "../src/services/auth.service.js";
import { encrypt } from "../src/lib/crypto.js";

export const app = createApp();

// Deletes in child-to-parent order to satisfy foreign key constraints.
export async function resetDb() {
  await prisma.walletTransaction.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.providerSyncLog.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.paymentGatewayConfig.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(opts: { role?: "USER" | "STAFF" | "ADMIN"; balance?: number } = {}) {
  const passwordHash = await argon2.hash("Password123!", ARGON2_OPTIONS);
  const user = await prisma.user.create({
    data: {
      username: `user_${Math.random().toString(36).slice(2, 10)}`,
      email: `${Math.random().toString(36).slice(2, 10)}@test.local`,
      passwordHash,
      role: opts.role ?? "USER",
      wallet: { create: { balance: opts.balance ?? 0 } },
    },
  });
  return user;
}

export async function createCategoryAndService(
  overrides: Partial<{
    sellPricePer1000: number;
    minQuantity: number;
    maxQuantity: number;
    autoSubmit: boolean;
    providerId: string;
    backupProviderId: string;
    providerServiceId: string;
  }> = {},
) {
  const category = await prisma.serviceCategory.create({
    data: { name: "Test Category", platform: "Instagram", sortOrder: 0 },
  });
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      name: "Test Service",
      sellPricePer1000: overrides.sellPricePer1000 ?? 10,
      providerCostPer1000: 5,
      minQuantity: overrides.minQuantity ?? 100,
      maxQuantity: overrides.maxQuantity ?? 100_000,
      status: "ACTIVE",
      autoSubmit: overrides.autoSubmit ?? false,
      providerId: overrides.providerId,
      backupProviderId: overrides.backupProviderId,
      providerServiceId: overrides.providerServiceId ?? "1",
    },
  });
  return { category, service };
}

export async function createProvider(overrides: Partial<{ name: string; apiUrl: string; apiKey: string }> = {}) {
  return prisma.provider.create({
    data: {
      name: overrides.name ?? "Test Provider",
      apiUrl: overrides.apiUrl ?? "http://127.0.0.1:0/api/v2",
      apiKeyCiphertext: encrypt(overrides.apiKey ?? "test-provider-key"),
    },
  });
}
