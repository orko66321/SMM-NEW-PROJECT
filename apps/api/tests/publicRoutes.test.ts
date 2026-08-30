import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createUser, resetDb } from "./helpers.js";
import { updateSettings } from "../src/services/settings.service.js";
import { createNotice } from "../src/services/notice.service.js";
import { getAdminSiteNotice, updateSiteNotice } from "../src/services/siteNotice.service.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("public routes (Phase 4) — unauthenticated, never leak secrets", () => {
  it("/api/public/settings never includes SMTP credentials, only display-safe fields", async () => {
    await updateSettings({
      siteName: "Test Panel",
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
    // googleAuthEnabled is intentionally not asserted to a specific value
    // here — it reflects whatever real GOOGLE_CLIENT_ID/SECRET happen to be
    // configured in this environment's .env (an admin may have legitimately
    // set them up), and this test's job is only to prove SMTP secrets never
    // leak. See tests/googleAuth.test.ts and googleAuthDisabled.test.ts for
    // the two deterministic, env-mocked cases of that field itself.
    expect(res.body).toEqual({
      siteName: "Test Panel",
      liveChatProvider: "NONE",
      liveChatWidgetId: null,
      howToOrderVideoUrl: null,
      usdToBdtRate: "120",
      defaultCurrency: "USD",
      googleAuthEnabled: expect.any(Boolean),
    });
    expect(JSON.stringify(res.body)).not.toContain("super-secret-password");
    expect(JSON.stringify(res.body)).not.toContain("smtp");
  });

  it("the admin settings view never re-displays the SMTP password, only whether it's configured", async () => {
    await updateSettings({
      siteName: "Test Panel",
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

  it("/api/public/notices only returns active notices, both language fields intact", async () => {
    await createNotice({ messageEn: "Active notice", messageBn: "সক্রিয় নোটিশ", level: "INFO", active: true });
    await createNotice({ messageEn: "Inactive notice", level: "WARNING", active: false });

    const res = await request(app).get("/api/public/notices");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].messageEn).toBe("Active notice");
    expect(res.body.items[0].messageBn).toBe("সক্রিয় নোটিশ");
  });

  it("a banner notice with only one language filled in is still accepted", async () => {
    const notice = await createNotice({ messageEn: "English only", level: "INFO", active: true });
    expect(notice.messageEn).toBe("English only");
    expect(notice.messageBn).toBeNull();
  });

  it("/api/public/stats returns real counts, requires no auth", async () => {
    await createUser();
    await createUser();

    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(2);
    expect(typeof res.body.totalOrdersCompleted).toBe("number");
  });

  it("/api/public/notice is seeded with the same copy the New Order sidebar always had, in both languages", async () => {
    const res = await request(app).get("/api/public/notice");
    expect(res.status).toBe(200);
    expect(res.body.titleEn).toBe("Important");
    expect(res.body.titleBn).toBe("গুরুত্বপূর্ণ তথ্য");
    expect(res.body.bodyEn).toContain("Please double-check the link and quantity");
    expect(res.body.bodyBn).toContain("লিংক ও কোয়ান্টিটি");
  });

  it("/api/public/notice returns null once an admin turns it off, but admin GET still returns the content for editing", async () => {
    await updateSiteNotice({ titleEn: "Kept", titleBn: null, bodyEn: "Body", bodyBn: null, isActive: false });

    const publicRes = await request(app).get("/api/public/notice");
    expect(publicRes.status).toBe(200);
    expect(publicRes.body).toBeNull();

    const admin = await getAdminSiteNotice();
    expect(admin.isActive).toBe(false);
    expect(admin.titleEn).toBe("Kept");
  });

  it("/api/public/notice falls back to the other language when only one is filled in", async () => {
    await updateSiteNotice({ titleEn: "English only title", titleBn: null, bodyEn: "English only body", bodyBn: null, isActive: true });

    const res = await request(app).get("/api/public/notice");
    expect(res.status).toBe(200);
    expect(res.body.titleEn).toBe("English only title");
    expect(res.body.titleBn).toBeNull();
    // The frontend does the actual fallback (dashboard/NewOrder.tsx) — this
    // just proves the API is honest about what's actually stored per
    // language rather than merging them server-side.
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
