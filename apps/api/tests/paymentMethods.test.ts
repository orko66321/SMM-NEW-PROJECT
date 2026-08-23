import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createPaymentMethod, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("dynamic payment methods (Phase 3 admin CRUD)", () => {
  it("an admin can create, list, update, and the public list only shows ACTIVE methods", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const adminToken = tokenFor(admin.id);

    const create = await request(app)
      .post("/api/admin/payment-methods")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "bKash Personal #1",
        gatewayType: "MANUAL",
        accountType: "PERSONAL",
        accountNumber: "01700000000",
        instructions: "Send money here",
        minAmount: 1,
        maxAmount: 500,
        bonusPercent: 5,
      });
    expect(create.status).toBe(201);
    const methodId = create.body.method.id;

    const user = await createUser({ role: "USER" });
    const publicList = await request(app).get("/api/payment-methods").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(publicList.status).toBe(200);
    expect(publicList.body.items).toHaveLength(1);
    expect(publicList.body.items[0].title).toBe("bKash Personal #1");

    const disable = await request(app)
      .put(`/api/admin/payment-methods/${methodId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "DISABLED" });
    expect(disable.status).toBe(200);

    const publicListAfterDisable = await request(app).get("/api/payment-methods").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(publicListAfterDisable.body.items).toHaveLength(0);

    const adminList = await request(app).get("/api/admin/payment-methods").set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.body.items).toHaveLength(1); // admin still sees disabled methods
  });

  it("rejects an AUTOMATED method with no gatewayProvider", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .post("/api/admin/payment-methods")
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ title: "Auto pay", gatewayType: "AUTOMATED" });
    expect(res.status).toBe(400);
  });

  it("deletes a method with no deposit history, but blocks deletion once it has history", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const adminToken = tokenFor(admin.id);
    const method = await createPaymentMethod({ title: "Nagad Agent" });

    const deleted = await request(app).delete(`/api/admin/payment-methods/${method.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);

    const method2 = await createPaymentMethod({ title: "Rocket" });
    const user = await createUser({ balance: 100 });
    await prisma.deposit.create({
      data: { userId: user.id, method: method2.title, amount: 10, paymentMethodId: method2.id, trxId: "TXN-block-1", senderNumber: "01711111111" },
    });

    const blocked = await request(app).delete(`/api/admin/payment-methods/${method2.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(blocked.status).toBe(409);

    // Disabling instead of deleting still works.
    const disabled = await request(app)
      .put(`/api/admin/payment-methods/${method2.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "DISABLED" });
    expect(disabled.status).toBe(200);
  });
});
