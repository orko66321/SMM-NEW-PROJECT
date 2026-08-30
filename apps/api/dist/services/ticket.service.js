import sanitizeHtml from "sanitize-html";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { cancelOrderForUser, refreshOrderFromProvider, requestRefill, } from "./order.service.js";
import { runTicketAutomation } from "./ticketAutomation.service.js";
// Ticket bodies are free-text rendered back to both the customer and admin
// staff — sanitize on the way in so stored XSS via a ticket message is not
// possible regardless of how the frontend later renders it. Plain
// sanitize-html rather than isomorphic-dompurify: the latter pulls in
// jsdom, which pulls in html-encoding-sniffer — a package whose own
// package.json requires Node >=20.19/22.12/24, one minor version past
// this host's pinned Node 20.18.3, causing require(esm) to throw and
// crash the app before it ever binds a port (Passenger then silently
// falls back to its own placeholder page instead of surfacing the
// crash). No allowed tags/attrs either way, so nothing is lost.
function sanitize(input) {
    return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}
const MAX_ORDER_IDS = 20;
const TICKET_INCLUDE = {
    category: { select: { id: true, name: true, isAutomated: true } },
    subcategory: { select: { id: true, name: true, actionKey: true } },
    messages: { orderBy: { createdAt: "asc" } },
    orderActions: { orderBy: { createdAt: "asc" } },
};
// ── Category / subcategory catalog (DB-driven, admin-editable) ──────────────
export async function listTicketCategories() {
    const categories = await prisma.ticketCategory.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
        include: {
            subcategories: {
                where: { enabled: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, name: true, actionKey: true },
            },
        },
    });
    return categories.map((c) => ({
        id: c.id,
        name: c.name,
        isAutomated: c.isAutomated,
        subcategories: c.subcategories,
    }));
}
// ── Helpers ────────────────────────────────────────────────────────────────
/**
 * Splits the comma-separated Order ID field, dedupes, caps the count, and —
 * critically — confirms every ID belongs to the requesting user. Any ID that
 * doesn't exist or isn't theirs is rejected with a clear per-ID error and
 * NOTHING is acted on (build spec §4 step 2 / §10 — the most likely place
 * for an IDOR bug).
 */
async function parseAndAuthorizeOrderIds(userId, raw) {
    const tokens = (raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const unique = [...new Set(tokens)];
    if (unique.length === 0)
        throw AppError.badRequest("Enter at least one Order ID");
    if (unique.length > MAX_ORDER_IDS) {
        throw AppError.badRequest(`At most ${MAX_ORDER_IDS} Order IDs per ticket`);
    }
    const owned = await prisma.order.findMany({
        where: { id: { in: unique }, userId },
        select: { id: true },
    });
    const ownedSet = new Set(owned.map((o) => o.id));
    const missing = unique.filter((id) => !ownedSet.has(id));
    if (missing.length > 0) {
        throw AppError.badRequest(`These Order IDs aren't in your account: ${missing.join(", ")}`);
    }
    return unique;
}
async function resolveAutomatedInput(userId, categoryId, input) {
    if (!input.subcategoryId)
        throw AppError.badRequest("Please choose a subcategory");
    const subcategory = await prisma.ticketSubcategory.findFirst({
        where: { id: input.subcategoryId, categoryId, enabled: true },
    });
    if (!subcategory)
        throw AppError.badRequest("Unknown subcategory");
    const orderIds = await parseAndAuthorizeOrderIds(userId, input.orderIds);
    return { subcategory, orderIds };
}
// Build spec §5 — no subject input; it's generated server-side.
function buildAiSubject(subcategoryName, orderIds) {
    const suffix = orderIds.length > 1 ? ` (+${orderIds.length - 1} more)` : "";
    return `${subcategoryName} — Order #${orderIds[0]}${suffix}`;
}
function buildHumanSubject(message) {
    const flat = message.replace(/\s+/g, " ").trim();
    return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}
async function getTicketOr404(ticketId) {
    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: TICKET_INCLUDE,
    });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    return ticket;
}
// ── Create ─────────────────────────────────────────────────────────────────
export async function createTicket(userId, input) {
    const category = await prisma.ticketCategory.findFirst({
        where: { id: input.categoryId, enabled: true },
    });
    if (!category)
        throw AppError.badRequest("Unknown ticket category");
    if (category.isAutomated) {
        const { subcategory, orderIds } = await resolveAutomatedInput(userId, category.id, input);
        const ticket = await prisma.ticket.create({
            data: {
                userId,
                categoryId: category.id,
                subcategoryId: subcategory.id,
                subject: buildAiSubject(subcategory.name, orderIds),
                status: "AI_PROCESSING",
                orderIds,
                messages: {
                    create: [
                        {
                            senderId: userId,
                            senderRole: "USER",
                            body: `${subcategory.name} requested for order(s): ${orderIds.join(", ")}`,
                        },
                    ],
                },
            },
        });
        await runTicketAutomation({
            ticketId: ticket.id,
            userId,
            actionKey: subcategory.actionKey,
            orderIds,
        });
        return getTicketOr404(ticket.id);
    }
    // Human Support — free text straight to the human queue.
    const message = (input.message ?? "").trim();
    if (!message)
        throw AppError.badRequest("A message is required for Human Support");
    const ticket = await prisma.ticket.create({
        data: {
            userId,
            categoryId: category.id,
            subject: buildHumanSubject(message),
            status: "PENDING_ADMIN",
            messages: {
                create: [{ senderId: userId, senderRole: "USER", body: sanitize(message) }],
            },
        },
    });
    return getTicketOr404(ticket.id);
}
// ── Lists ──────────────────────────────────────────────────────────────────
export async function listTicketsForUser(userId, page, pageSize) {
    const where = { userId };
    const [items, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            include: { category: { select: { name: true, isAutomated: true } } },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
export async function listTicketsForAdmin(page, pageSize, filters = {}) {
    const where = {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.subcategoryId ? { subcategoryId: filters.subcategoryId } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            include: {
                user: { select: { username: true } },
                category: { select: { name: true, isAutomated: true } },
                subcategory: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
// ── Single ticket ──────────────────────────────────────────────────────────
export async function getTicketForUser(ticketId, userId) {
    const ticket = await getTicketOr404(ticketId);
    if (ticket.userId !== userId)
        throw AppError.forbidden();
    return ticket;
}
export async function getTicketForAdmin(ticketId) {
    const ticket = await getTicketOr404(ticketId);
    // Linked orders shown inline in the agent view (build spec §8) — status,
    // service, provider without leaving the ticket.
    const orders = ticket.orderIds.length
        ? await prisma.order.findMany({
            where: { id: { in: ticket.orderIds } },
            select: {
                id: true,
                status: true,
                quantity: true,
                link: true,
                mode: true,
                providerOrderId: true,
                charge: true,
                service: { select: { name: true, refillEnabled: true, cancelEnabled: true } },
            },
        })
        : [];
    return {
        ...ticket,
        linkedOrders: orders.map((o) => ({ ...o, charge: o.charge.toString() })),
    };
}
// ── Replies ────────────────────────────────────────────────────────────────
/**
 * User reply from the thread view. Re-uses the exact same form as create — if
 * the reply picks an automated category + subcategory it runs through the
 * §4 engine again (e.g. request a refill on a different order mid-thread);
 * otherwise it's a plain message that flips the ticket to the human queue.
 */
export async function addUserMessage(ticketId, userId, input) {
    const ticket = await getTicketForUser(ticketId, userId);
    if (ticket.status === "CLOSED")
        throw AppError.badRequest("This ticket is closed — open a new one");
    const category = input.categoryId
        ? await prisma.ticketCategory.findFirst({ where: { id: input.categoryId, enabled: true } })
        : null;
    if (category?.isAutomated) {
        const { subcategory, orderIds } = await resolveAutomatedInput(userId, category.id, input);
        await prisma.$transaction(async (tx) => {
            await tx.ticketMessage.create({
                data: {
                    ticketId,
                    senderId: userId,
                    senderRole: "USER",
                    body: `${subcategory.name} requested for order(s): ${orderIds.join(", ")}`,
                },
            });
            await tx.ticket.update({
                where: { id: ticketId },
                data: {
                    status: "AI_PROCESSING",
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                    orderIds: { set: [...new Set([...ticket.orderIds, ...orderIds])] },
                    updatedAt: new Date(),
                },
            });
        });
        await runTicketAutomation({
            ticketId,
            userId,
            actionKey: subcategory.actionKey,
            orderIds,
        });
        return getTicketOr404(ticketId);
    }
    const message = (input.message ?? "").trim();
    if (!message)
        throw AppError.badRequest("Type a message");
    await prisma.$transaction(async (tx) => {
        await tx.ticketMessage.create({
            data: { ticketId, senderId: userId, senderRole: "USER", body: sanitize(message) },
        });
        await tx.ticket.update({
            where: { id: ticketId },
            data: { status: "PENDING_ADMIN", updatedAt: new Date() },
        });
    });
    return getTicketOr404(ticketId);
}
/** Admin/agent free-text reply. */
export async function addAdminMessage(ticketId, agentId, message) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    return prisma.$transaction(async (tx) => {
        const created = await tx.ticketMessage.create({
            data: { ticketId, senderId: agentId, senderRole: "ADMIN", body: sanitize(message) },
        });
        await tx.ticket.update({
            where: { id: ticketId },
            data: { status: "REPLIED", updatedAt: new Date() },
        });
        return created;
    });
}
export async function updateTicketStatus(ticketId, status) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    return prisma.ticket.update({ where: { id: ticketId }, data: { status: status } });
}
// ── Agent manual override (build spec §8) ──────────────────────────────────
const ACTION_KEY_BY_AGENT_ACTION = {
    refill: "REFILL",
    cancel: "CANCEL",
    restart: "RESTART",
};
/**
 * The agent's Refill / Cancel / Restart buttons call the SAME order.service
 * functions the automation engine calls — one service layer, two callers.
 */
export async function runAgentAction(ticketId, agentId, input) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    if (input.action === "close" || input.action === "reopen") {
        await updateTicketStatus(ticketId, input.action === "close" ? "CLOSED" : "IN_PROGRESS");
        return getTicketForAdmin(ticketId);
    }
    if (!input.orderId)
        throw AppError.badRequest("An order must be selected for this action");
    if (!ticket.orderIds.includes(input.orderId)) {
        throw AppError.badRequest("That order isn't linked to this ticket");
    }
    let detail;
    let result = "SUCCESS";
    try {
        if (input.action === "refill") {
            await requestRefill(ticket.userId, input.orderId);
            detail = "Agent requested a refill with the provider.";
        }
        else if (input.action === "cancel") {
            await cancelOrderForUser(ticket.userId, input.orderId);
            detail = "Agent canceled the order and refunded the wallet.";
        }
        else {
            const r = await refreshOrderFromProvider(ticket.userId, input.orderId);
            detail = `Agent re-checked with the provider — status: ${r.providerStatus}.`;
        }
    }
    catch (err) {
        result = "FAILED";
        detail = err instanceof AppError ? err.message : "The action failed.";
    }
    await prisma.$transaction(async (tx) => {
        await tx.ticketOrderAction.create({
            data: {
                ticketId,
                orderId: input.orderId,
                actionKey: ACTION_KEY_BY_AGENT_ACTION[input.action],
                result: result === "SUCCESS" ? "SUCCESS" : "FAILED",
                detail,
            },
        });
        await tx.ticketMessage.create({
            data: {
                ticketId,
                senderId: agentId,
                senderRole: "ADMIN",
                body: (input.note ? `${input.note}\n\n` : "") + detail,
            },
        });
        await tx.ticket.update({
            where: { id: ticketId },
            data: { status: result === "SUCCESS" ? "REPLIED" : "IN_PROGRESS", updatedAt: new Date() },
        });
    });
    return getTicketForAdmin(ticketId);
}
