import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// notifyTicketReply (services/notifications.service.ts) fires the real
// Mailjet HTTP call through lib/mailer.ts's sendMail — mock just that one
// export so these tests assert on what was *about to be sent* without an
// outbound network call. `importOriginal` keeps every other mailer export
// (isMailConfigured, htmlToPlainText) real in case anything else in the
// request path touches them.
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../src/lib/mailer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/mailer.js")>();
  return { ...actual, sendMail };
});

import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(async () => {
  await resetDb();
  sendMail.mockClear();
});
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

// Ticket categories are catalog data seeded outside resetDb (same convention
// as tickets.test.ts) — Human Support is the plain free-text category these
// tests need, so a reply doesn't have to satisfy the AI-automation shape.
async function humanCategoryId(): Promise<string> {
  const categories = await prisma.ticketCategory.findMany();
  const human = categories.find((c) => !c.isAutomated);
  if (!human) throw new Error("Human Support category not seeded");
  return human.id;
}

// notifyTicketReply is fired with `void` (fire-and-forget) from
// addAdminMessage so the admin's HTTP response never waits on it — give the
// mocked promise chain a moment to resolve before asserting on it.
async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 20));
}

describe("ticket reply email notification", () => {
  it("sends no email on ticket creation", async () => {
    const user = await createUser();
    const humanId = await humanCategoryId();

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: humanId, message: "My order never started, please help me out here." });

    expect(res.status).toBe(201);
    await flushMicrotasks();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends no email when the user replies to their own ticket", async () => {
    const user = await createUser();
    const humanId = await humanCategoryId();
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: humanId, message: "My order never started, please help me out here." });
    const ticketId = created.body.ticket.id as string;
    sendMail.mockClear();

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ message: "Any update on this yet?" });

    expect(res.status).toBe(201);
    await flushMicrotasks();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("emails the ticket owner when an admin replies, with the reply text, ticket number and a working link — and never blocks the admin's response", async () => {
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const humanId = await humanCategoryId();

    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: humanId, message: "My order never started, please help me out here." });
    const ticketId = created.body.ticket.id as string;
    const subject = created.body.ticket.subject as string;
    sendMail.mockClear();

    const replyText = "We've refunded your wallet for this one — sorry for the trouble!";
    const replyRes = await request(app)
      .post(`/api/admin/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ message: replyText });

    // The admin's reply itself must succeed synchronously regardless of the
    // (mocked, but representative) email dispatch riding along after it.
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.message.body).toBe(replyText);

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));

    const [to, emailSubject, text, html] = sendMail.mock.calls[0] as [string, string, string, string | undefined];
    expect(to).toBe(user.email);
    expect(emailSubject).toBe(`Re: [Ticket #${ticketId}] ${subject}`);
    expect(text).toContain(replyText);
    expect(text).toContain(subject);
    expect(text).toContain(`${env.FRONTEND_BASE_URL}/dashboard/tickets/${ticketId}`);
    expect(html).toContain("refunded your wallet");
    expect(html).toContain(`/dashboard/tickets/${ticketId}`);
  });

  it("does not email on the agent action log messages (refill/cancel/restart) — only on a genuine admin reply", async () => {
    // runAgentAction writes its own ADMIN-role ticket message (the action's
    // result), separate from addAdminMessage — confirms the email hook is
    // scoped to the reply endpoint the task describes, not every ADMIN
    // message write.
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const humanId = await humanCategoryId();
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ categoryId: humanId, message: "My order never started, please help me out here." });
    const ticketId = created.body.ticket.id as string;
    sendMail.mockClear();

    const res = await request(app)
      .post(`/api/admin/tickets/${ticketId}/action`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ action: "close" });

    expect(res.status).toBe(200);
    await flushMicrotasks();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
