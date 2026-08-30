import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createProvider, createUser, resetDb } from "./helpers.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function categoryIds() {
  const cats = await prisma.ticketCategory.findMany({ include: { subcategories: true } });
  const ai = cats.find((c) => c.isAutomated)!;
  const human = cats.find((c) => !c.isAutomated)!;
  return {
    aiId: ai.id,
    humanId: human.id,
    sub: (key: string) => ai.subcategories.find((s) => s.actionKey === key)!.id,
  };
}

describe("support tickets — AI + Human", () => {
  it("exposes the DB-driven category / subcategory catalog", async () => {
    const user = await createUser();
    const res = await request(app)
      .get("/api/tickets/categories")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(res.status).toBe(200);
    const names = res.body.categories.map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(["AI Support", "Human Support"]);
    const ai = res.body.categories.find((c: { isAutomated: boolean }) => c.isAutomated);
    expect(ai.subcategories.length).toBeGreaterThanOrEqual(5);
  });

  it("creates a Human Support ticket straight to the admin queue", async () => {
    const user = await createUser();
    const { humanId } = await categoryIds();
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: humanId, message: "My order never started, please help me out here." });
    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("PENDING_ADMIN");
    expect(res.body.ticket.subject).toContain("My order never started");
    expect(res.body.ticket.messages).toHaveLength(1);
  });

  it("rejects an AI Support ticket referencing an order that isn't the user's (IDOR)", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await prisma.order.create({
      data: {
        userId: owner.id,
        serviceId: service.id,
        link: "https://x.com/a",
        quantity: 100,
        charge: 1,
        providerCost: 0.5,
        status: "COMPLETED",
      },
    });
    const { aiId, sub } = await categoryIds();

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(stranger.id)}`)
      .send({ categoryId: aiId, subcategoryId: sub("REFILL"), orderIds: order.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(order.id);
    expect(await prisma.ticket.count()).toBe(0);
  });

  it("AI Support 'Refill' on an AUTO order submits action=refill and auto-resolves", async () => {
    const mock = await startMockProvider({ refill: () => ({ refill: "refill-1" }) });
    try {
      const user = await createUser();
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ refillEnabled: true, providerId: provider.id });
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link: "https://x.com/a",
          quantity: 1000,
          charge: 10,
          providerCost: 5,
          status: "COMPLETED",
          mode: "AUTO",
          providerOrderId: "p-1",
        },
      });
      const { aiId, sub } = await categoryIds();

      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ categoryId: aiId, subcategoryId: sub("REFILL"), orderIds: order.id });

      expect(res.status).toBe(201);
      expect(res.body.ticket.status).toBe("RESOLVED");
      const system = res.body.ticket.messages.find((m: { senderRole: string }) => m.senderRole === "SYSTEM");
      expect(system).toBeTruthy();
      expect(await prisma.refillRequest.count({ where: { orderId: order.id } })).toBe(1);
      const actions = await prisma.ticketOrderAction.findMany();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.result).toBe("SUCCESS");
    } finally {
      await mock.close();
    }
  });

  it("AI Support 'Cancel' on an eligible AUTO order refunds the wallet and auto-resolves", async () => {
    const mock = await startMockProvider({ cancel: () => ({ cancel: 1 }) });
    try {
      const user = await createUser({ balance: 0 });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ providerId: provider.id });
      await prisma.service.update({ where: { id: service.id }, data: { cancelEnabled: true } });
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link: "https://x.com/a",
          quantity: 1000,
          charge: 10,
          providerCost: 5,
          status: "IN_PROGRESS",
          mode: "AUTO",
          providerOrderId: "p-2",
        },
      });
      const { aiId, sub } = await categoryIds();

      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ categoryId: aiId, subcategoryId: sub("CANCEL"), orderIds: order.id });

      expect(res.status).toBe(201);
      expect(res.body.ticket.status).toBe("RESOLVED");
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
      expect(wallet.balance.toString()).toBe("10");
      const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updatedOrder.status).toBe("CANCELED");
    } finally {
      await mock.close();
    }
  });

  it("AI Support 'Fake complete' escalates to the human queue", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService();
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        link: "https://x.com/a",
        quantity: 100,
        charge: 1,
        providerCost: 0.5,
        status: "COMPLETED",
      },
    });
    const { aiId, sub } = await categoryIds();

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: aiId, subcategoryId: sub("FAKE_COMPLETE"), orderIds: order.id });

    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("ESCALATED");
  });

  it("an admin agent can run the same Cancel action from the ticket view", async () => {
    const mock = await startMockProvider({ cancel: () => ({ cancel: 1 }) });
    try {
      const user = await createUser({ balance: 0 });
      const admin = await createUser({ role: "ADMIN" });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ providerId: provider.id });
      await prisma.service.update({ where: { id: service.id }, data: { cancelEnabled: true } });
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link: "https://x.com/a",
          quantity: 1000,
          charge: 10,
          providerCost: 5,
          status: "PENDING",
          mode: "AUTO",
          providerOrderId: "p-3",
        },
      });
      const { humanId } = await categoryIds();
      const created = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ categoryId: humanId, message: "please cancel my order" });
      const ticketId = created.body.ticket.id;
      // link the order to the ticket so the agent action is allowed
      await prisma.ticket.update({ where: { id: ticketId }, data: { orderIds: [order.id] } });

      const res = await request(app)
        .post(`/api/admin/tickets/${ticketId}/action`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
        .send({ action: "cancel", orderId: order.id });

      expect(res.status).toBe(200);
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
      expect(wallet.balance.toString()).toBe("10");
    } finally {
      await mock.close();
    }
  });
});
