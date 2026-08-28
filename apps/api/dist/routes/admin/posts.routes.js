import { Router } from "express";
import { postInputSchema, postListQuerySchema, postObjectSchema, } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createPost, deletePost, getAdminPost, listPostsForAdmin, updatePost, } from "../../services/post.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminPostsRouter = Router();
adminPostsRouter.get("/", validate(postListQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const category = req.query.category;
    const status = req.query.status;
    res.json(await listPostsForAdmin(page, pageSize, category, status));
}));
adminPostsRouter.get("/:id", asyncHandler(async (req, res) => {
    res.json({ post: await getAdminPost(req.params.id) });
}));
adminPostsRouter.post("/", validate(postInputSchema), asyncHandler(async (req, res) => {
    const post = await createPost(req.body);
    await writeAuditLog({
        actorId: req.user.id,
        action: "post.create",
        targetType: "Post",
        targetId: post.id,
        after: { slug: post.slug, category: post.category, status: post.status },
        ip: req.ip,
    });
    res.status(201).json({ post });
}));
adminPostsRouter.put("/:id", validate(postObjectSchema.partial()), asyncHandler(async (req, res) => {
    const post = await updatePost(req.params.id, req.body);
    await writeAuditLog({
        actorId: req.user.id,
        action: "post.update",
        targetType: "Post",
        targetId: req.params.id,
        after: { slug: post.slug, category: post.category, status: post.status },
        ip: req.ip,
    });
    res.json({ post });
}));
adminPostsRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deletePost(req.params.id);
    await writeAuditLog({
        actorId: req.user.id,
        action: "post.delete",
        targetType: "Post",
        targetId: req.params.id,
        ip: req.ip,
    });
    res.status(204).end();
}));
