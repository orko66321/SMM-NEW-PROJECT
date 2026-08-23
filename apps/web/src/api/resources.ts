import type {
  AdjustWalletInput,
  CreateDepositInput,
  CreateOrderInput,
  CreateTicketInput,
  ServiceInput,
  UpdateOrderStatusInput,
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
export const createDeposit = (input: CreateDepositInput) => apiClient.post("/wallet/deposits", input).then((r) => r.data.deposit);
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
