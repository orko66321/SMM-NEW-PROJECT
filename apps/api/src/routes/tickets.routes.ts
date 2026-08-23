import { Router } from "express";
import { createTicketMessageSchema, createTicketSchema, paginationQuerySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { addMessage, createTicket, getTicketForUser, listTicketsForUser } from "../services/ticket.service.js";

export const ticketsRouter = Router();
ticketsRouter.use(authenticate);

ticketsRouter.post(
  "/",
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    const ticket = await createTicket(req.user!.id, req.body);
    res.status(201).json({ ticket });
  }),
);

ticketsRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    res.json(await listTicketsForUser(req.user!.id, page, pageSize));
  }),
);

ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticket = await getTicketForUser(req.params.id!, req.user!.id);
    res.json({ ticket });
  }),
);

ticketsRouter.post(
  "/:id/messages",
  validate(createTicketMessageSchema),
  asyncHandler(async (req, res) => {
    // Ensure the ticket belongs to this user before allowing a reply.
    await getTicketForUser(req.params.id!, req.user!.id);
    const message = await addMessage(req.params.id!, req.user!.id, "USER", req.body.message);
    res.status(201).json({ message });
  }),
);
