import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function extractRefreshCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith("refreshToken="));
  if (!cookie) throw new Error("No refreshToken cookie in response");
  return cookie.split(";")[0]!; // just "refreshToken=<value>", drop attributes
}

function refreshValueFromCookie(cookie: string): string {
  return cookie.slice("refreshToken=".length);
}

async function registerAndLogin(username: string) {
  await request(app)
    .post("/api/auth/register")
    .send({ username, email: `${username}@test.local`, password: "Password123!" });
  const login = await request(app).post("/api/auth/login").send({ identifier: username, password: "Password123!" });
  return { accessToken: login.body.accessToken as string, refreshCookie: extractRefreshCookie(login) };
}

describe("POST /api/auth/refresh — rotation and reuse detection", () => {
  it("a normal refresh issues a new access token and rotates the cookie", async () => {
    const { refreshCookie } = await registerAndLogin("erin");

    const res = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.username).toBe("erin");
    expect(extractRefreshCookie(res)).not.toBe(refreshCookie); // rotated to a new value
  });

  it("replaying a genuinely stale rotated token (past the grace window) is rejected and revokes every session for the account (real theft/replay defense)", async () => {
    const { accessToken, refreshCookie } = await registerAndLogin("frank");

    const first = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(first.status).toBe(200);
    const rotatedCookie = extractRefreshCookie(first);

    // Backdate the rotation past REUSE_GRACE_MS (auth.service.ts) rather
    // than actually sleeping 10+ seconds in the suite — this simulates an
    // attacker replaying a token well after the legitimate rotation, the
    // actual theft/replay shape the grace window is designed to still catch.
    const { hashRefreshToken } = await import("../src/services/token.service.js");
    await prisma.refreshToken.update({
      where: { tokenHash: hashRefreshToken(refreshValueFromCookie(refreshCookie)) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    const replay = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error).toContain("reuse detected");

    // The session the *first* (legitimate) refresh issued is now also
    // revoked — reuse-detection nukes everything, by design, since we
    // can't tell from the server side whether the replay came from an
    // attacker who stole the pre-rotation token.
    const rotatedNowRevoked = await request(app).post("/api/auth/refresh").set("Cookie", rotatedCookie);
    expect(rotatedNowRevoked.status).toBe(401);

    // /me with the original access token still works until it expires
    // (access tokens aren't revoked, only refresh tokens) — not the
    // property under test here, just documenting the boundary.
    expect(accessToken).toBeTruthy();
  });

  it("two concurrent refresh calls with the SAME still-valid token: the loser gets a clean error, not a session-wide revoke — regression test for the 'refreshing the page logs you out' bug", async () => {
    // This is exactly the shape of the bug: the frontend used to fire two
    // independent, non-deduped POST /auth/refresh calls on page load (see
    // apps/web/src/api/client.ts's refreshAuthSession fix), both carrying
    // the same not-yet-rotated cookie. Before this test's corresponding
    // service fix, the loser would land on the `existing.revokedAt` branch
    // (because the winner's rotation had *just* committed) and revoke every
    // session for the account — so the winner's brand-new session would
    // already be dead before the frontend ever got to use it.
    const { refreshCookie } = await registerAndLogin("grace");

    const [a, b] = await Promise.all([
      request(app).post("/api/auth/refresh").set("Cookie", refreshCookie),
      request(app).post("/api/auth/refresh").set("Cookie", refreshCookie),
    ]);

    const results = [a, b];
    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status !== 200);

    // Exactly one side wins the race (gets a real new session)...
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    // ...and the loser gets a plain "already used" — never the nuclear
    // "reuse detected — all sessions revoked" message, since this was two
    // honest requests racing on a token that was still fresh a moment ago,
    // not a genuine replay of an already-completed rotation.
    expect(losers[0]!.body.error).not.toContain("reuse detected");

    // The critical assertion: the winner's new session must actually still
    // be usable afterward — proving the loser's failure didn't collaterally
    // revoke it.
    const winnerCookie = extractRefreshCookie(winners[0]!);
    const followUp = await request(app).post("/api/auth/refresh").set("Cookie", winnerCookie);
    expect(followUp.status).toBe(200);
  });
});
