import { z } from "zod";

/**
 * Single source of truth for request/response shapes shared between
 * apps/api and apps/web. String literal unions here MUST stay in sync
 * with the enum values in apps/api/prisma/schema.prisma.
 */

// ── Enums ────────────────────────────────────────────────────────────────

// Keep in sync with the Prisma `Role` enum. MODERATOR = support agent
// (see apps/api/src/routes/admin/index.ts for exactly what it can reach).
export const RoleValues = ["USER", "MODERATOR", "ADMIN"] as const;
export type Role = (typeof RoleValues)[number];

// Admin-assignable roles, in ascending order of privilege — powers the
// Role <select> on the admin User Detail page.
export const AssignableRoleValues = ["USER", "MODERATOR", "ADMIN"] as const;

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

export const TicketStatusValues = [
  "OPEN",
  "PENDING_ADMIN",
  "PENDING_USER",
  "CLOSED",
  "AI_PROCESSING",
  "RESOLVED",
  "ESCALATED",
  "IN_PROGRESS",
  "REPLIED",
] as const;
export type TicketStatus = (typeof TicketStatusValues)[number];

// Internal verb for an AI Support subcategory — kept in sync with the
// TicketActionKey enum in schema.prisma. Drives services/ticketAutomation.service.ts.
export const TicketActionKeyValues = [
  "REFILL",
  "CANCEL",
  "SPEED_UP",
  "RESTART",
  "FAKE_COMPLETE",
  "OTHER",
] as const;
export type TicketActionKey = (typeof TicketActionKeyValues)[number];

export const TicketOrderActionResultValues = [
  "SUCCESS",
  "FAILED",
  "NOT_ELIGIBLE",
  "ESCALATED",
  "PENDING",
] as const;
export type TicketOrderActionResult = (typeof TicketOrderActionResultValues)[number];

export const DepositStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;
export type DepositStatus = (typeof DepositStatusValues)[number];

export const UserStatusValues = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof UserStatusValues)[number];

export const RefillStatusValues = ["REQUESTED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;
export type RefillStatus = (typeof RefillStatusValues)[number];

// ── Common ───────────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Upper bound is 200, not 100: several admin screens deliberately fetch a
  // whole bounded list in one page to populate a <select> (Packages → product
  // & stock-pool pickers, Products → services picker all request pageSize=200).
  // A stricter cap here silently 400s those requests and leaves the dropdowns
  // empty. Keep it high enough for those "load all options" calls but still
  // bounded so a list endpoint can't be asked for an unbounded page.
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// Every "list" route that also accepts a filter (status/search/categoryId)
// beyond page/pageSize needs its OWN schema, not the bare
// paginationQuerySchema above — zod objects strip unrecognized keys by
// default, so validating against paginationQuerySchema silently drops
// `search`/`status`/`categoryId` from req.query before the route handler
// ever reads them (found while adding service search-by-product-code; it
// turned out every filter box wired this way — Orders, Deposits, Tickets,
// Users, Services — was already silently non-functional the same way).
const searchQueryField = z.string().trim().max(200).optional();

export const serviceListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().optional(),
  search: searchQueryField,
});
export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;

// Paginated history behind the "Recently Completed" badge — its own schema
// (smaller default page, tighter cap) rather than the shared 20/200 one, and
// fetched on demand, never with the main services list.
export const serviceCompletedOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ServiceCompletedOrdersQuery = z.infer<typeof serviceCompletedOrdersQuerySchema>;

// One row in that history modal. `completionSeconds` is null only for a
// legacy order whose duration could not be backfilled.
export interface ServiceCompletedOrderRow {
  id: string;
  completedAt: string;
  completionSeconds: number | null;
  quantity: number;
  status: "COMPLETED" | "PARTIAL";
}

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(OrderStatusValues).optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

// from/to power the admin dashboard's "More info" deep links (Today Orders,
// This Month Orders, etc.) — an open-ended range (only `from` set) reads as
// "from that point through now", matching the dashboard's own bucketing.
// likeOnly is a raw "true"/"false" string rather than z.coerce.boolean():
// Boolean("false") is true in JS, so a naive coerce would make ?likeOnly=false
// silently behave like ?likeOnly=true.
export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(OrderStatusValues).optional(),
  search: searchQueryField,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  likeOnly: z.enum(["true", "false"]).optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const adminRefillListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(RefillStatusValues).optional(),
});
export type AdminRefillListQuery = z.infer<typeof adminRefillListQuerySchema>;

export const depositListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(DepositStatusValues).optional(),
});
export type DepositListQuery = z.infer<typeof depositListQuerySchema>;

export const ticketListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(TicketStatusValues).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const userListQuerySchema = paginationQuerySchema.extend({
  search: searchQueryField,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

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
  // Referral code from ?ref= or the manual field on the register form. A
  // code that doesn't resolve to a user is silently ignored server-side.
  referralCode: z.string().trim().max(32).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255), // username or email
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

// The credential is a signed Google ID token (a JWT) handed to the frontend
// by Google Identity Services — the server is the only party that verifies
// it (see services/auth.service.ts's verifyGoogleIdToken), never trusted as
// proof of identity just because it's shaped like a JWT.
export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(10),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(RoleValues),
  status: z.enum(UserStatusValues),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  // Store Access Type gating — see Product.accessType / User.isVip.
  isVip: z.boolean(),
  isReseller: z.boolean(),
  // First-deposit-bonus / referral gating and the "First Deposit Offer"
  // banner; `referralCode` powers the Refer & Earn page's share link.
  hasDeposited: z.boolean(),
  referralCode: z.string(),
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
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
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
  // Optional Bengali overrides shown to viewers on the Bengali language
  // setting; blank/omitted falls back to name/description (see
  // apps/web/src/i18n/pickLang.ts). Nullable so an admin can clear one.
  nameBn: z.string().trim().max(200).nullable().optional(),
  descriptionBn: z.string().trim().max(2000).nullable().optional(),
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

// `comment` / `commentLink`: an optional customer-facing note the admin can
// attach in the SAME request that changes the status (e.g. picking the
// "wrong UID" or "cancelled & refunded" template while cancelling). Empty
// string / null clears any existing note; omitted leaves it untouched.
const orderCommentText = z.string().trim().max(2000);
const orderCommentUrl = z.string().trim().url().max(2048).or(z.literal(""));

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatusValues),
  startCount: z.coerce.number().int().nonnegative().optional(),
  remains: z.coerce.number().int().nonnegative().optional(),
  comment: orderCommentText.nullable().optional(),
  commentLink: orderCommentUrl.nullable().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// Standalone "save the per-order note" (POST /admin/orders/:id/comment) —
// touches only the note, never the order status.
export const orderCommentSchema = z.object({
  comment: orderCommentText.nullable().optional(),
  commentLink: orderCommentUrl.nullable().optional(),
});
export type OrderCommentInput = z.infer<typeof orderCommentSchema>;

// Canned notice templates (admin "Comment" menu). `link` is an optional CTA
// URL shown next to the note on the customer's order.
export const commentTemplateInputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  link: orderCommentUrl.nullable().optional(),
});
export type CommentTemplateInput = z.infer<typeof commentTemplateInputSchema>;

// A manual-mode (or never-auto-submitted) refill has no provider to poll —
// an admin resolves it by hand, same REQUESTED-queue shape as manual deposit
// review (see reviewDeposit / admin/deposits.routes.ts).
export const resolveManualRefillSchema = z.object({
  status: z.enum(["COMPLETED", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});
export type ResolveManualRefillInput = z.infer<typeof resolveManualRefillSchema>;

// ── Tickets ──────────────────────────────────────────────────────────────

// One Category selector drives the rest of the form. "AI Support"
// (isAutomated) needs subcategoryId + orderIds and no free text; "Human
// Support" needs a message. The subject is generated server-side (see
// services/ticket.service.ts buildSubject) — there is no subject input.
// orderIds is the raw comma-separated string ("10867,10868") — parsed,
// ownership-checked, and capped server-side, deliberately not constrained
// here (matches the reference implementation).
export const createTicketSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).optional(),
  orderIds: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(5000).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// The thread-view reply box re-uses the exact same form, so a user reply
// carries the same shape as a create — it can submit another AI Support
// action mid-conversation or switch to Human Support to escalate.
export const ticketReplySchema = z.object({
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().min(1).optional(),
  orderIds: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(5000).optional(),
});
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

// Admin/agent replies are always plain free text.
export const createTicketMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(TicketStatusValues),
});
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

// Agent manual-override buttons on the admin ticket view. refill/cancel/
// restart call the SAME service functions the automation engine uses (one
// service layer, two callers) against a single linked order.
export const TicketAgentActionValues = ["refill", "cancel", "restart", "close", "reopen"] as const;
export type TicketAgentAction = (typeof TicketAgentActionValues)[number];
export const adminTicketActionSchema = z.object({
  action: z.enum(TicketAgentActionValues),
  orderId: z.string().min(1).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type AdminTicketActionInput = z.infer<typeof adminTicketActionSchema>;

// Public shape for the category/subcategory list the ticket form renders from.
export const ticketSubcategoryDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  actionKey: z.enum(TicketActionKeyValues),
});
export const ticketCategoryDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  isAutomated: z.boolean(),
  subcategories: z.array(ticketSubcategoryDtoSchema),
});
export type TicketCategoryDto = z.infer<typeof ticketCategoryDtoSchema>;

// ── Admin: users ─────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  status: z.enum(UserStatusValues).optional(),
  role: z.enum(RoleValues).optional(),
  // Store Access Type gating (Product.accessType) — see User.isVip / User.isReseller.
  isVip: z.boolean().optional(),
  isReseller: z.boolean().optional(),
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

// Bulk service import — pulls a provider's full JAP-standard catalog and
// creates Service (+ auto-created ServiceCategory) rows from it in one
// batch. See services/providerImport.service.ts.
export const bulkImportProviderServicesSchema = z.object({
  // The provider's own service ids (ProviderServiceEntry.service), not our
  // cuids. Capped well above any real catalog seen so far (my.smmgen.com
  // alone has ~7,800 services) rather than at a number that felt generous
  // in the abstract — the request body itself is tiny either way (just ids,
  // not full service objects), so this is a sanity ceiling against a
  // malformed/malicious request, not a real capacity constraint.
  providerServiceIds: z.array(z.string().trim().min(1)).min(1).max(50_000),
  markupPercent: z.coerce.number().min(0).max(1000).default(20),
  // Defaults false — same "opt-in per service, never trust an unverified
  // provider mapping" rule as serviceObjectSchema.autoSubmit. A bulk import
  // is exactly the kind of unverified mapping that rule exists for.
  autoSubmit: z.boolean().default(false),
});
export type BulkImportProviderServicesInput = z.infer<typeof bulkImportProviderServicesSchema>;

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
// use it today (see services/payments/zinipay.ts). `merchantId` is the same
// treatment, added per admin request — ZiniPay's documented API never asks
// for one, so it is stored but unused until/unless a real account shows it's
// required.
export const zinipayCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1),
  secretKey: z.string().trim().optional(),
  merchantId: z.string().trim().optional(),
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
  // Defaults true so existing callers (and the Phase 2/3 behavior) are
  // unaffected unless an admin explicitly flips it off — see PaymentGatewayConfig.autoVerify.
  autoVerify: z.boolean().default(true),
  credentials: z.record(z.string(), z.unknown()),
});
export type UpdateGatewayConfigInput = z.infer<typeof updateGatewayConfigSchema>;

export const createGatewayDepositSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
  // Set when this deposit is funding a specific insufficient-balance order
  // redirect (see OrderIntent / createOrderOrRedirect) rather than a plain
  // top-up — ownership + status are re-checked server-side regardless.
  orderIntentId: z.string().optional(),
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

// ── Phase 4: settings, notices, coupons, password reset, profile, api keys ─

export const LiveChatProviderValues = ["NONE", "TAWKTO", "CRISP"] as const;
export type LiveChatProvider = (typeof LiveChatProviderValues)[number];

export const DisplayCurrencyValues = ["USD", "BDT"] as const;

export const ReferrerRewardTypeValues = ["PERCENTAGE", "FIXED"] as const;
export type ReferrerRewardType = (typeof ReferrerRewardTypeValues)[number];
export const ReferralStatusValues = ["COMPLETED", "FAILED"] as const;
export type ReferralStatus = (typeof ReferralStatusValues)[number];
export type DisplayCurrency = (typeof DisplayCurrencyValues)[number];

export const NoticeLevelValues = ["INFO", "WARNING", "SUCCESS", "ERROR"] as const;
export type NoticeLevel = (typeof NoticeLevelValues)[number];

// Admin-facing settings update — SMTP password is optional-on-update (same
// reasoning as updateProviderSchema.apiKey: omit to keep the existing
// encrypted value, since it's never re-displayed after saving).
export const updateSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(100),
  // Legacy — the floating support button is now managed via SupportChannel
  // (see supportChannelUpdateSchema below). Kept optional so an older admin
  // client still validates; the API no longer reads or writes these.
  whatsappEnabled: z.boolean().optional(),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  liveChatProvider: z.enum(LiveChatProviderValues),
  liveChatWidgetId: z.string().trim().max(200).nullable().optional(),
  // Optional "How to order?" tutorial link. Empty string is accepted and
  // normalised to null server-side (settings.service.ts) so the admin can
  // clear it; a non-empty value must be a valid URL.
  howToOrderVideoUrl: z.string().trim().url().max(2048).or(z.literal("")).nullable().optional(),
  usdToBdtRate: z.coerce.number().positive().max(10_000),
  defaultCurrency: z.enum(DisplayCurrencyValues),
  smtpEnabled: z.boolean(),
  smtpHost: z.string().trim().max(255).nullable().optional(),
  smtpPort: z.coerce.number().int().positive().max(65_535).nullable().optional(),
  smtpUser: z.string().trim().max(255).nullable().optional(),
  smtpPassword: z.string().trim().max(500).optional(), // write-only; omit to keep existing
  smtpFromAddress: z.string().trim().max(255).nullable().optional(),
  // Admin Orders "Resend to provider" kill-switch. Optional so an older
  // admin client still validates; settings.service leaves it untouched when omitted.
  resendOrderButtonEnabled: z.boolean().optional(),
  // One-time first-deposit bonus (all amounts USD). Each optional so an
  // older admin client still validates; settings.service skips undefined.
  firstDepositBonusEnabled: z.boolean().optional(),
  firstDepositBonusPercent: z.coerce.number().min(0).max(100).optional(),
  firstDepositMinAmount: z.coerce.number().min(0).max(1_000_000).optional(),
  firstDepositMaxBonus: z.coerce.number().min(0).max(1_000_000).optional(),
  // Referral program (all amounts USD).
  referralSystemEnabled: z.boolean().optional(),
  referrerRewardType: z.enum(ReferrerRewardTypeValues).optional(),
  referrerRewardValue: z.coerce.number().min(0).max(1_000_000).optional(),
  refereeBonusPercent: z.coerce.number().min(0).max(100).optional(),
  // Service "Average Time" tuning. Optional so an older admin client still
  // validates; settings.service skips undefined.
  avgCompletionSampleSize: z.coerce.number().int().min(1).max(100).optional(),
  recentlyCompletedWindowHours: z.coerce.number().int().min(1).max(720).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Admin-only "Send test email" action (Settings -> SMTP card) — lets the
// operator confirm their saved SMTP config actually works without triggering
// a real password-reset flow. Always uses the saved SMTP password
// server-side; this just carries the destination address.
export const sendTestEmailSchema = z.object({
  to: z.string().trim().email(),
});
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;

export const publicSettingsSchema = z.object({
  siteName: z.string(),
  liveChatProvider: z.enum(LiveChatProviderValues),
  liveChatWidgetId: z.string().nullable(),
  howToOrderVideoUrl: z.string().nullable(),
  usdToBdtRate: z.string(),
  defaultCurrency: z.enum(DisplayCurrencyValues),
  // Derived from env (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET), not stored
  // in SiteSettings — lets the frontend hide the Google button entirely
  // rather than show one that always fails. See env.ts's googleAuthEnabled.
  googleAuthEnabled: z.boolean(),
  // First-deposit bonus + referral program — non-secret knobs the Add Funds
  // banner and Refer & Earn page need. Decimals arrive as strings (like
  // usdToBdtRate) and are Number()'d client-side.
  firstDepositBonusEnabled: z.boolean(),
  firstDepositBonusPercent: z.string(),
  firstDepositMinAmount: z.string(),
  firstDepositMaxBonus: z.string(),
  referralSystemEnabled: z.boolean(),
  referrerRewardType: z.enum(ReferrerRewardTypeValues),
  referrerRewardValue: z.string(),
  refereeBonusPercent: z.string(),
  // The frontend needs the window to decide whether a service's
  // "Recently Completed" badge shows (compared against Service.lastCompletedAt).
  recentlyCompletedWindowHours: z.number(),
});
export type PublicSettings = z.infer<typeof publicSettingsSchema>;

// Bilingual "Important Notice" box on the New Order sidebar — singleton
// (see SiteNotice model). All content fields optional/nullable: an admin
// may fill in only one language, and the frontend falls back to whichever
// language actually has content (see dashboard/NewOrder.tsx).
export const updateSiteNoticeSchema = z.object({
  titleBn: z.string().trim().max(200).nullable().optional(),
  titleEn: z.string().trim().max(200).nullable().optional(),
  bodyBn: z.string().trim().max(5000).nullable().optional(),
  bodyEn: z.string().trim().max(5000).nullable().optional(),
  isActive: z.boolean(),
});
export type UpdateSiteNoticeInput = z.infer<typeof updateSiteNoticeSchema>;

export const siteNoticeSchema = z.object({
  titleBn: z.string().nullable(),
  titleEn: z.string().nullable(),
  bodyBn: z.string().nullable(),
  bodyEn: z.string().nullable(),
  isActive: z.boolean(),
});
export type SiteNotice = z.infer<typeof siteNoticeSchema>;

export const publicSiteNoticeSchema = z.object({
  titleBn: z.string().nullable(),
  titleEn: z.string().nullable(),
  bodyBn: z.string().nullable(),
  bodyEn: z.string().nullable(),
});
export type PublicSiteNotice = z.infer<typeof publicSiteNoticeSchema>;

// ── Support channels (floating "Need Help?" widget) ─────────────────────

// Fixed set — each has a server-side href template (services/supportChannel
// .service.ts). TICKET is the built-in "open a support ticket" action and
// carries no `value`. Keep in sync with the Prisma SupportChannelType enum.
export const SupportChannelTypeValues = [
  "WHATSAPP",
  "TELEGRAM",
  "MESSENGER",
  "CUSTOM",
  "TICKET",
] as const;
export type SupportChannelType = (typeof SupportChannelTypeValues)[number];

// Admin edit for one channel row. `value` is the raw phone / handle / URL
// (ignored for TICKET); `label` is an optional display-name override and is
// required for CUSTOM. Per-type validity (non-empty value when enabling,
// valid URL for CUSTOM) is enforced in the service so the message can be
// specific.
export const supportChannelUpdateSchema = z.object({
  enabled: z.boolean(),
  value: z.string().trim().max(2048).nullable().optional(),
  label: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});
export type SupportChannelUpdateInput = z.infer<typeof supportChannelUpdateSchema>;

// Admin-facing row (raw stored fields).
export const adminSupportChannelSchema = z.object({
  type: z.enum(SupportChannelTypeValues),
  enabled: z.boolean(),
  value: z.string().nullable(),
  label: z.string().nullable(),
  sortOrder: z.number(),
});
export type AdminSupportChannel = z.infer<typeof adminSupportChannelSchema>;

// Public row — only enabled channels, href already built (null for TICKET,
// which the widget handles with an in-app modal). `external` ⇒ open in a
// new tab.
export const publicSupportChannelSchema = z.object({
  type: z.enum(SupportChannelTypeValues),
  label: z.string(),
  href: z.string().nullable(),
  external: z.boolean(),
});
export type PublicSupportChannel = z.infer<typeof publicSupportChannelSchema>;

// Homepage + dashboard Overview banner slider. `image` is a base64 data URI
// (see the Banner model comment in schema.prisma for why — no filesystem
// storage survives a cPanel deploy here). Capped well above any real
// banner image but still a real ceiling against a malformed/malicious
// request — ~2.2MB of raw image data after base64's ~33% overhead.
export const bannerInputSchema = z.object({
  link: z.string().trim().min(1).max(2048),
  image: z.string().trim().min(1).max(3_000_000),
  // Deliberately signed — an admin pins a banner first by giving it a very
  // negative order rather than renumbering every other row.
  order: z.coerce.number().int(),
});
export type BannerInput = z.infer<typeof bannerInputSchema>;

// Kept as a plain ZodObject (not the refined version below) so the admin
// PUT route can call `.partial()` on it — same reasoning as
// serviceObjectSchema/serviceInputSchema above (`.refine()` returns a
// ZodEffects, which doesn't support `.partial()`).
export const noticeObjectSchema = z.object({
  messageBn: z.string().trim().max(500).nullable().optional(),
  messageEn: z.string().trim().max(500).nullable().optional(),
  level: z.enum(NoticeLevelValues).default("INFO"),
  active: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const noticeInputSchema = noticeObjectSchema.refine((n) => !!n.messageBn?.trim() || !!n.messageEn?.trim(), {
  message: "At least one of messageBn or messageEn is required",
  path: ["messageEn"],
});
export type NoticeInput = z.infer<typeof noticeInputSchema>;

export const CouponTypeValues = ["PERCENT", "FIXED"] as const;
export type CouponType = (typeof CouponTypeValues)[number];

export const couponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Code may only contain letters, numbers, underscore, and hyphen"),
  type: z.enum(CouponTypeValues),
  value: z.coerce.number().positive().max(1_000_000),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  active: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInputSchema>;

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(32),
  amount: z.coerce.number().positive().max(1_000_000),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3).max(255), // username or email, same as loginSchema
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(200),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  phone: z.string().trim().max(20).nullable().optional(),
  notifyEmail: z.boolean().optional(),
  notifyOrderUpdates: z.boolean().optional(),
  notifyPromotions: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  // Optional — a Google-only account (see User.passwordHash in
  // schema.prisma) has no current password to confirm; the server only
  // enforces this check when one actually exists (see
  // services/profile.service.ts's changePassword).
  currentPassword: z.string().max(128).default(""),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const dailyStatsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});
export type DailyStatsQuery = z.infer<typeof dailyStatsQuerySchema>;

// ── Documentation / Blog / Update posts ──────────────────────────────────

export const PostCategoryValues = ["DOCUMENTATION", "BLOG", "UPDATE"] as const;
export type PostCategory = (typeof PostCategoryValues)[number];

export const PostStatusValues = ["DRAFT", "PUBLISHED"] as const;
export type PostStatus = (typeof PostStatusValues)[number];

/**
 * Pull the 11-character video id out of any YouTube URL form an admin might
 * paste — watch?v=, youtu.be/, /embed/, /shorts/, or a bare id — ignoring
 * extra query params (&t=, &list=, …). Also accepts a full <iframe …> embed
 * snippet (grabs the src). Returns null for anything that isn't YouTube.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (idPattern.test(raw)) return raw;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

const postDataUriImage = z.string().trim().min(1).max(3_000_000);
// ~15MB of base64 ≈ ~11MB of actual PDF — a real ceiling against a
// malformed/oversized upload, not a capacity target. Stored in-row for the
// same no-persistent-filesystem reason as Banner.image.
const postPdfDataUri = z
  .string()
  .trim()
  .max(15_000_000)
  .regex(/^data:application\/pdf;base64,/, "PDF must be an uploaded application/pdf file");

// Plain ZodObject (no .refine()) so the admin PUT route can call .partial()
// — same reasoning as serviceObjectSchema/noticeObjectSchema above.
export const postObjectSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  category: z.enum(PostCategoryValues).default("BLOG"),
  status: z.enum(PostStatusValues).default("DRAFT"),
  coverImage: postDataUriImage.nullable().optional(),
  // Raw admin input — the server parses it to a bare id (parseYouTubeId)
  // and rejects a non-YouTube link before storing.
  youtubeUrl: z.string().trim().max(600).nullable().optional(),
  pdfFile: postPdfDataUri.nullable().optional(),
  pdfName: z.string().trim().max(255).nullable().optional(),
  titleEn: z.string().trim().max(200).nullable().optional(),
  titleBn: z.string().trim().max(200).nullable().optional(),
  contentEn: z.string().trim().max(50_000).nullable().optional(),
  contentBn: z.string().trim().max(50_000).nullable().optional(),
});

export const postInputSchema = postObjectSchema
  .refine((p) => !!p.titleEn?.trim() || !!p.titleBn?.trim(), {
    message: "A title in at least one language is required",
    path: ["titleEn"],
  })
  .refine(
    (p) => !!p.contentEn?.trim() || !!p.contentBn?.trim() || !!p.pdfFile?.trim() || !!p.youtubeUrl?.trim(),
    { message: "Add body content, a PDF, or a YouTube video", path: ["contentEn"] },
  );
export type PostInput = z.infer<typeof postInputSchema>;

export const postListQuerySchema = paginationQuerySchema.extend({
  category: z.enum(PostCategoryValues).optional(),
  status: z.enum(PostStatusValues).optional(),
});
export type PostListQuery = z.infer<typeof postListQuerySchema>;

export const publicPostListQuerySchema = z.object({
  category: z.enum(PostCategoryValues).optional(),
});

// ── Store: Brand → Product → Package ────────────────────────────────────

export const ProductDesignTemplateValues = ["SMALL_STRIP", "STANDARD_GRID", "FEATURED_LARGE"] as const;
export type ProductDesignTemplate = (typeof ProductDesignTemplateValues)[number];

export const PackageDesignTemplateValues = ["RADIO_LIST", "BOXED_GRID"] as const;
export type PackageDesignTemplate = (typeof PackageDesignTemplateValues)[number];

export const ProductTypeValues = ["TOPUP", "VOUCHER", "SMM", "SUBSCRIPTION"] as const;
export type ProductType = (typeof ProductTypeValues)[number];

export const AccessTypeValues = ["ALL", "VIP", "RESELLER"] as const;
export type AccessType = (typeof AccessTypeValues)[number];

export const StockCodeStatusValues = ["AVAILABLE", "CONSUMED", "REVOKED"] as const;
export type StockCodeStatus = (typeof StockCodeStatusValues)[number];

// Plain ZodObject (no .refine()) so admin PUT routes can call `.partial()` —
// same convention as serviceObjectSchema elsewhere in this file.
export const brandObjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  level: z.coerce.number().int().default(0),
  productDesign: z.enum(ProductDesignTemplateValues).default("STANDARD_GRID"),
  logo: z.string().trim().max(3_000_000).nullable().optional(), // base64 data URI, same cap as Banner.image
  isActive: z.boolean().default(true),
});
export type BrandInput = z.infer<typeof brandObjectSchema>;

export const productObjectSchema = z.object({
  brandId: z.string(),
  name: z.string().trim().min(1).max(200),
  userInputFieldName: z.string().trim().min(1).max(100).default("Link"),
  orderInstructionsLink: z.string().trim().max(2048).nullable().optional(),
  salePrice: z.coerce.number().nonnegative().max(1_000_000),
  buyPrice: z.coerce.number().nonnegative().max(1_000_000).default(0),
  quantity: z.coerce.number().int().positive().default(1),
  productType: z.enum(ProductTypeValues),
  accessType: z.enum(AccessTypeValues).default("ALL"),
  logo: z.string().trim().max(3_000_000).nullable().optional(),
  secondaryType: z.string().trim().max(100).nullable().optional(),
  level: z.coerce.number().int().default(0),
  isAuto: z.boolean().default(false),
  isActive: z.boolean().default(true),
  productNote: z.string().trim().max(1000).nullable().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  gameCheaterType: z.string().trim().max(100).nullable().optional(),
  hasOrderTimeLimit: z.boolean().default(false),
  maxOrdersPerWindow: z.coerce.number().int().positive().nullable().optional(),
  orderWindowHours: z.coerce.number().int().positive().nullable().optional(),
  checkUniquePlayerId: z.boolean().default(false),
  isQuantityMinusOnOrder: z.boolean().default(false),
  isQuantityShowUser: z.boolean().default(false),
  isPremiumProduct: z.boolean().default(false),
  minAmountForPremium: z.coerce.number().nonnegative().max(1_000_000).nullable().optional(),
  removeCharacters: z.string().trim().max(50).nullable().optional(),
  redeemLink: z.string().trim().max(2048).nullable().optional(),
  isResellerProduct: z.boolean().default(false),
  isMysteryBox: z.boolean().default(false),
  description: z.string().trim().max(10_000).nullable().optional(),
  packageDesign: z.enum(PackageDesignTemplateValues).default("RADIO_LIST"),
  // Only meaningful for productType SMM — the existing provider-synced
  // Service this product sells (see Product.serviceId in schema.prisma).
  serviceId: z.string().nullable().optional(),
});

export const productInputSchema = productObjectSchema
  .refine((p) => p.productType !== "SMM" || !!p.serviceId, {
    message: "An SMM product must be linked to an existing Service",
    path: ["serviceId"],
  })
  .refine((p) => !p.hasOrderTimeLimit || (!!p.maxOrdersPerWindow && !!p.orderWindowHours), {
    message: "Set a max order count and time window when an order time limit is enabled",
    path: ["maxOrdersPerWindow"],
  })
  .refine((p) => !p.isPremiumProduct || p.minAmountForPremium != null, {
    message: "Set a minimum amount when Is Premium Product is enabled",
    path: ["minAmountForPremium"],
  });
export type ProductInput = z.infer<typeof productInputSchema>;

// Plain ZodObject (no .refine()) so the admin PUT route can call `.partial()`.
export const packageObjectSchema = z.object({
  productId: z.string(),
  name: z.string().trim().min(1).max(150),
  amount: z.coerce.number().int().positive(),
  salePrice: z.coerce.number().nonnegative().max(1_000_000),
  buyPrice: z.coerce.number().nonnegative().max(1_000_000).default(0),
  commonPriceUsd: z.coerce.number().nonnegative().max(1_000_000),
  extraFee: z.coerce.number().nonnegative().max(1_000_000).default(0),
  level: z.coerce.number().int().default(0),
  isAuto: z.boolean().default(false),
  isManual: z.boolean().default(false),
  server: z.string().trim().max(50).nullable().optional(),
  // "Selected relative ids" — the StockPool ids this package can claim from.
  stockPoolIds: z.array(z.string()).max(50).default([]),
});
export type PackageInput = z.infer<typeof packageObjectSchema>;

export const stockPoolInputSchema = z.object({
  name: z.string().trim().min(1).max(150),
});
export type StockPoolInput = z.infer<typeof stockPoolInputSchema>;

// Bulk-add — one code/credential per line, same "textarea, one per line"
// convention the spec calls for. Blank lines are dropped server-side.
export const stockPoolBulkAddSchema = z.object({
  codes: z.string().trim().min(1).max(500_000),
});
export type StockPoolBulkAddInput = z.infer<typeof stockPoolBulkAddSchema>;

export const brandListQuerySchema = paginationQuerySchema;
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;

export const productListQuerySchema = paginationQuerySchema.extend({
  brandId: z.string().optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const packageListQuerySchema = paginationQuerySchema.extend({
  productId: z.string().optional(),
});
export type PackageListQuery = z.infer<typeof packageListQuerySchema>;

// A Store purchase's checkout submission — `buyerInput` is whatever the
// buyer typed into the Product's custom field (link / player ID / email).
export const purchasePackageSchema = z.object({
  packageId: z.string(),
  buyerInput: z.string().trim().min(1).max(2048),
});
export type PurchasePackageInput = z.infer<typeof purchasePackageSchema>;
