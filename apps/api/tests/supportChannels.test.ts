import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers.js";
import {
  listPublicSupportChannels,
  listSupportChannelsForAdmin,
  updateSupportChannel,
} from "../src/services/supportChannel.service.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("support channels — floating Help widget", () => {
  it("seeds the full set of channel types on first admin read", async () => {
    const rows = await listSupportChannelsForAdmin();
    expect(rows.map((r) => r.type).sort()).toEqual(
      ["CUSTOM", "MESSENGER", "TELEGRAM", "TICKET", "WHATSAPP"],
    );
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("only enabled channels reach the public endpoint, with the href built server-side", async () => {
    await updateSupportChannel("WHATSAPP", { enabled: true, value: "+880 1700-000000", sortOrder: 0 });
    await updateSupportChannel("TELEGRAM", { enabled: true, value: "@mypanel", sortOrder: 1 });
    await updateSupportChannel("MESSENGER", { enabled: false, value: "mypage", sortOrder: 2 });

    const res = await request(app).get("/api/public/support-channels");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { type: "WHATSAPP", label: "WhatsApp", href: "https://wa.me/8801700000000", external: true },
      { type: "TELEGRAM", label: "Telegram", href: "https://t.me/mypanel", external: true },
    ]);
    // The disabled channel leaks nothing at all — not even its stored value.
    expect(JSON.stringify(res.body)).not.toContain("mypage");
  });

  it("rejects enabling a non-ticket channel with no / invalid value", async () => {
    await expect(updateSupportChannel("WHATSAPP", { enabled: true, value: "", sortOrder: 0 })).rejects.toThrow();
    await expect(updateSupportChannel("CUSTOM", { enabled: true, value: "not-a-url", sortOrder: 0 })).rejects.toThrow();
    await expect(
      updateSupportChannel("CUSTOM", { enabled: true, value: "https://example.com", label: null, sortOrder: 0 }),
    ).rejects.toThrow(/label/i);
  });

  it("TICKET can be enabled without a value and surfaces with a null href", async () => {
    await updateSupportChannel("TICKET", { enabled: true, sortOrder: 9 });
    const items = await listPublicSupportChannels();
    expect(items).toContainEqual({
      type: "TICKET",
      label: "Open a support ticket",
      href: null,
      external: false,
    });
  });

  it("the public endpoint needs no auth", async () => {
    const res = await request(app).get("/api/public/support-channels");
    expect(res.status).toBe(200);
  });
});
