import { Router } from "express";
import {
  adminTicketActionSchema,
  createTicketMessageSchema,
  ticketListQuerySchema,
  updateTicketStatusSchema,
} from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  addAdminMessage,
  getTicketForAdmin,
  listTicketCategories,
  listTicketsForAdmin,
  runAgentAction,
  updateTicketStatus,
} from "../../services/ticket.service.js";

export const adminTicketsRouter = Router();

adminTicketsRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ categories: await listTicketCategories() });
  }),
);

adminTicketsRouter.get(
  "/",
  validate(ticketListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const q = req.query as Record<string, string | undefined>;
    res.json(
      await listTicketsForAdmin(page, pageSize, {
        status: typeof q.status === "string" ? q.status : undefined,
        categoryId: typeof q.categoryId === "string" ? q.categoryId : undefined,
        subcategoryId: typeof q.subcategoryId === "string" ? q.subcategoryId : undefined,
      }),
    );
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
    const message = await addAdminMessage(req.params.id!, req.user!.id, req.body.message);
    res.status(201).json({ message });
  }),
);

// Agent manual-override buttons — refill / cancel / restart / close / reopen.
adminTicketsRouter.post(
  "/:id/action",
  validate(adminTicketActionSchema),
  asyncHandler(async (req, res) => {
    const ticket = await runAgentAction(req.params.id!, req.user!.id, req.body);
    res.json({ ticket });
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
