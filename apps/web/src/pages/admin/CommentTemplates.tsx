import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommentTemplate,
  deleteCommentTemplate,
  getCommentTemplates,
  updateCommentTemplate,
  type CommentTemplateRow,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Breadcrumbs, Modal, Pagination } from "../../components/ds/index.js";

const PER_PAGE = 10;

export default function AdminCommentTemplates() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ["comment-templates"], queryFn: getCommentTemplates });

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CommentTemplateRow | "new" | null>(null);
  const [form, setForm] = useState({ text: "", link: "" });
  const [saving, setSaving] = useState(false);

  const rows = templates ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function openNew() {
    setForm({ text: "", link: "" });
    setEditing("new");
  }
  function openEdit(t: CommentTemplateRow) {
    setForm({ text: t.text, link: t.link ?? "" });
    setEditing(t);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { text: form.text.trim(), link: form.link.trim() || null };
      if (editing === "new") {
        await createCommentTemplate(payload);
        toast.push("Comment template added.", "success");
      } else if (editing) {
        await updateCommentTemplate(editing.id, payload);
        toast.push("Comment template updated.", "success");
      }
      queryClient.invalidateQueries({ queryKey: ["comment-templates"] });
      setEditing(null);
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save comment template"), "error");
    } finally {
      setSaving(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCommentTemplate(id),
    onSuccess: () => {
      toast.push("Comment template deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["comment-templates"] });
    },
    onError: (err) => toast.push(apiErrorMessage(err, "Failed to delete"), "error"),
  });

  function onDelete(t: CommentTemplateRow) {
    if (!window.confirm(`Delete this comment template?\n\n"${t.text.slice(0, 120)}"`)) return;
    deleteMutation.mutate(t.id);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Comment" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Comment Templates</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Reusable notices (wrong UID, cancelled &amp; refunded, contact on WhatsApp, delivery-delay apology…) you can
            attach to a customer's order from the Orders page instead of retyping them.
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openNew}>+ Add New</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">No comment templates yet.</td></tr>
            )}
            {pageRows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{t.id.slice(0, 8)}</td>
                <td className="px-4 py-3"><span className="line-clamp-2 whitespace-pre-wrap">{t.text}</span></td>
                <td className="px-4 py-3">
                  {t.link ? (
                    <a href={t.link} target="_blank" rel="noreferrer" className="break-all text-xs text-primary hover:underline">{t.link}</a>
                  ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openEdit(t)}>Edit</button>
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs text-error" onClick={() => onDelete(t)} disabled={deleteMutation.isPending}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} labels={{ prev: "Previous", next: "Next" }} />

      {editing && (
        <Modal
          title={editing === "new" ? "Add comment template" : "Edit comment template"}
          onClose={() => setEditing(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" form="comment-template-form" className="btn-primary" disabled={saving || !form.text.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          }
        >
          <form id="comment-template-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="ct-text">Comment</label>
              <textarea
                id="ct-text"
                className="input-field min-h-[110px]"
                placeholder="e.g. আপনার UID ভুল। চেক করে আবার অর্ডার করুন।"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="ct-link">Comment link <span className="normal-case text-on-surface-variant">(optional)</span></label>
              <input
                id="ct-link"
                type="url"
                className="input-field"
                placeholder="https://wa.me/8801… or a help-article URL"
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
