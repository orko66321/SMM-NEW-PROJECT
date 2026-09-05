import { z } from "zod";
/**
 * Single source of truth for request/response shapes shared between
 * apps/api and apps/web. String literal unions here MUST stay in sync
 * with the enum values in apps/api/prisma/schema.prisma.
 */
export declare const RoleValues: readonly ["USER", "MODERATOR", "ADMIN"];
export type Role = (typeof RoleValues)[number];
export declare const AssignableRoleValues: readonly ["USER", "MODERATOR", "ADMIN"];
export declare const OrderStatusValues: readonly ["PENDING", "PROCESSING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "FAILED"];
export type OrderStatus = (typeof OrderStatusValues)[number];
export declare const TicketStatusValues: readonly ["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED", "AI_PROCESSING", "RESOLVED", "ESCALATED", "IN_PROGRESS", "REPLIED"];
export type TicketStatus = (typeof TicketStatusValues)[number];
export declare const TicketActionKeyValues: readonly ["REFILL", "CANCEL", "SPEED_UP", "RESTART", "FAKE_COMPLETE", "OTHER"];
export type TicketActionKey = (typeof TicketActionKeyValues)[number];
export declare const TicketOrderActionResultValues: readonly ["SUCCESS", "FAILED", "NOT_ELIGIBLE", "ESCALATED", "PENDING"];
export type TicketOrderActionResult = (typeof TicketOrderActionResultValues)[number];
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
export declare const serviceCompletedOrdersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type ServiceCompletedOrdersQuery = z.infer<typeof serviceCompletedOrdersQuerySchema>;
export interface ServiceCompletedOrderRow {
    id: string;
    completedAt: string;
    completionSeconds: number | null;
    quantity: number;
    status: "COMPLETED" | "PARTIAL";
}
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
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
    likeOnly: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
    search?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
    likeOnly?: "true" | "false" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED" | undefined;
    search?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
    likeOnly?: "true" | "false" | undefined;
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
    status: z.ZodOptional<z.ZodEnum<["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED", "AI_PROCESSING", "RESOLVED", "ESCALATED", "IN_PROGRESS", "REPLIED"]>>;
    categoryId: z.ZodOptional<z.ZodString>;
    subcategoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "IN_PROGRESS" | "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | "AI_PROCESSING" | "RESOLVED" | "ESCALATED" | "REPLIED" | undefined;
    categoryId?: string | undefined;
    subcategoryId?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "IN_PROGRESS" | "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | "AI_PROCESSING" | "RESOLVED" | "ESCALATED" | "REPLIED" | undefined;
    categoryId?: string | undefined;
    subcategoryId?: string | undefined;
}>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export declare const userListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    search: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    search?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
}>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    referralCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    password: string;
    referralCode?: string | undefined;
}, {
    username: string;
    email: string;
    password: string;
    referralCode?: string | undefined;
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
    role: z.ZodEnum<["USER", "MODERATOR", "ADMIN"]>;
    status: z.ZodEnum<["ACTIVE", "SUSPENDED"]>;
    avatarUrl: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    isVip: z.ZodBoolean;
    isReseller: z.ZodBoolean;
    hasDeposited: z.ZodBoolean;
    referralCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "SUSPENDED";
    username: string;
    email: string;
    referralCode: string;
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
    avatarUrl: string | null;
    createdAt: string;
    isVip: boolean;
    isReseller: boolean;
    hasDeposited: boolean;
}, {
    status: "ACTIVE" | "SUSPENDED";
    username: string;
    email: string;
    referralCode: string;
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
    avatarUrl: string | null;
    createdAt: string;
    isVip: boolean;
    isReseller: boolean;
    hasDeposited: boolean;
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
    nameBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    descriptionBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    nameBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    descriptionBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    nameBn?: string | null | undefined;
    descriptionBn?: string | null | undefined;
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
    comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    commentLink: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED";
    startCount?: number | undefined;
    remains?: number | undefined;
    comment?: string | null | undefined;
    commentLink?: string | null | undefined;
}, {
    status: "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" | "FAILED";
    startCount?: number | undefined;
    remains?: number | undefined;
    comment?: string | null | undefined;
    commentLink?: string | null | undefined;
}>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export declare const orderCommentSchema: z.ZodObject<{
    comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    commentLink: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
}, "strip", z.ZodTypeAny, {
    comment?: string | null | undefined;
    commentLink?: string | null | undefined;
}, {
    comment?: string | null | undefined;
    commentLink?: string | null | undefined;
}>;
export type OrderCommentInput = z.infer<typeof orderCommentSchema>;
export declare const commentTemplateInputSchema: z.ZodObject<{
    text: z.ZodString;
    link: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    link?: string | null | undefined;
}, {
    text: string;
    link?: string | null | undefined;
}>;
export type CommentTemplateInput = z.infer<typeof commentTemplateInputSchema>;
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
    categoryId: z.ZodString;
    subcategoryId: z.ZodOptional<z.ZodString>;
    orderIds: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    categoryId: string;
    message?: string | undefined;
    subcategoryId?: string | undefined;
    orderIds?: string | undefined;
}, {
    categoryId: string;
    message?: string | undefined;
    subcategoryId?: string | undefined;
    orderIds?: string | undefined;
}>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export declare const ticketReplySchema: z.ZodObject<{
    categoryId: z.ZodOptional<z.ZodString>;
    subcategoryId: z.ZodOptional<z.ZodString>;
    orderIds: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message?: string | undefined;
    categoryId?: string | undefined;
    subcategoryId?: string | undefined;
    orderIds?: string | undefined;
}, {
    message?: string | undefined;
    categoryId?: string | undefined;
    subcategoryId?: string | undefined;
    orderIds?: string | undefined;
}>;
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;
export declare const createTicketMessageSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
export declare const updateTicketStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["OPEN", "PENDING_ADMIN", "PENDING_USER", "CLOSED", "AI_PROCESSING", "RESOLVED", "ESCALATED", "IN_PROGRESS", "REPLIED"]>;
}, "strip", z.ZodTypeAny, {
    status: "IN_PROGRESS" | "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | "AI_PROCESSING" | "RESOLVED" | "ESCALATED" | "REPLIED";
}, {
    status: "IN_PROGRESS" | "OPEN" | "PENDING_ADMIN" | "PENDING_USER" | "CLOSED" | "AI_PROCESSING" | "RESOLVED" | "ESCALATED" | "REPLIED";
}>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export declare const TicketAgentActionValues: readonly ["refill", "cancel", "restart", "close", "reopen"];
export type TicketAgentAction = (typeof TicketAgentActionValues)[number];
export declare const adminTicketActionSchema: z.ZodObject<{
    action: z.ZodEnum<["refill", "cancel", "restart", "close", "reopen"]>;
    orderId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "refill" | "cancel" | "restart" | "close" | "reopen";
    note?: string | undefined;
    orderId?: string | undefined;
}, {
    action: "refill" | "cancel" | "restart" | "close" | "reopen";
    note?: string | undefined;
    orderId?: string | undefined;
}>;
export type AdminTicketActionInput = z.infer<typeof adminTicketActionSchema>;
export declare const ticketSubcategoryDtoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    actionKey: z.ZodEnum<["REFILL", "CANCEL", "SPEED_UP", "RESTART", "FAKE_COMPLETE", "OTHER"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
}, {
    id: string;
    name: string;
    actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
}>;
export declare const ticketCategoryDtoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    isAutomated: z.ZodBoolean;
    subcategories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        actionKey: z.ZodEnum<["REFILL", "CANCEL", "SPEED_UP", "RESTART", "FAKE_COMPLETE", "OTHER"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
    }, {
        id: string;
        name: string;
        actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    isAutomated: boolean;
    subcategories: {
        id: string;
        name: string;
        actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
    }[];
}, {
    id: string;
    name: string;
    isAutomated: boolean;
    subcategories: {
        id: string;
        name: string;
        actionKey: "REFILL" | "CANCEL" | "SPEED_UP" | "RESTART" | "FAKE_COMPLETE" | "OTHER";
    }[];
}>;
export type TicketCategoryDto = z.infer<typeof ticketCategoryDtoSchema>;
export declare const updateUserSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "SUSPENDED"]>>;
    role: z.ZodOptional<z.ZodEnum<["USER", "MODERATOR", "ADMIN"]>>;
    isVip: z.ZodOptional<z.ZodBoolean>;
    isReseller: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "SUSPENDED" | undefined;
    role?: "USER" | "MODERATOR" | "ADMIN" | undefined;
    isVip?: boolean | undefined;
    isReseller?: boolean | undefined;
}, {
    status?: "ACTIVE" | "SUSPENDED" | undefined;
    role?: "USER" | "MODERATOR" | "ADMIN" | undefined;
    isVip?: boolean | undefined;
    isReseller?: boolean | undefined;
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
export declare const ReferrerRewardTypeValues: readonly ["PERCENTAGE", "FIXED"];
export type ReferrerRewardType = (typeof ReferrerRewardTypeValues)[number];
export declare const ReferralStatusValues: readonly ["COMPLETED", "FAILED"];
export type ReferralStatus = (typeof ReferralStatusValues)[number];
export type DisplayCurrency = (typeof DisplayCurrencyValues)[number];
export declare const NoticeLevelValues: readonly ["INFO", "WARNING", "SUCCESS", "ERROR"];
export type NoticeLevel = (typeof NoticeLevelValues)[number];
export declare const updateSettingsSchema: z.ZodObject<{
    siteName: z.ZodString;
    whatsappEnabled: z.ZodOptional<z.ZodBoolean>;
    whatsappNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    liveChatProvider: z.ZodEnum<["NONE", "TAWKTO", "CRISP"]>;
    liveChatWidgetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    howToOrderVideoUrl: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
    usdToBdtRate: z.ZodNumber;
    defaultCurrency: z.ZodEnum<["USD", "BDT"]>;
    smtpEnabled: z.ZodBoolean;
    smtpHost: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    smtpPort: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    smtpUser: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    smtpPassword: z.ZodOptional<z.ZodString>;
    smtpFromAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resendOrderButtonEnabled: z.ZodOptional<z.ZodBoolean>;
    firstDepositBonusEnabled: z.ZodOptional<z.ZodBoolean>;
    firstDepositBonusPercent: z.ZodOptional<z.ZodNumber>;
    firstDepositMinAmount: z.ZodOptional<z.ZodNumber>;
    firstDepositMaxBonus: z.ZodOptional<z.ZodNumber>;
    referralSystemEnabled: z.ZodOptional<z.ZodBoolean>;
    referrerRewardType: z.ZodOptional<z.ZodEnum<["PERCENTAGE", "FIXED"]>>;
    referrerRewardValue: z.ZodOptional<z.ZodNumber>;
    refereeBonusPercent: z.ZodOptional<z.ZodNumber>;
    avgCompletionSampleSize: z.ZodOptional<z.ZodNumber>;
    recentlyCompletedWindowHours: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    siteName: string;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    usdToBdtRate: number;
    defaultCurrency: "USD" | "BDT";
    smtpEnabled: boolean;
    whatsappEnabled?: boolean | undefined;
    whatsappNumber?: string | null | undefined;
    liveChatWidgetId?: string | null | undefined;
    howToOrderVideoUrl?: string | null | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPassword?: string | undefined;
    smtpFromAddress?: string | null | undefined;
    resendOrderButtonEnabled?: boolean | undefined;
    firstDepositBonusEnabled?: boolean | undefined;
    firstDepositBonusPercent?: number | undefined;
    firstDepositMinAmount?: number | undefined;
    firstDepositMaxBonus?: number | undefined;
    referralSystemEnabled?: boolean | undefined;
    referrerRewardType?: "PERCENTAGE" | "FIXED" | undefined;
    referrerRewardValue?: number | undefined;
    refereeBonusPercent?: number | undefined;
    avgCompletionSampleSize?: number | undefined;
    recentlyCompletedWindowHours?: number | undefined;
}, {
    siteName: string;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    usdToBdtRate: number;
    defaultCurrency: "USD" | "BDT";
    smtpEnabled: boolean;
    whatsappEnabled?: boolean | undefined;
    whatsappNumber?: string | null | undefined;
    liveChatWidgetId?: string | null | undefined;
    howToOrderVideoUrl?: string | null | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPassword?: string | undefined;
    smtpFromAddress?: string | null | undefined;
    resendOrderButtonEnabled?: boolean | undefined;
    firstDepositBonusEnabled?: boolean | undefined;
    firstDepositBonusPercent?: number | undefined;
    firstDepositMinAmount?: number | undefined;
    firstDepositMaxBonus?: number | undefined;
    referralSystemEnabled?: boolean | undefined;
    referrerRewardType?: "PERCENTAGE" | "FIXED" | undefined;
    referrerRewardValue?: number | undefined;
    refereeBonusPercent?: number | undefined;
    avgCompletionSampleSize?: number | undefined;
    recentlyCompletedWindowHours?: number | undefined;
}>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export declare const sendTestEmailSchema: z.ZodObject<{
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    to: string;
}, {
    to: string;
}>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export declare const publicSettingsSchema: z.ZodObject<{
    siteName: z.ZodString;
    liveChatProvider: z.ZodEnum<["NONE", "TAWKTO", "CRISP"]>;
    liveChatWidgetId: z.ZodNullable<z.ZodString>;
    howToOrderVideoUrl: z.ZodNullable<z.ZodString>;
    usdToBdtRate: z.ZodString;
    defaultCurrency: z.ZodEnum<["USD", "BDT"]>;
    googleAuthEnabled: z.ZodBoolean;
    firstDepositBonusEnabled: z.ZodBoolean;
    firstDepositBonusPercent: z.ZodString;
    firstDepositMinAmount: z.ZodString;
    firstDepositMaxBonus: z.ZodString;
    referralSystemEnabled: z.ZodBoolean;
    referrerRewardType: z.ZodEnum<["PERCENTAGE", "FIXED"]>;
    referrerRewardValue: z.ZodString;
    refereeBonusPercent: z.ZodString;
    recentlyCompletedWindowHours: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    siteName: string;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    liveChatWidgetId: string | null;
    howToOrderVideoUrl: string | null;
    usdToBdtRate: string;
    defaultCurrency: "USD" | "BDT";
    firstDepositBonusEnabled: boolean;
    firstDepositBonusPercent: string;
    firstDepositMinAmount: string;
    firstDepositMaxBonus: string;
    referralSystemEnabled: boolean;
    referrerRewardType: "PERCENTAGE" | "FIXED";
    referrerRewardValue: string;
    refereeBonusPercent: string;
    recentlyCompletedWindowHours: number;
    googleAuthEnabled: boolean;
}, {
    siteName: string;
    liveChatProvider: "NONE" | "TAWKTO" | "CRISP";
    liveChatWidgetId: string | null;
    howToOrderVideoUrl: string | null;
    usdToBdtRate: string;
    defaultCurrency: "USD" | "BDT";
    firstDepositBonusEnabled: boolean;
    firstDepositBonusPercent: string;
    firstDepositMinAmount: string;
    firstDepositMaxBonus: string;
    referralSystemEnabled: boolean;
    referrerRewardType: "PERCENTAGE" | "FIXED";
    referrerRewardValue: string;
    refereeBonusPercent: string;
    recentlyCompletedWindowHours: number;
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
export declare const SupportChannelTypeValues: readonly ["WHATSAPP", "TELEGRAM", "MESSENGER", "CUSTOM", "TICKET"];
export type SupportChannelType = (typeof SupportChannelTypeValues)[number];
export declare const supportChannelUpdateSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    value: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sortOrder: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sortOrder: number;
    enabled: boolean;
    value?: string | null | undefined;
    label?: string | null | undefined;
}, {
    sortOrder: number;
    enabled: boolean;
    value?: string | null | undefined;
    label?: string | null | undefined;
}>;
export type SupportChannelUpdateInput = z.infer<typeof supportChannelUpdateSchema>;
export declare const adminSupportChannelSchema: z.ZodObject<{
    type: z.ZodEnum<["WHATSAPP", "TELEGRAM", "MESSENGER", "CUSTOM", "TICKET"]>;
    enabled: z.ZodBoolean;
    value: z.ZodNullable<z.ZodString>;
    label: z.ZodNullable<z.ZodString>;
    sortOrder: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value: string | null;
    type: "WHATSAPP" | "TELEGRAM" | "MESSENGER" | "CUSTOM" | "TICKET";
    sortOrder: number;
    enabled: boolean;
    label: string | null;
}, {
    value: string | null;
    type: "WHATSAPP" | "TELEGRAM" | "MESSENGER" | "CUSTOM" | "TICKET";
    sortOrder: number;
    enabled: boolean;
    label: string | null;
}>;
export type AdminSupportChannel = z.infer<typeof adminSupportChannelSchema>;
export declare const publicSupportChannelSchema: z.ZodObject<{
    type: z.ZodEnum<["WHATSAPP", "TELEGRAM", "MESSENGER", "CUSTOM", "TICKET"]>;
    label: z.ZodString;
    href: z.ZodNullable<z.ZodString>;
    external: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "WHATSAPP" | "TELEGRAM" | "MESSENGER" | "CUSTOM" | "TICKET";
    label: string;
    href: string | null;
    external: boolean;
}, {
    type: "WHATSAPP" | "TELEGRAM" | "MESSENGER" | "CUSTOM" | "TICKET";
    label: string;
    href: string | null;
    external: boolean;
}>;
export type PublicSupportChannel = z.infer<typeof publicSupportChannelSchema>;
export declare const bannerInputSchema: z.ZodObject<{
    link: z.ZodString;
    image: z.ZodString;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    link: string;
    image: string;
    order: number;
}, {
    link: string;
    image: string;
    order: number;
}>;
export type BannerInput = z.infer<typeof bannerInputSchema>;
export declare const noticeObjectSchema: z.ZodObject<{
    messageBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messageEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    level: z.ZodDefault<z.ZodEnum<["INFO", "WARNING", "SUCCESS", "ERROR"]>>;
    active: z.ZodDefault<z.ZodBoolean>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    level: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "SUCCESS" | "INFO" | "WARNING" | "ERROR" | undefined;
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
    level: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "SUCCESS" | "INFO" | "WARNING" | "ERROR" | undefined;
    active?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}>, {
    level: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
    active: boolean;
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
}, {
    messageBn?: string | null | undefined;
    messageEn?: string | null | undefined;
    level?: "SUCCESS" | "INFO" | "WARNING" | "ERROR" | undefined;
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
    type: "FIXED" | "PERCENT";
    active: boolean;
    maxUses?: number | null | undefined;
    expiresAt?: Date | null | undefined;
}, {
    value: number;
    code: string;
    type: "FIXED" | "PERCENT";
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
export declare const PostCategoryValues: readonly ["DOCUMENTATION", "BLOG", "UPDATE"];
export type PostCategory = (typeof PostCategoryValues)[number];
export declare const PostStatusValues: readonly ["DRAFT", "PUBLISHED"];
export type PostStatus = (typeof PostStatusValues)[number];
/**
 * Pull the 11-character video id out of any YouTube URL form an admin might
 * paste — watch?v=, youtu.be/, /embed/, /shorts/, or a bare id — ignoring
 * extra query params (&t=, &list=, …). Also accepts a full <iframe …> embed
 * snippet (grabs the src). Returns null for anything that isn't YouTube.
 */
export declare function parseYouTubeId(input: string): string | null;
export declare const postObjectSchema: z.ZodObject<{
    slug: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["DOCUMENTATION", "BLOG", "UPDATE"]>>;
    status: z.ZodDefault<z.ZodEnum<["DRAFT", "PUBLISHED"]>>;
    coverImage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    youtubeUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pdfFile: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pdfName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    titleEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    titleBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PUBLISHED";
    slug: string;
    category: "DOCUMENTATION" | "BLOG" | "UPDATE";
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}, {
    slug: string;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}>;
export declare const postInputSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    slug: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["DOCUMENTATION", "BLOG", "UPDATE"]>>;
    status: z.ZodDefault<z.ZodEnum<["DRAFT", "PUBLISHED"]>>;
    coverImage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    youtubeUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pdfFile: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pdfName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    titleEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    titleBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentEn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentBn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PUBLISHED";
    slug: string;
    category: "DOCUMENTATION" | "BLOG" | "UPDATE";
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}, {
    slug: string;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}>, {
    status: "DRAFT" | "PUBLISHED";
    slug: string;
    category: "DOCUMENTATION" | "BLOG" | "UPDATE";
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}, {
    slug: string;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}>, {
    status: "DRAFT" | "PUBLISHED";
    slug: string;
    category: "DOCUMENTATION" | "BLOG" | "UPDATE";
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}, {
    slug: string;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    titleBn?: string | null | undefined;
    titleEn?: string | null | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
    coverImage?: string | null | undefined;
    youtubeUrl?: string | null | undefined;
    pdfFile?: string | null | undefined;
    pdfName?: string | null | undefined;
    contentEn?: string | null | undefined;
    contentBn?: string | null | undefined;
}>;
export type PostInput = z.infer<typeof postInputSchema>;
export declare const postListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    category: z.ZodOptional<z.ZodEnum<["DOCUMENTATION", "BLOG", "UPDATE"]>>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
}>;
export type PostListQuery = z.infer<typeof postListQuerySchema>;
export declare const publicPostListQuerySchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["DOCUMENTATION", "BLOG", "UPDATE"]>>;
}, "strip", z.ZodTypeAny, {
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
}, {
    category?: "DOCUMENTATION" | "BLOG" | "UPDATE" | undefined;
}>;
export declare const ProductDesignTemplateValues: readonly ["SMALL_STRIP", "STANDARD_GRID", "FEATURED_LARGE"];
export type ProductDesignTemplate = (typeof ProductDesignTemplateValues)[number];
export declare const PackageDesignTemplateValues: readonly ["RADIO_LIST", "BOXED_GRID"];
export type PackageDesignTemplate = (typeof PackageDesignTemplateValues)[number];
export declare const ProductTypeValues: readonly ["TOPUP", "VOUCHER", "SMM", "SUBSCRIPTION"];
export type ProductType = (typeof ProductTypeValues)[number];
export declare const AccessTypeValues: readonly ["ALL", "VIP", "RESELLER"];
export type AccessType = (typeof AccessTypeValues)[number];
export declare const StockCodeStatusValues: readonly ["AVAILABLE", "CONSUMED", "REVOKED"];
export type StockCodeStatus = (typeof StockCodeStatusValues)[number];
export declare const brandObjectSchema: z.ZodObject<{
    name: z.ZodString;
    level: z.ZodDefault<z.ZodNumber>;
    productDesign: z.ZodDefault<z.ZodEnum<["SMALL_STRIP", "STANDARD_GRID", "FEATURED_LARGE"]>>;
    logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    level: number;
    productDesign: "SMALL_STRIP" | "STANDARD_GRID" | "FEATURED_LARGE";
    logo?: string | null | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    level?: number | undefined;
    productDesign?: "SMALL_STRIP" | "STANDARD_GRID" | "FEATURED_LARGE" | undefined;
    logo?: string | null | undefined;
}>;
export type BrandInput = z.infer<typeof brandObjectSchema>;
export declare const productObjectSchema: z.ZodObject<{
    brandId: z.ZodString;
    name: z.ZodString;
    userInputFieldName: z.ZodDefault<z.ZodString>;
    orderInstructionsLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    salePrice: z.ZodNumber;
    buyPrice: z.ZodDefault<z.ZodNumber>;
    quantity: z.ZodDefault<z.ZodNumber>;
    productType: z.ZodEnum<["TOPUP", "VOUCHER", "SMM", "SUBSCRIPTION"]>;
    accessType: z.ZodDefault<z.ZodEnum<["ALL", "VIP", "RESELLER"]>>;
    logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    secondaryType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    level: z.ZodDefault<z.ZodNumber>;
    isAuto: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    productNote: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slug: z.ZodString;
    gameCheaterType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasOrderTimeLimit: z.ZodDefault<z.ZodBoolean>;
    maxOrdersPerWindow: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    orderWindowHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    checkUniquePlayerId: z.ZodDefault<z.ZodBoolean>;
    isQuantityMinusOnOrder: z.ZodDefault<z.ZodBoolean>;
    isQuantityShowUser: z.ZodDefault<z.ZodBoolean>;
    isPremiumProduct: z.ZodDefault<z.ZodBoolean>;
    minAmountForPremium: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    removeCharacters: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    redeemLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isResellerProduct: z.ZodDefault<z.ZodBoolean>;
    isMysteryBox: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    packageDesign: z.ZodDefault<z.ZodEnum<["RADIO_LIST", "BOXED_GRID"]>>;
    serviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    quantity: number;
    isActive: boolean;
    level: number;
    slug: string;
    brandId: string;
    userInputFieldName: string;
    salePrice: number;
    buyPrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    isAuto: boolean;
    hasOrderTimeLimit: boolean;
    checkUniquePlayerId: boolean;
    isQuantityMinusOnOrder: boolean;
    isQuantityShowUser: boolean;
    isPremiumProduct: boolean;
    isResellerProduct: boolean;
    isMysteryBox: boolean;
    packageDesign: "RADIO_LIST" | "BOXED_GRID";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    logo?: string | null | undefined;
    orderInstructionsLink?: string | null | undefined;
    secondaryType?: string | null | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
}, {
    name: string;
    slug: string;
    brandId: string;
    salePrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    quantity?: number | undefined;
    isActive?: boolean | undefined;
    level?: number | undefined;
    logo?: string | null | undefined;
    userInputFieldName?: string | undefined;
    orderInstructionsLink?: string | null | undefined;
    buyPrice?: number | undefined;
    accessType?: "ALL" | "VIP" | "RESELLER" | undefined;
    secondaryType?: string | null | undefined;
    isAuto?: boolean | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    hasOrderTimeLimit?: boolean | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    checkUniquePlayerId?: boolean | undefined;
    isQuantityMinusOnOrder?: boolean | undefined;
    isQuantityShowUser?: boolean | undefined;
    isPremiumProduct?: boolean | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
    isResellerProduct?: boolean | undefined;
    isMysteryBox?: boolean | undefined;
    packageDesign?: "RADIO_LIST" | "BOXED_GRID" | undefined;
}>;
export declare const productInputSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    brandId: z.ZodString;
    name: z.ZodString;
    userInputFieldName: z.ZodDefault<z.ZodString>;
    orderInstructionsLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    salePrice: z.ZodNumber;
    buyPrice: z.ZodDefault<z.ZodNumber>;
    quantity: z.ZodDefault<z.ZodNumber>;
    productType: z.ZodEnum<["TOPUP", "VOUCHER", "SMM", "SUBSCRIPTION"]>;
    accessType: z.ZodDefault<z.ZodEnum<["ALL", "VIP", "RESELLER"]>>;
    logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    secondaryType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    level: z.ZodDefault<z.ZodNumber>;
    isAuto: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    productNote: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slug: z.ZodString;
    gameCheaterType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasOrderTimeLimit: z.ZodDefault<z.ZodBoolean>;
    maxOrdersPerWindow: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    orderWindowHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    checkUniquePlayerId: z.ZodDefault<z.ZodBoolean>;
    isQuantityMinusOnOrder: z.ZodDefault<z.ZodBoolean>;
    isQuantityShowUser: z.ZodDefault<z.ZodBoolean>;
    isPremiumProduct: z.ZodDefault<z.ZodBoolean>;
    minAmountForPremium: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    removeCharacters: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    redeemLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isResellerProduct: z.ZodDefault<z.ZodBoolean>;
    isMysteryBox: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    packageDesign: z.ZodDefault<z.ZodEnum<["RADIO_LIST", "BOXED_GRID"]>>;
    serviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    quantity: number;
    isActive: boolean;
    level: number;
    slug: string;
    brandId: string;
    userInputFieldName: string;
    salePrice: number;
    buyPrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    isAuto: boolean;
    hasOrderTimeLimit: boolean;
    checkUniquePlayerId: boolean;
    isQuantityMinusOnOrder: boolean;
    isQuantityShowUser: boolean;
    isPremiumProduct: boolean;
    isResellerProduct: boolean;
    isMysteryBox: boolean;
    packageDesign: "RADIO_LIST" | "BOXED_GRID";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    logo?: string | null | undefined;
    orderInstructionsLink?: string | null | undefined;
    secondaryType?: string | null | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
}, {
    name: string;
    slug: string;
    brandId: string;
    salePrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    quantity?: number | undefined;
    isActive?: boolean | undefined;
    level?: number | undefined;
    logo?: string | null | undefined;
    userInputFieldName?: string | undefined;
    orderInstructionsLink?: string | null | undefined;
    buyPrice?: number | undefined;
    accessType?: "ALL" | "VIP" | "RESELLER" | undefined;
    secondaryType?: string | null | undefined;
    isAuto?: boolean | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    hasOrderTimeLimit?: boolean | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    checkUniquePlayerId?: boolean | undefined;
    isQuantityMinusOnOrder?: boolean | undefined;
    isQuantityShowUser?: boolean | undefined;
    isPremiumProduct?: boolean | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
    isResellerProduct?: boolean | undefined;
    isMysteryBox?: boolean | undefined;
    packageDesign?: "RADIO_LIST" | "BOXED_GRID" | undefined;
}>, {
    name: string;
    quantity: number;
    isActive: boolean;
    level: number;
    slug: string;
    brandId: string;
    userInputFieldName: string;
    salePrice: number;
    buyPrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    isAuto: boolean;
    hasOrderTimeLimit: boolean;
    checkUniquePlayerId: boolean;
    isQuantityMinusOnOrder: boolean;
    isQuantityShowUser: boolean;
    isPremiumProduct: boolean;
    isResellerProduct: boolean;
    isMysteryBox: boolean;
    packageDesign: "RADIO_LIST" | "BOXED_GRID";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    logo?: string | null | undefined;
    orderInstructionsLink?: string | null | undefined;
    secondaryType?: string | null | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
}, {
    name: string;
    slug: string;
    brandId: string;
    salePrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    quantity?: number | undefined;
    isActive?: boolean | undefined;
    level?: number | undefined;
    logo?: string | null | undefined;
    userInputFieldName?: string | undefined;
    orderInstructionsLink?: string | null | undefined;
    buyPrice?: number | undefined;
    accessType?: "ALL" | "VIP" | "RESELLER" | undefined;
    secondaryType?: string | null | undefined;
    isAuto?: boolean | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    hasOrderTimeLimit?: boolean | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    checkUniquePlayerId?: boolean | undefined;
    isQuantityMinusOnOrder?: boolean | undefined;
    isQuantityShowUser?: boolean | undefined;
    isPremiumProduct?: boolean | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
    isResellerProduct?: boolean | undefined;
    isMysteryBox?: boolean | undefined;
    packageDesign?: "RADIO_LIST" | "BOXED_GRID" | undefined;
}>, {
    name: string;
    quantity: number;
    isActive: boolean;
    level: number;
    slug: string;
    brandId: string;
    userInputFieldName: string;
    salePrice: number;
    buyPrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    isAuto: boolean;
    hasOrderTimeLimit: boolean;
    checkUniquePlayerId: boolean;
    isQuantityMinusOnOrder: boolean;
    isQuantityShowUser: boolean;
    isPremiumProduct: boolean;
    isResellerProduct: boolean;
    isMysteryBox: boolean;
    packageDesign: "RADIO_LIST" | "BOXED_GRID";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    logo?: string | null | undefined;
    orderInstructionsLink?: string | null | undefined;
    secondaryType?: string | null | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
}, {
    name: string;
    slug: string;
    brandId: string;
    salePrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    quantity?: number | undefined;
    isActive?: boolean | undefined;
    level?: number | undefined;
    logo?: string | null | undefined;
    userInputFieldName?: string | undefined;
    orderInstructionsLink?: string | null | undefined;
    buyPrice?: number | undefined;
    accessType?: "ALL" | "VIP" | "RESELLER" | undefined;
    secondaryType?: string | null | undefined;
    isAuto?: boolean | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    hasOrderTimeLimit?: boolean | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    checkUniquePlayerId?: boolean | undefined;
    isQuantityMinusOnOrder?: boolean | undefined;
    isQuantityShowUser?: boolean | undefined;
    isPremiumProduct?: boolean | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
    isResellerProduct?: boolean | undefined;
    isMysteryBox?: boolean | undefined;
    packageDesign?: "RADIO_LIST" | "BOXED_GRID" | undefined;
}>, {
    name: string;
    quantity: number;
    isActive: boolean;
    level: number;
    slug: string;
    brandId: string;
    userInputFieldName: string;
    salePrice: number;
    buyPrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    accessType: "ALL" | "VIP" | "RESELLER";
    isAuto: boolean;
    hasOrderTimeLimit: boolean;
    checkUniquePlayerId: boolean;
    isQuantityMinusOnOrder: boolean;
    isQuantityShowUser: boolean;
    isPremiumProduct: boolean;
    isResellerProduct: boolean;
    isMysteryBox: boolean;
    packageDesign: "RADIO_LIST" | "BOXED_GRID";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    logo?: string | null | undefined;
    orderInstructionsLink?: string | null | undefined;
    secondaryType?: string | null | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
}, {
    name: string;
    slug: string;
    brandId: string;
    salePrice: number;
    productType: "TOPUP" | "VOUCHER" | "SMM" | "SUBSCRIPTION";
    description?: string | null | undefined;
    serviceId?: string | null | undefined;
    quantity?: number | undefined;
    isActive?: boolean | undefined;
    level?: number | undefined;
    logo?: string | null | undefined;
    userInputFieldName?: string | undefined;
    orderInstructionsLink?: string | null | undefined;
    buyPrice?: number | undefined;
    accessType?: "ALL" | "VIP" | "RESELLER" | undefined;
    secondaryType?: string | null | undefined;
    isAuto?: boolean | undefined;
    productNote?: string | null | undefined;
    gameCheaterType?: string | null | undefined;
    hasOrderTimeLimit?: boolean | undefined;
    maxOrdersPerWindow?: number | null | undefined;
    orderWindowHours?: number | null | undefined;
    checkUniquePlayerId?: boolean | undefined;
    isQuantityMinusOnOrder?: boolean | undefined;
    isQuantityShowUser?: boolean | undefined;
    isPremiumProduct?: boolean | undefined;
    minAmountForPremium?: number | null | undefined;
    removeCharacters?: string | null | undefined;
    redeemLink?: string | null | undefined;
    isResellerProduct?: boolean | undefined;
    isMysteryBox?: boolean | undefined;
    packageDesign?: "RADIO_LIST" | "BOXED_GRID" | undefined;
}>;
export type ProductInput = z.infer<typeof productInputSchema>;
export declare const packageObjectSchema: z.ZodObject<{
    productId: z.ZodString;
    name: z.ZodString;
    amount: z.ZodNumber;
    salePrice: z.ZodNumber;
    buyPrice: z.ZodDefault<z.ZodNumber>;
    commonPriceUsd: z.ZodNumber;
    extraFee: z.ZodDefault<z.ZodNumber>;
    level: z.ZodDefault<z.ZodNumber>;
    isAuto: z.ZodDefault<z.ZodBoolean>;
    isManual: z.ZodDefault<z.ZodBoolean>;
    server: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stockPoolIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    name: string;
    level: number;
    salePrice: number;
    buyPrice: number;
    isAuto: boolean;
    productId: string;
    commonPriceUsd: number;
    extraFee: number;
    isManual: boolean;
    stockPoolIds: string[];
    server?: string | null | undefined;
}, {
    amount: number;
    name: string;
    salePrice: number;
    productId: string;
    commonPriceUsd: number;
    level?: number | undefined;
    buyPrice?: number | undefined;
    isAuto?: boolean | undefined;
    extraFee?: number | undefined;
    isManual?: boolean | undefined;
    server?: string | null | undefined;
    stockPoolIds?: string[] | undefined;
}>;
export type PackageInput = z.infer<typeof packageObjectSchema>;
export declare const stockPoolInputSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type StockPoolInput = z.infer<typeof stockPoolInputSchema>;
export declare const stockPoolBulkAddSchema: z.ZodObject<{
    codes: z.ZodString;
}, "strip", z.ZodTypeAny, {
    codes: string;
}, {
    codes: string;
}>;
export type StockPoolBulkAddInput = z.infer<typeof stockPoolBulkAddSchema>;
export declare const brandListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;
export declare const productListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    brandId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    brandId?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    brandId?: string | undefined;
}>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export declare const packageListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    productId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    productId?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    productId?: string | undefined;
}>;
export type PackageListQuery = z.infer<typeof packageListQuerySchema>;
export declare const purchasePackageSchema: z.ZodObject<{
    packageId: z.ZodString;
    buyerInput: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageId: string;
    buyerInput: string;
}, {
    packageId: string;
    buyerInput: string;
}>;
export type PurchasePackageInput = z.infer<typeof purchasePackageSchema>;
