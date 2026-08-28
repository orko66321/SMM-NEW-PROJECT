import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdminBanner, deleteAdminBanner, getAdminBanners, updateAdminBanner } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface BannerRow {
  id: string;
  link: string;
  image: string;
  order: number;
  createdAt: string;
}

// Matches bannerInputSchema's cap (packages/shared) — ~2.2MB of raw image
// after base64's ~33% overhead. Checked client-side too so a too-large
// file fails fast with a clear message instead of a generic 400 after a
// slow upload.
const MAX_IMAGE_CHARS = 3_000_000;

const emptyForm = { link: "", image: "", order: "0" };

export default function AdminBanner() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data } = useQuery({ queryKey: ["admin-banners", page], queryFn: () => getAdminBanners({ page, pageSize }) });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    queryClient.invalidateQueries({ queryKey: ["public-banners"] });
  }

  function openAddNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(b: BannerRow) {
    setEditingId(b.id);
    setForm({ link: b.link, image: b.image, order: String(b.order) });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_IMAGE_CHARS) {
        toast.push("Image is too large — please use a smaller file (roughly under 2MB).", "error");
        e.target.value = "";
        return;
      }
      setForm((f) => ({ ...f, image: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.image) {
      toast.push("Please choose an image.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const input = { link: form.link.trim(), image: form.image, order: Number(form.order) || 0 };
      if (editingId) {
        await updateAdminBanner(editingId, input);
        toast.push("Banner updated.", "success");
      } else {
        await createAdminBanner(input);
        toast.push("Banner created.", "success");
      }
      closeForm();
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save banner"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(b: BannerRow) {
    if (!window.confirm(`Delete this banner (${b.link})? This can't be undone.`)) return;
    try {
      await deleteAdminBanner(b.id);
      toast.push("Banner deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete banner"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Banner Slider</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Shown at the top of the homepage and the dashboard Overview page.</p>
        </div>
        {!formOpen && (
          <button type="button" className="btn-primary shrink-0" onClick={openAddNew}>
            + Add New
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-4">
          <h2 className="text-sm font-semibold">{editingId ? "Edit banner" : "New banner"}</h2>

          <div>
            <label className="label" htmlFor="link">Link</label>
            <input
              id="link"
              className="input-field"
              placeholder="https://example.com or /services"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              required
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              A path starting with "/" opens in the same tab (in-app); a full URL opens in a new tab.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="image">Image</label>
            <input
              id="image"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="input-field file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
              onChange={onImageChange}
            />
            {form.image && (
              <img src={form.image} alt="Preview" className="mt-3 aspect-[16/7] w-full max-w-md rounded-lg border border-outline-variant object-cover" />
            )}
          </div>

          <div>
            <label className="label" htmlFor="order">Order / Level</label>
            <input
              id="order"
              type="number"
              className="input-field max-w-[160px]"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              required
            />
            <p className="mt-1 text-xs text-on-surface-variant">Lower shows first — can be negative (e.g. -10) to pin ahead of everything else.</p>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Save changes" : "Create banner"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name / Link</th>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((b: BannerRow, i: number) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{(page - 1) * pageSize + i + 1}</td>
                <td className="max-w-[280px] truncate px-4 py-3">{b.link}</td>
                <td className="px-4 py-3">
                  <img src={b.image} alt="" className="h-10 w-16 rounded object-cover" />
                </td>
                <td className="px-4 py-3 font-mono">{b.order}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openEdit(b)}>
                      Edit
                    </button>
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(b)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No banners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-on-surface-variant">Page {page} / {totalPages}</span>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
