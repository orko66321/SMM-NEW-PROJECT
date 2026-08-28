import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { AppError } from "../utils/AppError.js";
export async function listStockPoolsForAdmin(page, pageSize) {
    const [pools, total] = await Promise.all([
        prisma.stockPool.findMany({
            orderBy: { name: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.stockPool.count(),
    ]);
    // Counted separately per pool rather than a single groupBy — the list is
    // always small (a handful of named pools, not thousands), so the N extra
    // cheap indexed counts are simpler than reshaping a groupBy result.
    const items = await Promise.all(pools.map(async (pool) => {
        const [available, consumed, revoked] = await Promise.all([
            prisma.stockCode.count({ where: { poolId: pool.id, status: "AVAILABLE" } }),
            prisma.stockCode.count({ where: { poolId: pool.id, status: "CONSUMED" } }),
            prisma.stockCode.count({ where: { poolId: pool.id, status: "REVOKED" } }),
        ]);
        return { ...pool, available, consumed, revoked };
    }));
    return { items, total, page, pageSize };
}
export async function createStockPool(input) {
    const existing = await prisma.stockPool.findUnique({ where: { name: input.name } });
    if (existing)
        throw AppError.conflict("A stock pool with this name already exists");
    return prisma.stockPool.create({ data: input });
}
export async function deleteStockPool(id) {
    const pool = await prisma.stockPool.findUnique({ where: { id } });
    if (!pool)
        throw AppError.notFound("Stock pool not found");
    const linked = await prisma.packageStockPool.count({ where: { poolId: id } });
    if (linked > 0) {
        throw AppError.conflict("This pool is still linked to one or more packages — unlink it first");
    }
    await prisma.stockPool.delete({ where: { id } });
}
/** Bulk-add: one code/credential per non-blank line, encrypted at rest. */
export async function bulkAddStockCodes(poolId, rawCodes) {
    const pool = await prisma.stockPool.findUnique({ where: { id: poolId } });
    if (!pool)
        throw AppError.notFound("Stock pool not found");
    const lines = rawCodes
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (lines.length === 0)
        throw AppError.badRequest("No codes found — enter one code per line");
    await prisma.stockCode.createMany({
        data: lines.map((line) => ({ poolId, codeCiphertext: encrypt(line) })),
    });
    return { added: lines.length };
}
export async function listStockCodesForAdmin(poolId, page, pageSize) {
    const where = { poolId };
    const [items, total] = await Promise.all([
        prisma.stockCode.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { order: { select: { id: true, userId: true, createdAt: true } } },
        }),
        prisma.stockCode.count({ where }),
    ]);
    return {
        items: items.map((c) => ({
            id: c.id,
            status: c.status,
            // Only ever decrypted for an admin explicitly looking at an
            // already-sold or available code, never logged or bulk-exported.
            code: c.status === "AVAILABLE" ? decrypt(c.codeCiphertext) : null,
            orderId: c.orderId,
            consumedAt: c.consumedAt,
            createdAt: c.createdAt,
        })),
        total,
        page,
        pageSize,
    };
}
/** Revokes one unsold (AVAILABLE) entry — a CONSUMED code is permanent order history and can't be revoked. */
export async function revokeStockCode(id) {
    const code = await prisma.stockCode.findUnique({ where: { id } });
    if (!code)
        throw AppError.notFound("Stock code not found");
    if (code.status !== "AVAILABLE") {
        throw AppError.conflict("Only an unsold (available) code can be revoked");
    }
    await prisma.stockCode.update({ where: { id }, data: { status: "REVOKED" } });
}
