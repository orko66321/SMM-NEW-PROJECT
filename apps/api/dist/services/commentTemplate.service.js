import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
/** "" from a cleared optional field ⇒ null, same convention as settings.service.ts. */
function normalizeLink(link) {
    if (link === undefined)
        return undefined;
    return link || null;
}
export async function listCommentTemplates() {
    return prisma.commentTemplate.findMany({ orderBy: { createdAt: "desc" } });
}
export async function createCommentTemplate(input) {
    return prisma.commentTemplate.create({
        data: { text: input.text, link: normalizeLink(input.link) ?? null },
    });
}
export async function updateCommentTemplate(id, input) {
    const existing = await prisma.commentTemplate.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Comment template not found");
    return prisma.commentTemplate.update({
        where: { id },
        data: {
            ...(input.text !== undefined ? { text: input.text } : {}),
            ...(input.link !== undefined ? { link: normalizeLink(input.link) } : {}),
        },
    });
}
export async function deleteCommentTemplate(id) {
    const existing = await prisma.commentTemplate.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Comment template not found");
    await prisma.commentTemplate.delete({ where: { id } });
}
