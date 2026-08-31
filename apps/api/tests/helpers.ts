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
  await prisma.ticketOrderAction.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.refillRequest.deleteMany();
  await prisma.stockCode.deleteMany();
  await prisma.order.deleteMany();
  await prisma.packageStockPool.deleteMany();
  await prisma.stockPool.deleteMany();
  await prisma.package.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.orderIntent.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.providerSyncLog.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.paymentGatewayConfig.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.siteNotice.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.post.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.supportChannel.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(opts: { role?: "USER" | "MODERATOR" | "ADMIN"; balance?: number } = {}) {
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
    refillEnabled: boolean;
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
      refillEnabled: overrides.refillEnabled ?? false,
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

export async function createPaymentMethod(
  overrides: Partial<{
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    accountNumber: string | null;
    gatewayProvider: string | null;
    bonusPercent: number;
    minAmount: number;
    maxAmount: number;
    status: "ACTIVE" | "DISABLED";
  }> = {},
) {
  return prisma.paymentMethod.create({
    data: {
      title: overrides.title ?? "Test Method",
      gatewayType: overrides.gatewayType ?? "MANUAL",
      accountNumber: overrides.accountNumber ?? "01700000000",
      gatewayProvider: overrides.gatewayProvider,
      bonusPercent: overrides.bonusPercent ?? 0,
      minAmount: overrides.minAmount ?? 0.2,
      maxAmount: overrides.maxAmount ?? 1000,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function enableGateway(
  provider: "BKASH" | "ZINIPAY",
  credentials: Record<string, unknown>,
  opts: { autoVerify?: boolean } = {},
) {
  const { upsertGatewayConfig } = await import("../src/services/payments/config.service.js");
  await upsertGatewayConfig(provider, { mode: "SANDBOX", enabled: true, autoVerify: opts.autoVerify ?? true, credentials });
}

export async function createBrand(overrides: Partial<{ name: string; level: number; isActive: boolean }> = {}) {
  return prisma.brand.create({
    data: { name: overrides.name ?? "Test Brand", level: overrides.level ?? 0, isActive: overrides.isActive ?? true },
  });
}

export async function createProduct(
  brandId: string,
  overrides: Partial<{
    name: string;
    slug: string;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    serviceId: string | null;
    isActive: boolean;
    userInputFieldName: string;
    hasOrderTimeLimit: boolean;
    maxOrdersPerWindow: number | null;
    orderWindowHours: number | null;
    removeCharacters: string | null;
  }> = {},
) {
  return prisma.product.create({
    data: {
      brandId,
      name: overrides.name ?? "Test Product",
      slug: overrides.slug ?? `test-product-${Math.random().toString(36).slice(2, 8)}`,
      salePrice: 0,
      productType: overrides.productType ?? "TOPUP",
      accessType: overrides.accessType ?? "ALL",
      serviceId: overrides.serviceId,
      isActive: overrides.isActive ?? true,
      userInputFieldName: overrides.userInputFieldName ?? "Player ID",
      hasOrderTimeLimit: overrides.hasOrderTimeLimit ?? false,
      maxOrdersPerWindow: overrides.maxOrdersPerWindow,
      orderWindowHours: overrides.orderWindowHours,
      removeCharacters: overrides.removeCharacters,
    },
  });
}

export async function createPackage(
  productId: string,
  overrides: Partial<{ name: string; amount: number; salePrice: number; buyPrice: number; commonPriceUsd: number; extraFee: number; isAuto: boolean; isManual: boolean }> = {},
) {
  return prisma.package.create({
    data: {
      productId,
      name: overrides.name ?? "Test Package",
      amount: overrides.amount ?? 1,
      salePrice: overrides.salePrice ?? 10,
      buyPrice: overrides.buyPrice ?? 5,
      commonPriceUsd: overrides.commonPriceUsd ?? 10,
      extraFee: overrides.extraFee ?? 0,
      isAuto: overrides.isAuto ?? false,
      isManual: overrides.isManual ?? false,
    },
  });
}

export async function createStockPoolWithCodes(codes: string[], name?: string) {
  const pool = await prisma.stockPool.create({ data: { name: name ?? `Pool ${Math.random().toString(36).slice(2, 8)}` } });
  if (codes.length > 0) {
    await prisma.stockCode.createMany({ data: codes.map((code) => ({ poolId: pool.id, codeCiphertext: encrypt(code) })) });
  }
  return pool;
}

export async function createCoupon(
  overrides: Partial<{ code: string; type: "PERCENT" | "FIXED"; value: number; maxUses: number | null; active: boolean; expiresAt: Date | null }> = {},
) {
  return prisma.coupon.create({
    data: {
      code: overrides.code ?? `TEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      type: overrides.type ?? "PERCENT",
      value: overrides.value ?? 10,
      maxUses: overrides.maxUses,
      active: overrides.active ?? true,
      expiresAt: overrides.expiresAt,
    },
  });
}
