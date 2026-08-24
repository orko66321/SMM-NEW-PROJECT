import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createUser, resetDb } from "./helpers.js";
import { updateSettings } from "../src/services/settings.service.js";
import { createNotice } from "../src/services/notice.service.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("public routes (Phase 4) — unauthenticated, never leak secrets", () => {
  it("/api/public/settings never includes SMTP credentials, only display-safe fields", async () => {
    await updateSettings({
      siteName: "Test Panel",
      whatsappEnabled: true,
      whatsappNumber: "+8801700000000",
      liveChatProvider: "NONE",
      liveChatWidgetId: null,
      usdToBdtRate: 120,
      defaultCurrency: "USD",
      smtpEnabled: true,
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "bot@example.com",
      smtpPassword: "super-secret-password",
      smtpFromAddress: "noreply@example.com",
    });

    const res = await request(app).get("/api/public/settings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      siteName: "Test Panel",
      whatsappEnabled: true,
      whatsappNumber: "+8801700000000",
      liveChatProvider: "NONE",
      liveChatWidgetId: null,
      usdToBdtRate: "120",
      defaultCurrency: "USD",
    });
    expect(JSON.stringify(res.body)).not.toContain("super-secret-password");
    expect(JSON.stringify(res.body)).not.toContain("smtp");
  });

  it("the admin settings view never re-displays the SMTP password, only whether it's configured", async () => {
    await updateSettings({
      siteName: "Test Panel",
      whatsappEnabled: false,
      liveChatProvider: "NONE",
      usdToBdtRate: 120,
      defaultCurrency: "USD",
      smtpEnabled: true,
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpPassword: "super-secret-password",
    });

    const { getAdminSettings } = await import("../src/services/settings.service.js");
    const admin = await getAdminSettings();
    expect(admin.smtpConfigured).toBe(true);
    expect(JSON.stringify(admin)).not.toContain("super-secret-password");
  });

  it("/api/public/notices only returns active notices", async () => {
    await createNotice({ message: "Active notice", level: "INFO", active: true });
    await createNotice({ message: "Inactive notice", level: "WARNING", active: false });

    const res = await request(app).get("/api/public/notices");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].message).toBe("Active notice");
  });

  it("/api/public/stats returns real counts, requires no auth", async () => {
    await createUser();
    await createUser();

    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(2);
    expect(typeof res.body.totalOrdersCompleted).toBe("number");
  });

  it("/api/public/services and /api/public/categories work without auth (the authenticated /api/services does not)", async () => {
    const authed = await request(app).get("/api/services");
    expect(authed.status).toBe(401);

    const publicServices = await request(app).get("/api/public/services");
    expect(publicServices.status).toBe(200);

    const publicCategories = await request(app).get("/api/public/categories");
    expect(publicCategories.status).toBe(200);
  });
});
