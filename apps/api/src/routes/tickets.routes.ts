import { Router } from "express";
import { createTicketSchema, paginationQuerySchema, ticketReplySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ticketLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addUserMessage,
  createTicket,
  getTicketForUser,
  listTicketCategories,
  listTicketsForUser,
} from "../services/ticket.service.js";

export const ticketsRouter = Router();
ticketsRouter.use(authenticate);

// DB-driven category + subcategory list the ticket form renders from — so an
// admin can add / rename / disable subcategories without a deploy.
ticketsRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ categories: await listTicketCategories() });
  }),
);

ticketsRouter.post(
  "/",
  ticketLimiter,
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
  ticketLimiter,
  validate(ticketReplySchema),
  asyncHandler(async (req, res) => {
    const ticket = await addUserMessage(req.params.id!, req.user!.id, req.body);
    res.status(201).json({ ticket });
  }),
);
