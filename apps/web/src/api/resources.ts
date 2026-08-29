import type {
  AdjustWalletInput,
  BrandInput,
  BulkImportProviderServicesInput,
  ChangePasswordInput,
  CouponInput,
  CreateGatewayDepositInput,
  CreateManualDepositInput,
  CreateOrderInput,
  CreateProviderInput,
  CreateTicketInput,
  NoticeInput,
  PackageInput,
  PaymentGatewayKey,
  PaymentMethodInput,
  ProductInput,
  PurchasePackageInput,
  ResolveManualRefillInput,
  BannerInput,
  PostInput,
  SendTestEmailInput,
  ServiceInput,
  StockPoolInput,
  UpdateSiteNoticeInput,
  UpdateGatewayConfigInput,
  UpdateOrderStatusInput,
  UpdateProfileInput,
  UpdateProviderInput,
  UpdateSettingsInput,
  UpdateUserInput,
} from "@smm/shared";
import { apiClient } from "./client.js";

// ── Catalog ──────────────────────────────────────────────────────────────
export const getCategories = () => apiClient.get("/services/categories").then((r) => r.data.items);
export const getServices = (params: { page?: number; pageSize?: number; categoryId?: string; search?: string }) =>
  apiClient.get("/services", { params }).then((r) => r.data);

// ── Wallet ───────────────────────────────────────────────────────────────
export const getWallet = () => apiClient.get("/wallet").then((r) => r.data.wallet);
export const getWalletTransactions = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/wallet/transactions", { params }).then((r) => r.data);
export const createDeposit = (input: CreateManualDepositInput) => apiClient.post("/wallet/deposits", input).then((r) => r.data.deposit);
export const getMyDeposits = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/wallet/deposits", { params }).then((r) => r.data);

// ── Orders ───────────────────────────────────────────────────────────────
export const placeOrder = (input: CreateOrderInput, idempotencyKey: string) =>
  apiClient
    .post("/orders", input, { headers: { "Idempotency-Key": idempotencyKey } })
    .then((r) => r.data.order);
export const getMyOrders = (params: { page?: number; pageSize?: number; status?: string }) =>
  apiClient.get("/orders", { params }).then((r) => r.data);
export const requestOrderRefill = (orderId: string) =>
  apiClient.post(`/orders/${orderId}/refill`).then((r) => r.data.refill);

// ── Tickets ──────────────────────────────────────────────────────────────
export const getMyTickets = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/tickets", { params }).then((r) => r.data);
export const getTicket = (id: string) => apiClient.get(`/tickets/${id}`).then((r) => r.data.ticket);
export const createTicket = (input: CreateTicketInput) => apiClient.post("/tickets", input).then((r) => r.data.ticket);
export const replyToTicket = (id: string, message: string) =>
  apiClient.post(`/tickets/${id}/messages`, { message }).then((r) => r.data.message);

// ── Admin ────────────────────────────────────────────────────────────────
export const getAdminStats = () => apiClient.get("/admin/stats").then((r) => r.data);
export const getAdminOverviewStats = () => apiClient.get("/admin/stats/overview").then((r) => r.data);
export const getAdminUsers = (params: { page?: number; pageSize?: number; search?: string; from?: string; to?: string }) =>
  apiClient.get("/admin/users", { params }).then((r) => r.data);
export const getAdminUser = (id: string) => apiClient.get(`/admin/users/${id}`).then((r) => r.data.user);
export const updateAdminUser = (id: string, input: UpdateUserInput) =>
  apiClient.patch(`/admin/users/${id}`, input).then((r) => r.data.user);
export const adjustUserWallet = (userId: string, input: AdjustWalletInput) =>
  apiClient.post(`/admin/wallet/${userId}/adjust`, input).then((r) => r.data);

export const getAdminServices = (params: { page?: number; pageSize?: number; categoryId?: string; search?: string }) =>
  apiClient.get("/admin/services", { params }).then((r) => r.data);
export const createAdminService = (input: ServiceInput) => apiClient.post("/admin/services", input).then((r) => r.data.service);
export const updateAdminService = (id: string, input: Partial<ServiceInput>) =>
  apiClient.put(`/admin/services/${id}`, input).then((r) => r.data.service);
export const deleteAdminService = (id: string) => apiClient.delete(`/admin/services/${id}`);
export const getAdminCategories = () => apiClient.get("/admin/services/categories").then((r) => r.data.items);
export const createAdminCategory = (input: { name: string; platform: string; sortOrder?: number }) =>
  apiClient.post("/admin/services/categories", input).then((r) => r.data.category);

export const getAdminOrders = (params: { page?: number; pageSize?: number; status?: string; search?: string; from?: string; to?: string; likeOnly?: boolean }) =>
  apiClient.get("/admin/orders", { params }).then((r) => r.data);
export const updateAdminOrderStatus = (id: string, input: UpdateOrderStatusInput) =>
  apiClient.patch(`/admin/orders/${id}/status`, input).then((r) => r.data.order);
export const getAdminRefills = (params: { page?: number; pageSize?: number; status?: string }) =>
  apiClient.get("/admin/orders/refills", { params }).then((r) => r.data);
export const resolveAdminRefill = (id: string, input: ResolveManualRefillInput) =>
  apiClient.patch(`/admin/orders/refills/${id}`, input).then((r) => r.data.refill);

export const getAdminDeposits = (params: { page?: number; pageSize?: number; status?: string }) =>
  apiClient.get("/admin/deposits", { params }).then((r) => r.data);
export const reviewAdminDeposit = (id: string, action: "APPROVE" | "REJECT", note?: string) =>
  apiClient.post(`/admin/deposits/${id}/review`, { action, note }).then((r) => r.data.deposit);

export const getAdminTickets = (params: { page?: number; pageSize?: number; status?: string }) =>
  apiClient.get("/admin/tickets", { params }).then((r) => r.data);
export const getAdminTicket = (id: string) => apiClient.get(`/admin/tickets/${id}`).then((r) => r.data.ticket);
export const replyToAdminTicket = (id: string, message: string) =>
  apiClient.post(`/admin/tickets/${id}/messages`, { message }).then((r) => r.data.message);
export const updateAdminTicketStatus = (id: string, status: string) =>
  apiClient.patch(`/admin/tickets/${id}/status`, { status }).then((r) => r.data.ticket);

// ── Providers (Phase 2) ─────────────────────────────────────────────────
export const getAdminProviders = () => apiClient.get("/admin/providers").then((r) => r.data.items);
export const createAdminProvider = (input: CreateProviderInput) =>
  apiClient.post("/admin/providers", input).then((r) => r.data.provider);
export const updateAdminProvider = (id: string, input: UpdateProviderInput) =>
  apiClient.put(`/admin/providers/${id}`, input).then((r) => r.data.provider);
export const getAdminProviderLogs = (id: string) => apiClient.get(`/admin/providers/${id}/logs`).then((r) => r.data.items);
export const syncAdminProvider = (id: string) => apiClient.post(`/admin/providers/${id}/sync`).then((r) => r.data);
export const deleteAdminProvider = (id: string) => apiClient.delete(`/admin/providers/${id}`);

// ── Bulk service import (one-click catalog import from a provider) ──────
export const getAdminProviderImportPreview = (id: string) =>
  apiClient.get(`/admin/providers/${id}/import/preview`).then((r) => r.data);
export const bulkImportAdminProviderServices = (id: string, input: BulkImportProviderServicesInput) =>
  apiClient.post(`/admin/providers/${id}/import`, input).then((r) => r.data);

// ── Payment gateways (Phase 2) ───────────────────────────────────────────
export const getAdminGatewayConfigs = () => apiClient.get("/admin/payment-gateways").then((r) => r.data.items);
export const updateAdminGatewayConfig = (provider: PaymentGatewayKey, input: UpdateGatewayConfigInput) =>
  apiClient.put(`/admin/payment-gateways/${provider}`, input);

// ── Payments (user-facing gateway deposits) ─────────────────────────────
export const getEnabledGateways = () => apiClient.get("/payments/gateways").then((r) => r.data.enabled as PaymentGatewayKey[]);
export const initiateGatewayDeposit = (gateway: PaymentGatewayKey, input: CreateGatewayDepositInput) =>
  apiClient.post(`/payments/${gateway}/deposits`, input).then((r) => r.data.redirectUrl as string);

// ── Payment methods (Phase 3 — dynamic, admin-managed) ──────────────────
export const getPaymentMethods = () => apiClient.get("/payment-methods").then((r) => r.data.items);
export const getAdminPaymentMethods = () => apiClient.get("/admin/payment-methods").then((r) => r.data.items);
export const createAdminPaymentMethod = (input: PaymentMethodInput) =>
  apiClient.post("/admin/payment-methods", input).then((r) => r.data.method);
export const updateAdminPaymentMethod = (id: string, input: Partial<PaymentMethodInput>) =>
  apiClient.put(`/admin/payment-methods/${id}`, input).then((r) => r.data.method);
export const deleteAdminPaymentMethod = (id: string) => apiClient.delete(`/admin/payment-methods/${id}`);

// ── Public (Phase 4 — unauthenticated) ──────────────────────────────────
export const getPublicSettings = () => apiClient.get("/public/settings").then((r) => r.data);
export const getPublicNotices = () => apiClient.get("/public/notices").then((r) => r.data.items);
export const getPublicStats = () => apiClient.get("/public/stats").then((r) => r.data);
export const getPublicCategories = () => apiClient.get("/public/categories").then((r) => r.data.items);
export const getPublicServices = (params: { page?: number; pageSize?: number; categoryId?: string; search?: string }) =>
  apiClient.get("/public/services", { params }).then((r) => r.data);
export const getPublicSiteNotice = () => apiClient.get("/public/notice").then((r) => r.data);
export const getPublicBanners = () => apiClient.get("/public/banners").then((r) => r.data.items);
export const getPublicPosts = (params?: { category?: string }) =>
  apiClient.get("/public/posts", { params }).then((r) => r.data.items);
export const getPublicPost = (slug: string) => apiClient.get(`/public/posts/${slug}`).then((r) => r.data.post);

// ── Coupons (Phase 4) ────────────────────────────────────────────────────
export const validateCoupon = (code: string, amount: number) =>
  apiClient.post("/coupons/validate", { code, amount }).then((r) => r.data as { valid: boolean; bonusAmount: string });
export const getAdminCoupons = () => apiClient.get("/admin/coupons").then((r) => r.data.items);
export const createAdminCoupon = (input: CouponInput) => apiClient.post("/admin/coupons", input).then((r) => r.data.coupon);
export const updateAdminCoupon = (id: string, input: Partial<CouponInput>) =>
  apiClient.put(`/admin/coupons/${id}`, input).then((r) => r.data.coupon);
export const deleteAdminCoupon = (id: string) => apiClient.delete(`/admin/coupons/${id}`);

// ── Notices (Phase 4) ────────────────────────────────────────────────────
export const getAdminNotices = () => apiClient.get("/admin/notices").then((r) => r.data.items);
export const createAdminNotice = (input: NoticeInput) => apiClient.post("/admin/notices", input).then((r) => r.data.notice);
export const updateAdminNotice = (id: string, input: Partial<NoticeInput>) =>
  apiClient.put(`/admin/notices/${id}`, input).then((r) => r.data.notice);
export const deleteAdminNotice = (id: string) => apiClient.delete(`/admin/notices/${id}`);

// ── Site settings (Phase 4, admin) ──────────────────────────────────────
export const getAdminSettings = () => apiClient.get("/admin/settings").then((r) => r.data);
export const updateAdminSettings = (input: UpdateSettingsInput) => apiClient.put("/admin/settings", input);
export const sendAdminTestEmail = (to: string) =>
  apiClient.post("/admin/settings/test-email", { to } satisfies SendTestEmailInput);
export const getAdminSiteNotice = () => apiClient.get("/admin/site-notice").then((r) => r.data);
export const updateAdminSiteNotice = (input: UpdateSiteNoticeInput) => apiClient.put("/admin/site-notice", input);

// ── Banner slider (admin) ────────────────────────────────────────────────
export const getAdminBanners = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/admin/banners", { params }).then((r) => r.data);
export const createAdminBanner = (input: BannerInput) => apiClient.post("/admin/banners", input).then((r) => r.data.banner);
export const updateAdminBanner = (id: string, input: Partial<BannerInput>) =>
  apiClient.put(`/admin/banners/${id}`, input).then((r) => r.data.banner);
export const deleteAdminBanner = (id: string) => apiClient.delete(`/admin/banners/${id}`);

// ── Documentation / Blog posts (admin) ──────────────────────────────────
export const getAdminPosts = (params: { page?: number; pageSize?: number; category?: string; status?: string }) =>
  apiClient.get("/admin/posts", { params }).then((r) => r.data);
export const getAdminPost = (id: string) => apiClient.get(`/admin/posts/${id}`).then((r) => r.data.post);
export const createAdminPost = (input: PostInput) => apiClient.post("/admin/posts", input).then((r) => r.data.post);
export const updateAdminPost = (id: string, input: Partial<PostInput>) =>
  apiClient.put(`/admin/posts/${id}`, input).then((r) => r.data.post);
export const deleteAdminPost = (id: string) => apiClient.delete(`/admin/posts/${id}`);

// ── Analytics (Phase 4, admin) ───────────────────────────────────────────
export const getAdminDailyStats = (days = 30) =>
  apiClient.get("/admin/stats/daily", { params: { days } }).then((r) => r.data.items);

// ── Store: Brand → Product → Package (public browsing + purchase) ───────
export const getStoreBrands = (limit?: number) => apiClient.get("/store/brands", { params: { limit } }).then((r) => r.data.items);
export const getStoreBrandProducts = (brandId: string) => apiClient.get(`/store/brands/${brandId}/products`).then((r) => r.data.items);
export const getStoreProductBySlug = (slug: string) => apiClient.get(`/store/products/${slug}`).then((r) => r.data.product);
export const getStoreProductPackages = (productId: string) => apiClient.get(`/store/products/${productId}/packages`).then((r) => r.data.items);
export const purchaseStorePackage = (input: PurchasePackageInput, idempotencyKey: string) =>
  apiClient
    .post("/store/purchase", input, { headers: { "Idempotency-Key": idempotencyKey } })
    .then((r) => r.data as { order: unknown; deliveredCode: string | null });
export const getOrderDeliveredCode = (orderId: string) =>
  apiClient.get(`/store/orders/${orderId}/code`).then((r) => r.data as { code: string });

// ── Admin: Brand → Product → Package → Stock Pool ────────────────────────
export const getAdminBrands = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/admin/brands", { params }).then((r) => r.data);
export const getAdminBrand = (id: string) => apiClient.get(`/admin/brands/${id}`).then((r) => r.data.brand);
export const createAdminBrand = (input: BrandInput) => apiClient.post("/admin/brands", input).then((r) => r.data.brand);
export const updateAdminBrand = (id: string, input: Partial<BrandInput>) =>
  apiClient.put(`/admin/brands/${id}`, input).then((r) => r.data.brand);
export const deleteAdminBrand = (id: string) => apiClient.delete(`/admin/brands/${id}`);

export const getAdminProducts = (params: { page?: number; pageSize?: number; brandId?: string }) =>
  apiClient.get("/admin/products", { params }).then((r) => r.data);
export const getAdminProduct = (id: string) => apiClient.get(`/admin/products/${id}`).then((r) => r.data.product);
export const createAdminProduct = (input: ProductInput) => apiClient.post("/admin/products", input).then((r) => r.data.product);
export const updateAdminProduct = (id: string, input: Partial<ProductInput>) =>
  apiClient.put(`/admin/products/${id}`, input).then((r) => r.data.product);
export const deleteAdminProduct = (id: string) => apiClient.delete(`/admin/products/${id}`);

export const getAdminPackages = (params: { page?: number; pageSize?: number; productId?: string }) =>
  apiClient.get("/admin/packages", { params }).then((r) => r.data);
export const createAdminPackage = (input: PackageInput) => apiClient.post("/admin/packages", input).then((r) => r.data.package);
export const updateAdminPackage = (id: string, input: Partial<PackageInput>) =>
  apiClient.put(`/admin/packages/${id}`, input).then((r) => r.data.package);
export const deleteAdminPackage = (id: string) => apiClient.delete(`/admin/packages/${id}`);

export const getAdminStockPools = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/admin/stock-pools", { params }).then((r) => r.data);
export const createAdminStockPool = (input: StockPoolInput) =>
  apiClient.post("/admin/stock-pools", input).then((r) => r.data.pool);
export const deleteAdminStockPool = (id: string) => apiClient.delete(`/admin/stock-pools/${id}`);
export const getAdminStockCodes = (poolId: string, params: { page?: number; pageSize?: number }) =>
  apiClient.get(`/admin/stock-pools/${poolId}/codes`, { params }).then((r) => r.data);
export const bulkAddAdminStockCodes = (poolId: string, codes: string) =>
  apiClient.post(`/admin/stock-pools/${poolId}/codes`, { codes }).then((r) => r.data as { added: number });
export const revokeAdminStockCode = (codeId: string) => apiClient.post(`/admin/stock-pools/codes/${codeId}/revoke`);

// ── Profile (Phase 4) ────────────────────────────────────────────────────
export const getMyProfile = () => apiClient.get("/users/me").then((r) => r.data.profile);
export const updateMyProfile = (input: UpdateProfileInput) => apiClient.patch("/users/me", input).then((r) => r.data.profile);
export const changeMyPassword = (input: ChangePasswordInput) => apiClient.post("/users/me/password", input);
export const generateMyApiKey = () =>
  apiClient.post("/users/me/api-key").then((r) => r.data as { apiKey: string; prefix: string });
export const revokeMyApiKey = () => apiClient.delete("/users/me/api-key");

// ── Leaderboard (Top Spend) ──────────────────────────────────────────────
export const getLeaderboard = () => apiClient.get("/leaderboard/top-spenders").then((r) => r.data.items);
