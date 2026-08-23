import { prisma } from "../lib/prisma.js";

export interface AuditLogInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

// Every privileged admin mutation (wallet adjustments, role changes, user
// suspension, service price edits) must go through this so there is always
// an answer to "who changed what, and when" — a hard requirement for a
// panel that moves real money.
export async function writeAuditLog(input: AuditLogInput) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeJson: input.before !== undefined ? JSON.stringify(input.before) : null,
      afterJson: input.after !== undefined ? JSON.stringify(input.after) : null,
      ip: input.ip,
    },
  });
}
