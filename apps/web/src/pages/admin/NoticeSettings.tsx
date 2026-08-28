import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoticeLevel } from "@smm/shared";
import {
  createAdminNotice,
  deleteAdminNotice,
  getAdminNotices,
  getAdminSiteNotice,
  updateAdminNotice,
  updateAdminSiteNotice,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface SiteNotice {
  titleBn: string | null;
  titleEn: string | null;
  bodyBn: string | null;
  bodyEn: string | null;
  isActive: boolean;
}

interface BannerNotice {
  id: string;
  messageBn: string | null;
  messageEn: string | null;
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

// One "Notice Settings" page for every kind of notice in the system, so
// there's exactly one place to look — was previously split across
// /admin/notices (this section) and this page (the New Order box).
function BannerNoticesSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: notices } = useQuery({ queryKey: ["admin-notices"], queryFn: getAdminNotices });

  const [messageBn, setMessageBn] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [level, setLevel] = useState<NoticeLevel>("INFO");
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
    queryClient.invalidateQueries({ queryKey: ["public-notices"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!messageBn.trim() && !messageEn.trim()) return;
    setSubmitting(true);
    try {
      await createAdminNotice({
        messageBn: messageBn.trim() || null,
        messageEn: messageEn.trim() || null,
        level,
        active: true,
      });
      toast.push("Notice created.", "success");
      setMessageBn("");
      setMessageEn("");
      setLevel("INFO");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create notice"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggle(notice: BannerNotice) {
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
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Banner Notices</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Active notices appear as a dismissible banner across the public site, user dashboard, and admin panel.
          Fill in whichever language(s) you want — the banner falls back to the other if one's blank.
        </p>
      </div>

      <form onSubmit={onCreate} className="card space-y-3">
        <h3 className="text-sm font-semibold">New notice</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="notice-bn">Bangla</label>
            <textarea
              id="notice-bn"
              className="input-field min-h-20"
              placeholder="যেমন: আজ রাত ১১টা–১টা পর্যন্ত সার্ভিস বন্ধ থাকবে"
              value={messageBn}
              onChange={(e) => setMessageBn(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="notice-en">English</label>
            <textarea
              id="notice-en"
              className="input-field min-h-20"
              placeholder="e.g. Scheduled maintenance tonight 11PM–1AM BDT"
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
            />
          </div>
        </div>
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
        {(notices ?? []).map((n: BannerNotice) => (
          <div key={n.id} className="card flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`badge ${LEVEL_BADGE[n.level]}`}>{n.level}</span>
              {n.messageBn && <p className="mt-2 text-sm">{n.messageBn}</p>}
              {n.messageEn && <p className={n.messageBn ? "mt-1 text-xs text-on-surface-variant" : "mt-2 text-sm"}>{n.messageEn}</p>}
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
    </section>
  );
}

function ImportantNoticeSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: notice } = useQuery({ queryKey: ["admin-site-notice"], queryFn: getAdminSiteNotice });

  const [form, setForm] = useState({ titleBn: "", titleEn: "", bodyBn: "", bodyEn: "", isActive: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const n = notice as SiteNotice;
    setForm({
      titleBn: n.titleBn ?? "",
      titleEn: n.titleEn ?? "",
      bodyBn: n.bodyBn ?? "",
      bodyEn: n.bodyEn ?? "",
      isActive: n.isActive,
    });
  }, [notice]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateAdminSiteNotice({
        titleBn: form.titleBn || null,
        titleEn: form.titleEn || null,
        bodyBn: form.bodyBn || null,
        bodyEn: form.bodyEn || null,
        isActive: form.isActive,
      });
      toast.push("Notice saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-site-notice"] });
      queryClient.invalidateQueries({ queryKey: ["public-site-notice"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save notice"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Important Notice (New Order sidebar)</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Edits the box shown in the New Order page sidebar. Fill in whichever language(s) you want — if one is
          left blank, the dashboard falls back to the other.
        </p>
      </div>

      <label className="card flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Show notice</p>
          <p className="text-xs text-on-surface-variant">Turn the whole box on/off on the New Order page — content below is kept either way.</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold">Bangla Notice</h3>
          <div>
            <label className="label" htmlFor="titleBn">Title</label>
            <input
              id="titleBn"
              className="input-field"
              value={form.titleBn}
              onChange={(e) => setForm((f) => ({ ...f, titleBn: e.target.value }))}
              placeholder="গুরুত্বপূর্ণ তথ্য"
            />
          </div>
          <div>
            <label className="label" htmlFor="bodyBn">Body</label>
            <textarea
              id="bodyBn"
              rows={8}
              className="input-field"
              value={form.bodyBn}
              onChange={(e) => setForm((f) => ({ ...f, bodyBn: e.target.value }))}
              placeholder="প্রতি লাইন এন্টার দিয়ে আলাদা করুন…"
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="text-sm font-semibold">English Notice</h3>
          <div>
            <label className="label" htmlFor="titleEn">Title</label>
            <input
              id="titleEn"
              className="input-field"
              value={form.titleEn}
              onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
              placeholder="Important Information"
            />
          </div>
          <div>
            <label className="label" htmlFor="bodyEn">Body</label>
            <textarea
              id="bodyEn"
              rows={8}
              className="input-field"
              value={form.bodyEn}
              onChange={(e) => setForm((f) => ({ ...f, bodyEn: e.target.value }))}
              placeholder="One line per rule, separated by Enter…"
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export default function AdminNoticeSettings() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-bold">Notice Settings / নোটিশ সেটিংস</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Every kind of notice on the site, in one place.</p>
      </div>
      <BannerNoticesSection />
      <hr className="border-outline-variant" />
      <ImportantNoticeSection />
    </div>
  );
}
