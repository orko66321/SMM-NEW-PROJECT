import { z } from "zod";

/**
 * Single source of truth for request/response shapes shared between
 * apps/api and apps/web. String literal unions here MUST stay in sync
 * with the enum values in apps/api/prisma/schema.prisma.
 */

// ── Enums ────────────────────────────────────────────────────────────────

export const RoleValues = ["USER", "STAFF", "ADMIN"] as const;
export type Role = (typeof RoleValues)[number];

export const OrderStatusValues = [
  "PENDING",
  "PROCESSING",
  "IN_PROGRESS",
  "COMPLETED",
  "PARTIAL",
  "CANCELED",
  "FAILED",
] as const;
export type OrderStatus = (typeof OrderStatusValues)[number];

export const TicketStatusValues = ["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED"] as const;
export type TicketStatus = (typeof TicketStatusValues)[number];

export const DepositStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;
export type DepositStatus = (typeof DepositStatusValues)[number];

export const UserStatusValues = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof UserStatusValues)[number];

// ── Common ───────────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// Usernames: letters/numbers/underscore only, 3-32 chars — avoids
// homoglyph/whitespace tricks in a field rendered back to admins.
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores");

// OWASP-minimum password policy; actual strength enforced by Argon2id cost on the server.
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

// ── Auth ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255), // username or email
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(RoleValues),
  status: z.enum(UserStatusValues),
  createdAt: z.string(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

// ── Wallet ───────────────────────────────────────────────────────────────

// Phase 3: replaces the old free-text `method` deposit form — the user now
// picks a real PaymentMethod row (see below) and supplies proof of a manual
// transfer (trxId + senderNumber), which the server dedupes and snapshots.
export const createManualDepositSchema = z.object({
  paymentMethodId: z.string(),
  amount: z.coerce.number().positive().max(1_000_000),
  trxId: z.string().trim().min(3).max(100),
  senderNumber: z.string().trim().min(5).max(20),
});
export type CreateManualDepositInput = z.infer<typeof createManualDepositSchema>;

export const reviewDepositSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional(),
});
export type ReviewDepositInput = z.infer<typeof reviewDepositSchema>;

export const adjustWalletSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(3).max(500),
});
export type AdjustWalletInput = z.infer<typeof adjustWalletSchema>;

// ── Services / Categories ───────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  platform: z.string().trim().min(2).max(50),
  sortOrder: z.coerce.number().int().default(0),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Kept as a plain ZodObject (not the refined version below) so admin update
// routes can call `.partial()` on it — `.refine()` returns a ZodEffects,
// which does not support `.partial()`.
export const serviceObjectSchema = z.object({
  categoryId: z.string(),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  sellPricePer1000: z.coerce.number().positive().max(1_000_000),
  providerCostPer1000: z.coerce.number().nonnegative().max(1_000_000),
  minQuantity: z.coerce.number().int().positive(),
  maxQuantity: z.coerce.number().int().positive(),
  refillEnabled: z.boolean().default(false),
  cancelEnabled: z.boolean().default(false),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  providerId: z.string().nullable().optional(),
  providerServiceId: z.string().trim().max(100).nullable().optional(),
  backupProviderId: z.string().nullable().optional(),
  // Opt-in per service — see Provider API sync (Phase 2). Defaults to false
  // so adding a provider mapping never silently starts auto-fulfilling a
  // service until an admin explicitly verifies it.
  autoSubmit: z.boolean().default(false),
});

export const serviceInputSchema = serviceObjectSchema.refine((s) => s.maxQuantity >= s.minQuantity, {
  message: "maxQuantity must be >= minQuantity",
  path: ["maxQuantity"],
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

// ── Orders ───────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  serviceId: z.string(),
  link: z.string().trim().url().max(2048),
  quantity: z.coerce.number().int().positive().max(2_147_483_647),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatusValues),
  startCount: z.coerce.number().int().nonnegative().optional(),
  remains: z.coerce.number().int().nonnegative().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ── Tickets ──────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(1).max(5000),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const createTicketMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(TicketStatusValues),
});
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

// ── Admin: users ─────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  status: z.enum(UserStatusValues).optional(),
  role: z.enum(RoleValues).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ── Providers (Phase 2: upstream SMM reseller API) ─────────────────────────

export const createProviderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  apiUrl: z.string().trim().url().max(500),
  apiKey: z.string().trim().min(8).max(500),
});
export type CreateProviderInput = z.infer<typeof createProviderSchema>;

// apiKey is optional on update — omit it to keep the existing encrypted key
// (the admin UI never re-displays a stored key, so there's nothing to prefill).
export const updateProviderSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  apiUrl: z.string().trim().url().max(500).optional(),
  apiKey: z.string().trim().min(8).max(500).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;

// ── Payment gateways (Phase 2 framework; Phase 3 adds ZiniPay) ─────────────

export const PaymentGatewayKeys = ["BKASH", "ZINIPAY"] as const;
export type PaymentGatewayKey = (typeof PaymentGatewayKeys)[number];

export const bkashCredentialsSchema = z.object({
  appKey: z.string().trim().min(1),
  appSecret: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().min(1),
  baseUrl: z.string().trim().url(),
});
export type BkashCredentials = z.infer<typeof bkashCredentialsSchema>;

// Per ZiniPay's public docs (https://zinipay.com/docs): a single API key is
// the only documented auth mechanism, and no webhook signature scheme is
// documented — ZiniPay's own guidance is "always verify from your backend,"
// which is exactly what confirm() does regardless of what a webhook claims.
// `secretKey` is stored for forward compatibility only; the adapter does not
// use it today (see services/payments/zinipay.ts).
export const zinipayCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1),
  secretKey: z.string().trim().optional(),
  baseUrl: z.string().trim().url().default("https://api.zinipay.com"),
});
export type ZiniPayCredentials = z.infer<typeof zinipayCredentialsSchema>;

// Keyed lookup so admin config validation can pick the right shape for
// whichever gateway key is being saved, without a giant if/else chain.
export const gatewayCredentialsSchemas = {
  BKASH: bkashCredentialsSchema,
  ZINIPAY: zinipayCredentialsSchema,
} satisfies Record<PaymentGatewayKey, z.ZodTypeAny>;

// `credentials` is validated server-side against gatewayCredentialsSchemas[provider]
// (see apps/api/src/services/payments/config.service.ts) — kept generic here
// since the shape genuinely differs per gateway.
export const updateGatewayConfigSchema = z.object({
  mode: z.enum(["SANDBOX", "LIVE"]),
  enabled: z.boolean(),
  credentials: z.record(z.string(), z.unknown()),
});
export type UpdateGatewayConfigInput = z.infer<typeof updateGatewayConfigSchema>;

export const createGatewayDepositSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  paymentMethodId: z.string().optional(),
});
export type CreateGatewayDepositInput = z.infer<typeof createGatewayDepositSchema>;

// ── Payment methods (Phase 3 — dynamic, admin-managed) ─────────────────────

export const PaymentMethodGatewayTypeValues = ["AUTOMATED", "MANUAL"] as const;
export type PaymentMethodGatewayType = (typeof PaymentMethodGatewayTypeValues)[number];

export const PaymentMethodAccountTypeValues = ["PERSONAL", "MERCHANT", "AGENT"] as const;
export type PaymentMethodAccountType = (typeof PaymentMethodAccountTypeValues)[number];

// Base object (no .refine()) so admin update routes can call `.partial()` —
// same reasoning as serviceObjectSchema above.
export const paymentMethodObjectSchema = z.object({
  title: z.string().trim().min(2).max(100),
  gatewayType: z.enum(PaymentMethodGatewayTypeValues),
  accountType: z.enum(PaymentMethodAccountTypeValues).default("PERSONAL"),
  // "Manage multiple numbers simultaneously" (per the spec) means creating
  // multiple PaymentMethod rows — e.g. "bKash Personal #1" / "#2" — each
  // with its own single accountNumber, rather than a list on one row.
  accountNumber: z.string().trim().max(50).nullable().optional(),
  instructions: z.string().trim().max(2000).nullable().optional(),
  minAmount: z.coerce.number().nonnegative().default(0.2),
  maxAmount: z.coerce.number().positive().default(100_000),
  bonusPercent: z.coerce.number().min(0).max(100).default(0),
  gatewayProvider: z.enum(PaymentGatewayKeys).nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  sortOrder: z.coerce.number().int().default(0),
});

export const paymentMethodInputSchema = paymentMethodObjectSchema
  .refine((v) => v.maxAmount >= v.minAmount, { message: "maxAmount must be >= minAmount", path: ["maxAmount"] })
  .refine((v) => v.gatewayType === "MANUAL" || !!v.gatewayProvider, {
    message: "AUTOMATED methods require a gatewayProvider",
    path: ["gatewayProvider"],
  });
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;
