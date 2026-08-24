import { Router } from "express";
import { changePasswordSchema, updateProfileSchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changePassword, getMyProfile, updateProfile } from "../services/profile.service.js";
import { generateApiKey, revokeApiKey } from "../services/apiKey.service.js";

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ profile: await getMyProfile(req.user!.id) });
  }),
);

usersRouter.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    res.json({ profile: await updateProfile(req.user!.id, req.body) });
  }),
);

usersRouter.post(
  "/me/password",
  authLimiter,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await changePassword(req.user!.id, req.body);
    res.status(204).end();
  }),
);

// Returns the plaintext key exactly once — see apiKey.service.ts.
usersRouter.post(
  "/me/api-key",
  asyncHandler(async (req, res) => {
    const { apiKey, prefix } = await generateApiKey(req.user!.id);
    res.status(201).json({ apiKey, prefix });
  }),
);

usersRouter.delete(
  "/me/api-key",
  asyncHandler(async (req, res) => {
    await revokeApiKey(req.user!.id);
    res.status(204).end();
  }),
);
