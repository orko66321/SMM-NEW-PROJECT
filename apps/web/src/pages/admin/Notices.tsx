import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoticeLevel } from "@smm/shared";
import { createAdminNotice, deleteAdminNotice, getAdminNotices, updateAdminNotice } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface Notice {
  id: string;
  message: string;
  level: NoticeLevel;
  active: boolean;
  createdAt: string;
}

const LEVEL_BADGE: Record<NoticeLevel, string> = {
  INFO: "bg-info/15 text-info",
  WARNING: "bg-warning/15 text-warning",
  SUCCESS: "bg-success/15 text-success",
  ERROR: "bg-error/15 text-error",
};

export default function AdminNotices() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: notices } = useQuery({ queryKey: ["admin-notices"], queryFn: getAdminNotices });

  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<NoticeLevel>("INFO");
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
    queryClient.invalidateQueries({ queryKey: ["public-notices"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await createAdminNotice({ message: message.trim(), level, active: true });
      toast.push("Notice created.", "success");
      setMessage("");
      setLevel("INFO");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create notice"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggle(notice: Notice) {
    try {
      await updateAdminNotice(notice.id, { active: !notice.active });
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update notice"), "error");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteAdminNotice(id);
      toast.push("Notice deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete notice"), "error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Announcements &amp; Notices</h1>
      <p className="text-sm text-on-surface-variant">
        Active notices appear as a dismissible banner across the public site, user dashboard, and admin panel.
      </p>

      <form onSubmit={onCreate} className="card space-y-3">
        <h2 className="text-sm font-semibold">New notice</h2>
        <textarea
          className="input-field min-h-20"
          placeholder="e.g. Scheduled maintenance tonight 11PM–1AM BDT"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <select className="input-field" value={level} onChange={(e) => setLevel(e.target.value as NoticeLevel)}>
          <option value="INFO">Info</option>
          <option value="SUCCESS">Success</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
        </select>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creating…" : "Create notice"}
        </button>
      </form>

      <div className="space-y-2">
        {(notices ?? []).map((n: Notice) => (
          <div key={n.id} className="card flex items-start justify-between gap-3">
            <div>
              <span className={`badge ${LEVEL_BADGE[n.level]}`}>{n.level}</span>
              <p className="mt-2 text-sm">{n.message}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onToggle(n)}>
                {n.active ? "Deactivate" : "Activate"}
              </button>
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(n.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {notices?.length === 0 && <p className="text-sm text-on-surface-variant">No notices yet.</p>}
      </div>
    </div>
  );
}
