import { Router } from "express";
import { createTicketMessageSchema, ticketListQuerySchema, updateTicketStatusSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { addMessage, getTicketForAdmin, listTicketsForAdmin, updateTicketStatus } from "../../services/ticket.service.js";

export const adminTicketsRouter = Router();

adminTicketsRouter.get(
  "/",
  validate(ticketListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(await listTicketsForAdmin(page, pageSize, status));
  }),
);

adminTicketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ ticket: await getTicketForAdmin(req.params.id!) });
  }),
);

adminTicketsRouter.post(
  "/:id/messages",
  validate(createTicketMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await addMessage(req.params.id!, req.user!.id, "ADMIN", req.body.message);
    res.status(201).json({ message });
  }),
);

adminTicketsRouter.patch(
  "/:id/status",
  validate(updateTicketStatusSchema),
  asyncHandler(async (req, res) => {
    const ticket = await updateTicketStatus(req.params.id!, req.body.status);
    res.json({ ticket });
  }),
);
