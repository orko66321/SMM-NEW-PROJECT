import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { parseYouTubeId, type PostCategory, type PostInput, type PostStatus } from "@smm/shared";

// Fields safe to send in the public list response — deliberately excludes
// the content/pdf blobs (they'd bloat a list of every published post); the
// detail endpoint returns those.
const PUBLIC_LIST_SELECT = {
  slug: true,
  category: true,
  coverImage: true,
  youtubeVideoId: true,
  pdfName: true,
  titleEn: true,
  titleBn: true,
  publishedAt: true,
} satisfies Prisma.PostSelect;

/** Turn the admin's raw YouTube input into a bare video id, or throw. */
function resolveYouTubeId(youtubeUrl: string | null | undefined): string | null {
  const raw = youtubeUrl?.trim();
  if (!raw) return null;
  const id = parseYouTubeId(raw);
  if (!id) throw AppError.badRequest("Enter a valid YouTube link");
  return id;
}

/** Map the validated input onto the Prisma row shape (youtubeUrl → youtubeVideoId). */
function toRow(input: Partial<PostInput>) {
  const { youtubeUrl, ...rest } = input;
  const data: Prisma.PostUncheckedCreateInput | Prisma.PostUncheckedUpdateInput = { ...rest };
  if (youtubeUrl !== undefined) data.youtubeVideoId = resolveYouTubeId(youtubeUrl);
  return data;
}

export async function listPostsForAdmin(
  page: number,
  pageSize: number,
  category?: PostCategory,
  status?: PostStatus,
) {
  const where: Prisma.PostWhereInput = {
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      // The list table doesn't need the heavy blobs either.
      select: {
        id: true,
        slug: true,
        category: true,
        status: true,
        titleEn: true,
        titleBn: true,
        coverImage: true,
        youtubeVideoId: true,
        pdfName: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.post.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getAdminPost(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw AppError.notFound("Post not found");
  return post;
}

export async function createPost(input: PostInput) {
  const data = toRow(input) as Prisma.PostUncheckedCreateInput;
  if (input.status === "PUBLISHED") data.publishedAt = new Date();
  try {
    return await prisma.post.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.badRequest("A post with this slug already exists");
    }
    throw err;
  }
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Post not found");

  const data = toRow(input) as Prisma.PostUncheckedUpdateInput;
  // Stamp publishedAt the first time a post goes live; leave it alone after.
  if (input.status === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();
  if (input.status === "DRAFT") data.publishedAt = null;

  try {
    return await prisma.post.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.badRequest("A post with this slug already exists");
    }
    throw err;
  }
}

export async function deletePost(id: string): Promise<void> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Post not found");
  await prisma.post.delete({ where: { id } });
}

/** Public — published posts only, newest first, list-card fields + hasPdf. */
export async function listPublishedPostsPublic(category?: PostCategory) {
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED", ...(category ? { category } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: { ...PUBLIC_LIST_SELECT, pdfFile: true },
  });
  return rows.map(({ pdfFile, ...rest }) => ({ ...rest, hasPdf: !!pdfFile }));
}

/** Public — a single published post by slug, including the content/pdf blobs. */
export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") throw AppError.notFound("Post not found");
  return {
    slug: post.slug,
    category: post.category,
    coverImage: post.coverImage,
    youtubeVideoId: post.youtubeVideoId,
    pdfFile: post.pdfFile,
    pdfName: post.pdfName,
    titleEn: post.titleEn,
    titleBn: post.titleBn,
    contentEn: post.contentEn,
    contentBn: post.contentBn,
    publishedAt: post.publishedAt,
  };
}
