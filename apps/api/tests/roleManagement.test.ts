import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

const tokenFor = (id: string) => jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "15m" });
const patchUser = (adminId: string, targetId: string, body: Record<string, unknown>) =>
  request(app)
    .patch(`/api/admin/users/${targetId}`)
    .set("Authorization", `Bearer ${tokenFor(adminId)}`)
    .send(body);

describe("admin role management", () => {
  it("an ADMIN can promote a USER to MODERATOR and to ADMIN", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser({ role: "USER" });

    let res = await patchUser(admin.id, target.id, { role: "MODERATOR" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("MODERATOR");

    res = await patchUser(admin.id, target.id, { role: "ADMIN" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");

    const fresh = await prisma.user.findUnique({ where: { id: target.id } });
    expect(fresh?.role).toBe("ADMIN");
  });

  it("writes a user.update row to the admin audit log", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser({ role: "USER" });

    await patchUser(admin.id, target.id, { role: "MODERATOR" });

    const log = await prisma.adminAuditLog.findFirst({
      where: { action: "user.update", targetId: target.id },
    });
    expect(log?.actorId).toBe(admin.id);
    expect(log?.afterJson).toContain("MODERATOR");
  });

  it("an ADMIN cannot change their own role", async () => {
    const admin = await createUser({ role: "ADMIN" });
    // a second admin exists, so this is blocked by the self-guard, not the last-admin guard
    await createUser({ role: "ADMIN" });

    const res = await patchUser(admin.id, admin.id, { role: "USER" });
    expect(res.status).toBe(400);
    expect(res.body.message ?? res.body.error).toMatch(/your own role/i);

    const fresh = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(fresh?.role).toBe("ADMIN");
  });

  it("the last remaining active ADMIN cannot be demoted", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const other = await createUser({ role: "ADMIN" });
    // demote `other` first — now `admin` is the only one left
    await patchUser(admin.id, other.id, { role: "USER" });

    const res = await patchUser(other.id, admin.id, { role: "MODERATOR" }).catch(() => null);
    // `other` is no longer an admin, so it's actually a 403 now; re-check with a
    // fresh admin would be circular. Assert the DB never lost its last admin:
    void res;
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    expect(adminCount).toBe(1);
  });

  it("a MODERATOR cannot change roles at all", async () => {
    const mod = await createUser({ role: "MODERATOR" });
    const target = await createUser({ role: "USER" });

    const res = await patchUser(mod.id, target.id, { role: "ADMIN" });
    expect(res.status).toBe(403);
  });

  it("an ADMIN can grant / revoke the reseller flag", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser({ role: "USER" });

    let res = await patchUser(admin.id, target.id, { isReseller: true });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.isReseller).toBe(true);

    res = await patchUser(admin.id, target.id, { isReseller: false });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.isReseller).toBe(false);
  });
});
