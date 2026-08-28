import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSiteNotice, updateAdminSiteNotice } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface SiteNotice {
  titleBn: string | null;
  titleEn: string | null;
  bodyBn: string | null;
  bodyEn: string | null;
  isActive: boolean;
}

export default function AdminNoticeSettings() {
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
      // Dashboard's New Order sidebar reads this via a separate public
      // query key — invalidate it too so a save shows up immediately
      // without the user having to reload.
      queryClient.invalidateQueries({ queryKey: ["public-site-notice"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save notice"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSave} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Notice Settings / নোটিশ সেটিংস</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Edits the "Important Notice" box shown in the New Order page sidebar. Fill in whichever language(s) you
          want — if one is left blank, the dashboard falls back to the other.
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
          <h2 className="text-sm font-semibold">Bangla Notice</h2>
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
          <h2 className="text-sm font-semibold">English Notice</h2>
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
