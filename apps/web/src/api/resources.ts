import type {
  AdjustWalletInput,
  CreateGatewayDepositInput,
  CreateManualDepositInput,
  CreateOrderInput,
  CreateProviderInput,
  CreateTicketInput,
  PaymentGatewayKey,
  PaymentMethodInput,
  ServiceInput,
  UpdateGatewayConfigInput,
  UpdateOrderStatusInput,
  UpdateProviderInput,
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

// ── Tickets ──────────────────────────────────────────────────────────────
export const getMyTickets = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/tickets", { params }).then((r) => r.data);
export const getTicket = (id: string) => apiClient.get(`/tickets/${id}`).then((r) => r.data.ticket);
export const createTicket = (input: CreateTicketInput) => apiClient.post("/tickets", input).then((r) => r.data.ticket);
export const replyToTicket = (id: string, message: string) =>
  apiClient.post(`/tickets/${id}/messages`, { message }).then((r) => r.data.message);

// ── Admin ────────────────────────────────────────────────────────────────
export const getAdminStats = () => apiClient.get("/admin/stats").then((r) => r.data);
export const getAdminUsers = (params: { page?: number; pageSize?: number; search?: string }) =>
  apiClient.get("/admin/users", { params }).then((r) => r.data);
export const getAdminUser = (id: string) => apiClient.get(`/admin/users/${id}`).then((r) => r.data.user);
export const updateAdminUser = (id: string, input: UpdateUserInput) =>
  apiClient.patch(`/admin/users/${id}`, input).then((r) => r.data.user);
export const adjustUserWallet = (userId: string, input: AdjustWalletInput) =>
  apiClient.post(`/admin/wallet/${userId}/adjust`, input).then((r) => r.data);

export const getAdminServices = (params: { page?: number; pageSize?: number }) =>
  apiClient.get("/admin/services", { params }).then((r) => r.data);
export const createAdminService = (input: ServiceInput) => apiClient.post("/admin/services", input).then((r) => r.data.service);
export const updateAdminService = (id: string, input: Partial<ServiceInput>) =>
  apiClient.put(`/admin/services/${id}`, input).then((r) => r.data.service);
export const deleteAdminService = (id: string) => apiClient.delete(`/admin/services/${id}`);
export const getAdminCategories = () => apiClient.get("/admin/services/categories").then((r) => r.data.items);
export const createAdminCategory = (input: { name: string; platform: string; sortOrder?: number }) =>
  apiClient.post("/admin/services/categories", input).then((r) => r.data.category);

export const getAdminOrders = (params: { page?: number; pageSize?: number; status?: string; search?: string }) =>
  apiClient.get("/admin/orders", { params }).then((r) => r.data);
export const updateAdminOrderStatus = (id: string, input: UpdateOrderStatusInput) =>
  apiClient.patch(`/admin/orders/${id}/status`, input).then((r) => r.data.order);

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
