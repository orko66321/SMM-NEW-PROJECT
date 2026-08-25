import sanitizeHtml from "sanitize-html";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
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
export async function createTicket(userId, input) {
    return prisma.ticket.create({
        data: {
            userId,
            subject: sanitize(input.subject),
            messages: {
                create: [{ senderId: userId, senderRole: "USER", body: sanitize(input.message) }],
            },
        },
        include: { messages: true },
    });
}
export async function listTicketsForUser(userId, page, pageSize) {
    const where = { userId };
    const [items, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
export async function listTicketsForAdmin(page, pageSize, status) {
    const where = status ? { status: status } : {};
    const [items, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            include: { user: { select: { username: true } } },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
async function getTicketOr404(ticketId) {
    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    return ticket;
}
export async function getTicketForUser(ticketId, userId) {
    const ticket = await getTicketOr404(ticketId);
    if (ticket.userId !== userId)
        throw AppError.forbidden();
    return ticket;
}
export async function getTicketForAdmin(ticketId) {
    return getTicketOr404(ticketId);
}
export async function addMessage(ticketId, senderId, senderRole, message) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket)
        throw AppError.notFound("Ticket not found");
    return prisma.$transaction(async (tx) => {
        const created = await tx.ticketMessage.create({
            data: { ticketId, senderId, senderRole, body: sanitize(message) },
        });
        await tx.ticket.update({
            where: { id: ticketId },
            data: { status: senderRole === "ADMIN" ? "PENDING_USER" : "PENDING_ADMIN", updatedAt: new Date() },
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
