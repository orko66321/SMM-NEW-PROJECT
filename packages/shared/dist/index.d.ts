import { z } from "zod";
/**
 * Single source of truth for request/response shapes shared between
 * apps/api and apps/web. String literal unions here MUST stay in sync
 * with the enum values in apps/api/prisma/schema.prisma.
 */
export declare const RoleValues: readonly ["USER", "STAFF", "ADMIN"];
export type Role = (typeof RoleValues)[number];
export declare const OrderStatusValues: readonly ["PENDING", "PROCESSING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "FAILED"];
export type OrderStatus = (typeof OrderStatusValues)[number];
export declare const TicketStatusValues: readonly ["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED"];
export type TicketStatus = (typeof TicketStatusValues)[number];
export declare const DepositStatusValues: readonly ["PENDING", "APPROVED", "REJECTED"];
export type DepositStatus = (typeof DepositStatusValues)[number];
export declare const UserStatusValues: readonly ["ACTIVE", "SUSPENDED"];
export type UserStatus = (typeof UserStatusValues)[number];
export declare const RefillStatusValues: readonly ["REQUESTED", "IN_PROGRESS", "COMPLETED", "REJECTED"];
export type RefillStatus = (typeof RefillStatusValues)[number];
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export declare const serviceListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    categoryId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    categoryId?: string | undefined;
    search?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    categoryId?: string | undefined;
    search?: string | undefined;
}>;
export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;
export declare const orderListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodEnum<["PENDING", "PROCESSING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "FAILED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
}>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export declare const adminOrderListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodEnum<["PENDING", "PROCESSING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "FAILED"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
    search?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
    search?: string | undefined;
}>;
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export declare const adminRefillListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodEnum<["REQUESTED", "IN_PROGRESS", "COMPLETED", "REJECTED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "REQUESTED" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "REQUESTED" | undefined;
}>;
export type AdminRefillListQuery = z.infer<typeof adminRefillListQuerySchema>;
export declare const depositListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
}>;
export type DepositListQuery = z.infer<typeof depositListQuerySchema>;
export declare const ticketListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodEnum<["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | undefined;
}>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export declare const userListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    search?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
}>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    password: string;
}, {
    username: string;
    email: string;
    password: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    identifier: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    identifier: string;
}, {
    password: string;
    identifier: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const googleAuthSchema: z.ZodObject<{
    idToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    idToken: string;
}, {
    idToken: string;
}>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export declare const authUserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["USER", "STAFF", "ADMIN"]>;
    status: z.ZodEnum<["ACTIVE", "SUSPENDED"]>;
    avatarUrl: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "SUSPENDED";
    username: string;
    email: string;
    id: string;
    role: "USER" | "STAFF" | "ADMIN";
    avatarUrl: string | null;
    createdAt: string;
}, {
    status: "ACTIVE" | "SUSPENDED";
    username: string;
    email: string;
    id: string;
    role: "USER" | "STAFF" | "ADMIN";
    avatarUrl: string | null;
    createdAt: string;
}>;
export type AuthUser = z.infer<typeof authUserSchema>;
export declare const createManualDepositSchema: z.ZodObject<{
    paymentMethodId: z.ZodString;
    amount: z.ZodNumber;
    trxId: z.ZodString;
    senderNumber: z.ZodString;
    couponCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    paymentMethodId: string;
    amount: number;
    trxId: string;
    senderNumber: string;
    couponCode?: string | undefined;
}, {
    paymentMethodId: string;
    amount: number;
    trxId: string;
    senderNumber: string;
    couponCode?: string | undefined;
}>;
export type CreateManualDepositInput = z.infer<typeof createManualDepositSchema>;
export declare const reviewDepositSchema: z.ZodObject<{
    action: z.ZodEnum<["APPROVE", "REJECT"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "APPROVE" | "REJECT";
    note?: string | undefined;
}, {
    action: "APPROVE" | "REJECT";
    note?: string | undefined;
}>;
export type ReviewDepositInput = z.infer<typeof reviewDepositSchema>;
export declare const adjustWalletSchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodNumber, number, number>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    reason: string;
}, {
    amount: number;
    reason: string;
}>;
export type AdjustWalletInput = z.infer<typeof adjustWalletSchema>;
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    platform: z.ZodString;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    platform: string;
    sortOrder: number;
}, {
    name: string;
    platform: string;
    sortOrder?: number | undefined;
}>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export declare const serviceObjectSchema: z.ZodObject<{
    categoryId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    sellPricePer1000: z.ZodNumber;
    providerCostPer1000: z.ZodNumber;
    minQuantity: z.ZodNumber;
    maxQuantity: z.ZodNumber;
    refillEnabled: z.ZodDefault<z.ZodBoolean>;
    cancelEnabled: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "DISABLED"]>>;
    providerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    providerServiceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backupProviderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    autoSubmit: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DISABLED";
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    refillEnabled: boolean;
    cancelEnabled: boolean;
    autoSubmit: boolean;
    description?: string | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
}, {
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    status?: "ACTIVE" | "DISABLED" | undefined;
    description?: string | undefined;
    refillEnabled?: boolean | undefined;
    cancelEnabled?: boolean | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
    autoSubmit?: boolean | undefined;
}>;
export declare const serviceInputSchema: z.ZodEffects<z.ZodObject<{
    categoryId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    sellPricePer1000: z.ZodNumber;
    providerCostPer1000: z.ZodNumber;
    minQuantity: z.ZodNumber;
    maxQuantity: z.ZodNumber;
    refillEnabled: z.ZodDefault<z.ZodBoolean>;
    cancelEnabled: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "DISABLED"]>>;
    providerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    providerServiceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backupProviderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    autoSubmit: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DISABLED";
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    refillEnabled: boolean;
    cancelEnabled: boolean;
    autoSubmit: boolean;
    description?: string | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
}, {
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    status?: "ACTIVE" | "DISABLED" | undefined;
    description?: string | undefined;
    refillEnabled?: boolean | undefined;
    cancelEnabled?: boolean | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
    autoSubmit?: boolean | undefined;
}>, {
    status: "ACTIVE" | "DISABLED";
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    refillEnabled: boolean;
    cancelEnabled: boolean;
    autoSubmit: boolean;
    description?: string | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
}, {
    categoryId: string;
    name: string;
    sellPricePer1000: number;
    providerCostPer1000: number;
    minQuantity: number;
    maxQuantity: number;
    status?: "ACTIVE" | "DISABLED" | undefined;
    description?: string | undefined;
    refillEnabled?: boolean | undefined;
    cancelEnabled?: boolean | undefined;
    providerId?: string | null | undefined;
    providerServiceId?: string | null | undefined;
    backupProviderId?: string | null | undefined;
    autoSubmit?: boolean | undefined;
}>;
export type ServiceInput = z.infer<typeof serviceInputSchema>;
export declare const createOrderSchema: z.ZodObject<{
    serviceId: z.ZodString;
    link: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    serviceId: string;
    link: string;
    quantity: number;
}, {
    serviceId: string;
    link: string;
    quantity: number;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "PROCESSING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "FAILED"]>;
    startCount: z.ZodOptional<z.ZodNumber>;
    remains: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED";
    startCount?: number | undefined;
    remains?: number | undefined;
}, {
    status: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED";
    startCount?: number | undefined;
    remains?: number | undefined;
}>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export declare const resolveManualRefillSchema: z.ZodObject<{
    status: z.ZodEnum<["COMPLETED", "REJECTED"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "REJECTED";
    note?: string | undefined;
}, {
    status: "COMPLETED" | "REJECTED";
    note?: string | undefined;
}>;
export type ResolveManualRefillInput = z.infer<typeof resolveManualRefillSchema>;
export declare const createTicketSchema: z.ZodObject<{
    subject: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    subject: string;
}, {
    message: string;
    subject: string;
}>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export declare const createTicketMessageSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
export declare const updateTicketStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED"]>;
}, "strip", z.ZodTypeAny, {
    status: "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED";
}, {
    status: "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED";
}>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export declare const updateUserSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "SUSPENDED"]>>;
    role: z.ZodOptional<z.ZodEnum<["USER", "STAFF", "ADMIN"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "SUSPENDED" | undefined;
    role?: "USER" | "STAFF" | "ADMIN" | undefined;
}, {
    status?: "ACTIVE" | "SUSPENDED" | undefined;
    role?: "USER" | "STAFF" | "ADMIN" | undefined;
}>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export declare const createProviderSchema: z.ZodObject<{
    name: z.ZodString;
    apiUrl: z.ZodString;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    apiUrl: string;
    apiKey: string;
}, {
    name: string;
    apiUrl: string;
    apiKey: string;
}>;
export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export declare const updateProviderSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    apiUrl: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "DISABLED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "DISABLED" | undefined;
    name?: string | undefined;
    apiUrl?: string | undefined;
    apiKey?: string | undefined;
}, {
    status?: "ACTIVE" | "DISABLED" | undefined;
    name?: string | undefined;
    apiUrl?: string | undefined;
    apiKey?: string | undefined;
}>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export declare const bulkImportProviderServicesSchema: z.ZodObject<{
    providerServiceIds: z.ZodArray<z.ZodString, "many">;
    markupPercent: z.ZodDefault<z.ZodNumber>;
    autoSubmit: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    autoSubmit: boolean;
    providerServiceIds: string[];
    markupPercent: number;
}, {
    providerServiceIds: string[];
    autoSubmit?: boolean | undefined;
    markupPercent?: number | undefined;
}>;
export type BulkImportProviderServicesInput = z.infer<typeof bulkImportProviderServicesSchema>;
export declare const PaymentGatewayKeys: readonly ["BKASH", "ZINIPAY"];
export type PaymentGatewayKey = (typeof PaymentGatewayKeys)[number];
export declare const bkashCredentialsSchema: z.ZodObject<{
    appKey: z.ZodString;
    appSecret: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    baseUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    appKey: string;
    appSecret: string;
    baseUrl: string;
}, {
    username: string;
    password: string;
    appKey: string;
    appSecret: string;
    baseUrl: string;
}>;
export type BkashCredentials = z.infer<typeof bkashCredentialsSchema>;
export declare const zinipayCredentialsSchema: z.ZodObject<{
    apiKey: z.ZodString;
    secretKey: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    baseUrl: string;
    secretKey?: string | undefined;
    merchantId?: string | undefined;
}, {
    apiKey: string;
    baseUrl?: string | undefined;
    secretKey?: string | undefined;
    merchantId?: string | undefined;
}>;
export type ZiniPayCredentials = z.infer<typeof zinipayCredentialsSchema>;
export declare const gatewayCredentialsSchemas: {
    BKASH: z.ZodObject<{
        appKey: z.ZodString;
        appSecret: z.ZodString;
        username: z.ZodString;
        password: z.ZodString;
        baseUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
        appKey: string;
        appSecret: string;
        baseUrl: string;
    }, {
        username: string;
        password: string;
        appKey: string;
        appSecret: string;
        baseUrl: string;
    }>;
    ZINIPAY: z.ZodObject<{
        apiKey: z.ZodString;
        secretKey: z.ZodOptional<z.ZodString>;
        merchantId: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        apiKey: string;
        baseUrl: string;
        secretKey?: string | undefined;
        merchantId?: string | undefined;
    }, {
        apiKey: string;
        baseUrl?: string | undefined;
        secretKey?: string | undefined;
        merchantId?: string | undefined;
    }>;
};
export declare const updateGatewayConfigSchema: z.ZodObject<{
    mode: z.ZodEnum<["SANDBOX", "LIVE"]>;
    enabled: z.ZodBoolean;
    autoVerify: z.ZodDefault<z.ZodBoolean>;
    credentials: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    mode: "SANDBOX" | "LIVE";
    enabled: boolean;
    autoVerify: boolean;
    credentials: Record<string, unknown>;
}, {
    mode: "SANDBOX" | "LIVE";
    enabled: boolean;
    credentials: Record<string, unknown>;
    autoVerify?: boolean | undefined;
}>;
export type UpdateGatewayConfigInput = z.infer<typeof updateGatewayConfigSchema>;
export declare const createGatewayDepositSchema: z.ZodObject<{
    amount: z.ZodNumber;
    paymentMethodId: z.ZodOptional<z.ZodString>;
    couponCode: z.ZodOptional<z.ZodString>;
    orderIntentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    paymentMethodId?: string | undefined;
    couponCode?: string | undefined;
    orderIntentId?: string | undefined;
}, {
    amount: number;
    paymentMethodId?: string | undefined;
    couponCode?: string | undefined;
    orderIntentId?: string | undefined;
}>;
export type CreateGatewayDepositInput = z.infer<typeof createGatewayDepositSchema>;
export declare const PaymentMethodGatewayTypeValues: readonly ["AUTOMATED", "MANUAL"];
export type PaymentMethodGatewayType = (typeof PaymentMethodGatewayTypeValues)[number];
export declare const PaymentMethodAccountTypeValues: readonly ["PERSONAL", "MERCHANT", "AGENT"];
export type PaymentMethodAccountType = (typeof PaymentMethodAccountTypeValues)[number];
export declare const paymentMethodObjectSchema: z.ZodObject<{
    title: z.ZodString;
    gatewayType: z.ZodEnum<["AUTOMATED", "MANUAL"]>;
    accountType: z.ZodDefault<z.ZodEnum<["PERSONAL", "MERCHANT", "AGENT"]>>;
    accountNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    minAmount: z.ZodDefault<z.ZodNumber>;
    maxAmount: z.ZodDefault<z.ZodNumber>;
    bonusPercent: z.ZodDefault<z.ZodNumber>;
    gatewayProvider: z.ZodOptional<z.ZodNullable<z.ZodEnum<["BKASH", "ZINIPAY"]>>>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "DISABLED"]>>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DISABLED";
    sortOrder: number;
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    accountType: "PERSONAL" | "MERCHANT" | "AGENT";
    minAmount: number;
    maxAmount: number;
    bonusPercent: number;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}, {
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    status?: "ACTIVE" | "DISABLED" | undefined;
    sortOrder?: number | undefined;
    accountType?: "PERSONAL" | "MERCHANT" | "AGENT" | undefined;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    bonusPercent?: number | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}>;
export declare const paymentMethodInputSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    gatewayType: z.ZodEnum<["AUTOMATED", "MANUAL"]>;
    accountType: z.ZodDefault<z.ZodEnum<["PERSONAL", "MERCHANT", "AGENT"]>>;
    accountNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    minAmount: z.ZodDefault<z.ZodNumber>;
    maxAmount: z.ZodDefault<z.ZodNumber>;
    bonusPercent: z.ZodDefault<z.ZodNumber>;
    gatewayProvider: z.ZodOptional<z.ZodNullable<z.ZodEnum<["BKASH", "ZINIPAY"]>>>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "DISABLED"]>>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DISABLED";
    sortOrder: number;
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    accountType: "PERSONAL" | "MERCHANT" | "AGENT";
    minAmount: number;
    maxAmount: number;
    bonusPercent: number;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}, {
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    status?: "ACTIVE" | "DISABLED" | undefined;
    sortOrder?: number | undefined;
    accountType?: "PERSONAL" | "MERCHANT" | "AGENT" | undefined;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    bonusPercent?: number | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}>, {
    status: "ACTIVE" | "DISABLED";
    sortOrder: number;
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    accountType: "PERSONAL" | "MERCHANT" | "AGENT";
    minAmount: number;
    maxAmount: number;
    bonusPercent: number;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}, {
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    status?: "ACTIVE" | "DISABLED" | undefined;
    sortOrder?: number | undefined;
    accountType?: "PERSONAL" | "MERCHANT" | "AGENT" | undefined;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    bonusPercent?: number | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}>, {
    status: "ACTIVE" | "DISABLED";
    sortOrder: number;
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    accountType: "PERSONAL" | "MERCHANT" | "AGENT";
    minAmount: number;
    maxAmount: number;
    bonusPercent: number;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}, {
    title: string;
    gatewayType: "AUTOMATED" | "MANUAL";
    status?: "ACTIVE" | "DISABLED" | undefined;
    sortOrder?: number | undefined;
    accountType?: "PERSONAL" | "MERCHANT" | "AGENT" | undefined;
    accountNumber?: string | null | undefined;
    instructions?: string | null | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    bonusPercent?: number | undefined;
    gatewayProvider?: "BKASH" | "ZINIPAY" | null | undefined;
}>;
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;
export declare const LiveChatProviderValues: readonly ["NONE", "TAWKTO", "CRISP"];
export type LiveChatProvider = (typeof LiveChatProviderValues)[number];
export declare const DisplayCurrencyValues: readonly ["USD", "BDT"];
export type DisplayCurrency = (typeof DisplayCurrencyValues)[number];
export declare const NoticeLevelValues: readonly ["INFO", "WARNING", "SUCCESS", "ERROR"];
export type NoticeLevel = (typeof NoticeLevelValues)[number];
export declare const updateSettingsSchema: z.ZodObject<{
    siteName: z.ZodString;
    whatsappEnabled: z.ZodBoolean;
    whatsappNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    liveChatProvider: z.ZodEnum<["NONE", "TAWKTO", "CRISP"]>;
    liveChatWidgetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    usdToBdtRate: z.ZodNumber;
    defaultCurrency: z.ZodEnum<["USD", "BDT"]>;
    smtpEnabled: z.ZodBoolean;
    smtpHost: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    smtpPort: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    smtpUser: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    smtpPassword: z.ZodOptional<z.ZodString>;
    smtpFromAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    siteName: string;
    whatsappEnabled: boolean;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    usdToBdtRate: number;
    defaultCurrency: "USD" | "BDT";
    smtpEnabled: boolean;
    whatsappNumber?: string | null | undefined;
    liveChatWidgetId?: string | null | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPassword?: string | undefined;
    smtpFromAddress?: string | null | undefined;
}, {
    siteName: string;
    whatsappEnabled: boolean;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    usdToBdtRate: number;
    defaultCurrency: "USD" | "BDT";
    smtpEnabled: boolean;
    whatsappNumber?: string | null | undefined;
    liveChatWidgetId?: string | null | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPassword?: string | undefined;
    smtpFromAddress?: string | null | undefined;
}>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export declare const publicSettingsSchema: z.ZodObject<{
    siteName: z.ZodString;
    whatsappEnabled: z.ZodBoolean;
    whatsappNumber: z.ZodNullable<z.ZodString>;
    liveChatProvider: z.ZodEnum<["NONE", "TAWKTO", "CRISP"]>;
    liveChatWidgetId: z.ZodNullable<z.ZodString>;
    usdToBdtRate: z.ZodString;
    defaultCurrency: z.ZodEnum<["USD", "BDT"]>;
    googleAuthEnabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    siteName: string;
    whatsappEnabled: boolean;
    whatsappNumber: string | null;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    liveChatWidgetId: string | null;
    usdToBdtRate: string;
    defaultCurrency: "USD" | "BDT";
    googleAuthEnabled: boolean;
}, {
    siteName: string;
    whatsappEnabled: boolean;
    whatsappNumber: string | null;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    liveChatWidgetId: string | null;
    usdToBdtRate: string;
    defaultCurrency: "USD" | "BDT";
    googleAuthEnabled: boolean;
}>;
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export declare const updateSiteNoticeSchema: z.ZodObject<{
    titleBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    titleEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    bodyBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    bodyEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    bodyBn?: string | null | undefined;
    bodyEn?: string | null | undefined;
}, {
    isActive: boolean;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    bodyBn?: string | null | undefined;
    bodyEn?: string | null | undefined;
}>;
export type UpdateSiteNoticeInput = z.infer<typeof updateSiteNoticeSchema>;
export declare const siteNoticeSchema: z.ZodObject<{
    titleBn: z.ZodNullable<z.ZodString>;
    titleEn: z.ZodNullable<z.ZodString>;
    bodyBn: z.ZodNullable<z.ZodString>;
    bodyEn: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    titleBn: string | null;
    titleEn: string | null;
    bodyBn: string | null;
    bodyEn: string | null;
    isActive: boolean;
}, {
    titleBn: string | null;
    titleEn: string | null;
    bodyBn: string | null;
    bodyEn: string | null;
    isActive: boolean;
}>;
export type SiteNotice = z.infer<typeof siteNoticeSchema>;
export declare const publicSiteNoticeSchema: z.ZodObject<{
    titleBn: z.ZodNullable<z.ZodString>;
    titleEn: z.ZodNullable<z.ZodString>;
    bodyBn: z.ZodNullable<z.ZodString>;
    bodyEn: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    titleBn: string | null;
    titleEn: string | null;
    bodyBn: string | null;
    bodyEn: string | null;
}, {
    titleBn: string | null;
    titleEn: string | null;
    bodyBn: string | null;
    bodyEn: string | null;
}>;
export type PublicSiteNotice = z.infer<typeof publicSiteNoticeSchema>;
export declare const noticeObjectSchema: z.ZodObject<{
    messageBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messageEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    level: z.ZodDefault<z.ZodEnum<["INFO", "WARNING", "SUCCESS", "ERROR"]>>;
    active: z.ZodDefault<z.ZodBoolean>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    level: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | undefined;
    active?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}>;
export declare const noticeInputSchema: z.ZodEffects<z.ZodObject<{
    messageBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messageEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    level: z.ZodDefault<z.ZodEnum<["INFO", "WARNING", "SUCCESS", "ERROR"]>>;
    active: z.ZodDefault<z.ZodBoolean>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    level: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | undefined;
    active?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}>, {
    level: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | undefined;
    active?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}>;
export type NoticeInput = z.infer<typeof noticeInputSchema>;
export declare const CouponTypeValues: readonly ["PERCENT", "FIXED"];
export type CouponType = (typeof CouponTypeValues)[number];
export declare const couponInputSchema: z.ZodObject<{
    code: z.ZodString;
    type: z.ZodEnum<["PERCENT", "FIXED"]>;
    value: z.ZodNumber;
    maxUses: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: number;
    code: string;
    type: "PERCENT" | "FIXED";
    active: boolean;
    maxUses?: number | null | undefined;
    expiresAt?: Date | null | undefined;
}, {
    value: number;
    code: string;
    type: "PERCENT" | "FIXED";
    active?: boolean | undefined;
    maxUses?: number | null | undefined;
    expiresAt?: Date | null | undefined;
}>;
export type CouponInput = z.infer<typeof couponInputSchema>;
export declare const validateCouponSchema: z.ZodObject<{
    code: z.ZodString;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    code: string;
    amount: number;
}, {
    code: string;
    amount: number;
}>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export declare const forgotPasswordSchema: z.ZodObject<{
    identifier: z.ZodString;
}, "strip", z.ZodTypeAny, {
    identifier: string;
}, {
    identifier: string;
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notifyEmail: z.ZodOptional<z.ZodBoolean>;
    notifyOrderUpdates: z.ZodOptional<z.ZodBoolean>;
    notifyPromotions: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    phone?: string | null | undefined;
    notifyEmail?: boolean | undefined;
    notifyOrderUpdates?: boolean | undefined;
    notifyPromotions?: boolean | undefined;
}, {
    phone?: string | null | undefined;
    notifyEmail?: boolean | undefined;
    notifyOrderUpdates?: boolean | undefined;
    notifyPromotions?: boolean | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodDefault<z.ZodString>;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    newPassword: string;
    currentPassword?: string | undefined;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export declare const dailyStatsQuerySchema: z.ZodObject<{
    days: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days?: number | undefined;
}>;
export type DailyStatsQuery = z.infer<typeof dailyStatsQuerySchema>;
