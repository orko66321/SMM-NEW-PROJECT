import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PostCategoryValues,
  PostStatusValues,
  parseYouTubeId,
  type PostCategory,
  type PostInput,
  type PostStatus,
} from "@smm/shared";
import {
  createAdminPost,
  deleteAdminPost,
  getAdminPost,
  getAdminPosts,
  updateAdminPost,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import MarkdownEditor from "../../components/ui/MarkdownEditor.js";
import YouTubeEmbed from "../../components/ui/YouTubeEmbed.js";

interface PostRow {
  id: string;
  slug: string;
  category: PostCategory;
  status: PostStatus;
  titleEn: string | null;
  titleBn: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const MAX_IMAGE_CHARS = 3_000_000;
const MAX_PDF_CHARS = 15_000_000;

type FormState = {
  slug: string;
  category: PostCategory;
  status: PostStatus;
  coverImage: string;
  youtubeUrl: string;
  pdfFile: string;
  pdfName: string;
  titleEn: string;
  titleBn: string;
  contentEn: string;
  contentBn: string;
};

const emptyForm: FormState = {
  slug: "",
  category: "BLOG",
  status: "DRAFT",
  coverImage: "",
  youtubeUrl: "",
  pdfFile: "",
  pdfName: "",
  titleEn: "",
  titleBn: "",
  contentEn: "",
  contentBn: "",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export default function AdminPosts() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const coverRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({ queryKey: ["admin-posts"], queryFn: () => getAdminPosts({ pageSize: 100 }) });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    queryClient.invalidateQueries({ queryKey: ["public-posts"] });
    queryClient.invalidateQueries({ queryKey: ["public-post"] });
  }

  function openAddNew() {
    setEditingId(null);
    setSlugTouched(false);
    setForm(emptyForm);
    setFormOpen(true);
  }

  async function openEdit(row: PostRow) {
    try {
      const full = await getAdminPost(row.id);
      setEditingId(row.id);
      setSlugTouched(true);
      setForm({
        slug: full.slug,
        category: full.category,
        status: full.status,
        coverImage: full.coverImage ?? "",
        youtubeUrl: full.youtubeVideoId ? `https://youtu.be/${full.youtubeVideoId}` : "",
        pdfFile: full.pdfFile ?? "",
        pdfName: full.pdfName ?? "",
        titleEn: full.titleEn ?? "",
        titleBn: full.titleBn ?? "",
        contentEn: full.contentEn ?? "",
        contentBn: full.contentBn ?? "",
      });
      setFormOpen(true);
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to load post"), "error");
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    if (coverRef.current) coverRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
  }

  function setTitle(which: "titleEn" | "titleBn", value: string) {
    setForm((f) => {
      const next = { ...f, [which]: value };
      if (!slugTouched && !editingId) next.slug = slugify(value || f.titleEn || f.titleBn);
      return next;
    });
  }

  function onCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_IMAGE_CHARS) {
        toast.push("Cover image is too large — use a file under ~2MB.", "error");
        e.target.value = "";
        return;
      }
      setForm((f) => ({ ...f, coverImage: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function onPdfChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.push("Please choose a PDF file.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_PDF_CHARS) {
        toast.push("PDF is too large — use a file under ~10MB.", "error");
        e.target.value = "";
        return;
      }
      setForm((f) => ({ ...f, pdfFile: dataUrl, pdfName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  function removePdf() {
    setForm((f) => ({ ...f, pdfFile: "", pdfName: "" }));
    if (pdfRef.current) pdfRef.current.value = "";
  }

  const youtubePreviewId = form.youtubeUrl.trim() ? parseYouTubeId(form.youtubeUrl) : null;
  const youtubeInvalid = !!form.youtubeUrl.trim() && !youtubePreviewId;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.titleEn.trim() && !form.titleBn.trim()) {
      toast.push("Add a title in at least one language.", "error");
      return;
    }
    if (youtubeInvalid) {
      toast.push("The YouTube link isn't valid.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const input: PostInput = {
        slug: form.slug.trim() || slugify(form.titleEn || form.titleBn),
        category: form.category,
        status: form.status,
        coverImage: form.coverImage || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        pdfFile: form.pdfFile || null,
        pdfName: form.pdfName || null,
        titleEn: form.titleEn.trim() || null,
        titleBn: form.titleBn.trim() || null,
        contentEn: form.contentEn.trim() || null,
        contentBn: form.contentBn.trim() || null,
      };
      if (editingId) {
        await updateAdminPost(editingId, input);
        toast.push("Post saved.", "success");
      } else {
        await createAdminPost(input);
        toast.push("Post created.", "success");
      }
      closeForm();
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save post"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(row: PostRow) {
    if (!window.confirm(`Delete "${row.titleEn || row.titleBn || row.slug}"? This can't be undone.`)) return;
    try {
      await deleteAdminPost(row.id);
      toast.push("Post deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete post"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Documentation / Blog</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Guides, product updates and announcements shown publicly at <code>/docs</code> (readable by guests).
          </p>
        </div>
        {!formOpen && (
          <button type="button" className="btn-primary shrink-0" onClick={openAddNew}>+ New Post</button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-5">
          <h2 className="text-sm font-semibold">{editingId ? "Edit post" : "New post"}</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select
                id="category"
                className="input-field"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as PostCategory }))}
              >
                {PostCategoryValues.map((c) => (
                  <option key={c} value={c}>{c[0] + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select
                id="status"
                className="input-field"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))}
              >
                {PostStatusValues.map((s) => (
                  <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="slug">Slug (URL)</label>
              <input
                id="slug"
                className="input-field"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="how-to-place-an-order"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="cover">Cover image (optional)</label>
            <input
              id="cover"
              ref={coverRef}
              type="file"
              accept="image/*"
              className="input-field file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
              onChange={onCoverChange}
            />
            {form.coverImage && (
              <img src={form.coverImage} alt="" className="mt-3 aspect-[16/9] w-full max-w-md rounded-lg border border-outline-variant object-cover" />
            )}
          </div>

          <div>
            <label className="label" htmlFor="youtube">YouTube video link (optional)</label>
            <input
              id="youtube"
              className={`input-field ${youtubeInvalid ? "border-error focus:border-error focus:ring-error/40" : ""}`}
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              placeholder="https://youtu.be/VIDEO_ID  ·  https://www.youtube.com/watch?v=VIDEO_ID  ·  <iframe …>"
            />
            {youtubeInvalid && <p className="mt-1 text-xs text-error">That doesn't look like a YouTube link.</p>}
            {youtubePreviewId && (
              <div className="mt-3 max-w-md">
                <YouTubeEmbed videoId={youtubePreviewId} />
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="pdf">PDF attachment (optional)</label>
            <input
              id="pdf"
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="input-field file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
              onChange={onPdfChange}
            />
            {form.pdfFile && (
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span>📄 {form.pdfName || "document.pdf"} · {(form.pdfFile.length / 1_000_000).toFixed(1)}MB</span>
                <button type="button" className="text-xs text-error underline" onClick={removePdf}>Remove</button>
              </div>
            )}
            <p className="mt-1 text-xs text-on-surface-variant">
              Uploaded PDFs are shown inline on the post page as documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">English</h3>
              <div>
                <label className="label" htmlFor="titleEn">Title</label>
                <input
                  id="titleEn"
                  className="input-field"
                  value={form.titleEn}
                  onChange={(e) => setTitle("titleEn", e.target.value)}
                  placeholder="How to place an order"
                />
              </div>
              <div>
                <label className="label">Body (Markdown)</label>
                <MarkdownEditor
                  value={form.contentEn}
                  onChange={(v) => setForm((f) => ({ ...f, contentEn: v }))}
                  placeholder="## Heading&#10;&#10;Write the guide here…"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">বাংলা</h3>
              <div>
                <label className="label" htmlFor="titleBn">Title</label>
                <input
                  id="titleBn"
                  className="input-field"
                  value={form.titleBn}
                  onChange={(e) => setTitle("titleBn", e.target.value)}
                  placeholder="কীভাবে অর্ডার করবেন"
                />
              </div>
              <div>
                <label className="label">Body (Markdown)</label>
                <MarkdownEditor
                  value={form.contentBn}
                  onChange={(v) => setForm((f) => ({ ...f, contentBn: v }))}
                  placeholder="## শিরোনাম&#10;&#10;এখানে গাইড লিখুন…"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Save changes" : "Create post"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {(data?.items ?? []).map((row: PostRow) => (
              <tr key={row.id}>
                <td className="max-w-[280px] px-4 py-3">
                  <p className="truncate font-medium text-on-surface">{row.titleEn || row.titleBn || "(untitled)"}</p>
                  <p className="truncate text-xs text-on-surface-variant">/{row.slug}</p>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{row.category[0] + row.category.slice(1).toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${row.status === "PUBLISHED" ? "bg-success/15 text-success" : "bg-outline-variant/30 text-on-surface-variant"}`}>
                    {row.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                  {new Date(row.publishedAt ?? row.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(row)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No posts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
