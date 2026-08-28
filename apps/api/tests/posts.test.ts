import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { parseYouTubeId } from "@smm/shared";
import { app, createUser, resetDb } from "./helpers.js";
import { createPost, getPublishedPostBySlug, listPublishedPostsPublic } from "../src/services/post.service.js";
import { env } from "../src/env.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("parseYouTubeId", () => {
  it("extracts the id from every URL form, ignoring extra params", () => {
    const cases: [string, string][] = [
      ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://youtu.be/dQw4w9WgXcQ?t=30s", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ['<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>', "dQw4w9WgXcQ"],
      ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ];
    for (const [input, expected] of cases) {
      expect(parseYouTubeId(input)).toBe(expected);
    }
  });

  it("returns null for non-YouTube or malformed links", () => {
    expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTubeId("https://example.com/watch?v=short")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});

describe("documentation / blog posts", () => {
  it("public list shows only published posts and hides the content/pdf blobs", async () => {
    await createPost({
      slug: "draft-guide",
      category: "DOCUMENTATION",
      status: "DRAFT",
      titleEn: "Draft guide",
      contentEn: "secret",
    });
    await createPost({
      slug: "live-guide",
      category: "DOCUMENTATION",
      status: "PUBLISHED",
      titleEn: "Live guide",
      contentEn: "# Hello",
      pdfFile: "data:application/pdf;base64,JVBERi0=",
    });

    const list = await listPublishedPostsPublic();
    expect(list.map((p) => p.slug)).toEqual(["live-guide"]);
    expect(list[0]).not.toHaveProperty("contentEn");
    expect(list[0]).not.toHaveProperty("pdfFile");
    expect(list[0]!.hasPdf).toBe(true);

    await expect(getPublishedPostBySlug("draft-guide")).rejects.toThrow(/not found/i);
    const detail = await getPublishedPostBySlug("live-guide");
    expect(detail.contentEn).toBe("# Hello");
  });

  it("rejects an invalid YouTube link on create", async () => {
    await expect(
      createPost({ slug: "bad-video", status: "DRAFT", titleEn: "x", youtubeUrl: "https://example.com/x" }),
    ).rejects.toThrow(/valid youtube/i);
  });

  it("admin CRUD round-trip; publishing stamps publishedAt and category filter works on the public list", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin.id);

    const createRes = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        slug: "how-to-order",
        category: "UPDATE",
        status: "PUBLISHED",
        titleEn: "How to order",
        titleBn: "কীভাবে অর্ডার করবেন",
        contentEn: "## Steps\n\n- one\n- two",
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.post.youtubeVideoId).toBe("dQw4w9WgXcQ");
    expect(createRes.body.post.publishedAt).not.toBeNull();
    const id = createRes.body.post.id;

    const dupe = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "how-to-order", status: "DRAFT", titleEn: "dupe" });
    expect(dupe.status).toBe(400);

    const publicAll = await request(app).get("/api/public/posts");
    expect(publicAll.body.items.map((p: { slug: string }) => p.slug)).toEqual(["how-to-order"]);
    const publicBlog = await request(app).get("/api/public/posts?category=BLOG");
    expect(publicBlog.body.items).toEqual([]);

    const del = await request(app).delete(`/api/admin/posts/${id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
    const after = await request(app).get("/api/public/posts");
    expect(after.body.items).toEqual([]);
  });
});
