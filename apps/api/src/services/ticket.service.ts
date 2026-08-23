import DOMPurify from "isomorphic-dompurify";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { CreateTicketInput } from "@smm/shared";

// Ticket bodies are free-text rendered back to both the customer and admin
// staff — sanitize on the way in so stored XSS via a ticket message is not
// possible regardless of how the frontend later renders it.
function sanitize(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export async function createTicket(userId: string, input: CreateTicketInput) {
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

export async function listTicketsForUser(userId: string, page: number, pageSize: number) {
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

export async function listTicketsForAdmin(page: number, pageSize: number, status?: string) {
  const where = status ? { status: status as never } : {};
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

async function getTicketOr404(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) throw AppError.notFound("Ticket not found");
  return ticket;
}

export async function getTicketForUser(ticketId: string, userId: string) {
  const ticket = await getTicketOr404(ticketId);
  if (ticket.userId !== userId) throw AppError.forbidden();
  return ticket;
}

export async function getTicketForAdmin(ticketId: string) {
  return getTicketOr404(ticketId);
}

export async function addMessage(
  ticketId: string,
  senderId: string,
  senderRole: "USER" | "ADMIN",
  message: string,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw AppError.notFound("Ticket not found");

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

export async function updateTicketStatus(ticketId: string, status: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw AppError.notFound("Ticket not found");
  return prisma.ticket.update({ where: { id: ticketId }, data: { status: status as never } });
}
