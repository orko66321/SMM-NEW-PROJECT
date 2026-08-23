import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { getWalletForUser } from "../src/services/wallet.service.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("order placement — price integrity & idempotency", () => {
  it("ignores a client-supplied price and always recalculates server-side", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ sellPricePer1000: 10, minQuantity: 100, maxQuantity: 10_000 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "key-1")
      .send({
        serviceId: service.id,
        link: "https://instagram.com/someone",
        quantity: 1000,
        // Attempted price tampering — createOrderSchema has no price field, so this is dropped.
        charge: 0.01,
        price: 0.01,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.charge).toBe("10"); // 10 sellPricePer1000 * 1000 / 1000, NOT the tampered 0.01

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("90");
  });

  it("rejects quantity outside the service's min/max", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ minQuantity: 100, maxQuantity: 1000 });

    const tooLow = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "key-low")
      .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 10 });
    expect(tooLow.status).toBe(400);

    const tooHigh = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "key-high")
      .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 5000 });
    expect(tooHigh.status).toBe(400);
  });

  it("requires an Idempotency-Key header", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService();
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 100 });
    expect(res.status).toBe(400);
  });

  it("replaying the same Idempotency-Key returns the original order and never double-charges", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ sellPricePer1000: 10 });
    const payload = { serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 };

    const first = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "same-key")
      .send(payload);
    const second = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "same-key")
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.order.id).toBe(first.body.order.id);

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("90"); // charged exactly once
  });

  it("rejects insufficient balance and does not create an order", async () => {
    const user = await createUser({ balance: 5 });
    const { service } = await createCategoryAndService({ sellPricePer1000: 10 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "key-poor")
      .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 });

    expect(res.status).toBe(400);
    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("5");
  });
});
