import { PrismaClient } from "#prisma/client";
import { env } from "../env.js";

// Single shared client — avoid exhausting the Postgres connection pool by
// re-instantiating PrismaClient per-request or on every dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error", "warn"] : ["error", "warn"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
