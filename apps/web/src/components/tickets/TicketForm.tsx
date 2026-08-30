import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTicketCategories } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";

// One form whose visible fields toggle on the Category selection, entirely
// client-side (build spec §2). AI Support (isAutomated) ⇒ Subcategory +
// comma-separated Order IDs, no free text. Human Support ⇒ a Message
// textarea. The category / subcategory lists are DB-driven.

export interface TicketFormValue {
  categoryId: string;
  subcategoryId?: string;
  orderIds?: string;
  message?: string;
}

export function TicketForm({
  onSubmit,
  submitting,
  error,
  submitLabel,
}: {
  onSubmit: (value: TicketFormValue) => void | Promise<void>;
  submitting: boolean;
  error?: string | null;
  submitLabel: string;
}) {
  const { t } = useLanguage();
  const { data: categories } = useQuery({
    queryKey: ["ticket-categories"],
    queryFn: getTicketCategories,
  });

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [orderIds, setOrderIds] = useState("");
  const [message, setMessage] = useState("");

  const category = useMemo(
    () => categories?.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const isAutomated = category?.isAutomated ?? false;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    void onSubmit(
      isAutomated
        ? { categoryId, subcategoryId, orderIds }
        : { categoryId, message },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">{error}</p>
      )}

      <div>
        <label className="label" htmlFor="ticket-category">{t("tickets.categoryLabel")}</label>
        <select
          id="ticket-category"
          className="input-field"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId("");
          }}
          required
        >
          <option value="">{t("tickets.categoryPlaceholder")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isAutomated ? (
        <>
          <div>
            <label className="label" htmlFor="ticket-subcategory">{t("tickets.subcategoryLabel")}</label>
            <select
              id="ticket-subcategory"
              className="input-field"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              required
            >
              <option value="">{t("tickets.subcategoryPlaceholder")}</option>
              {category?.subcategories.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ticket-orderids">{t("tickets.orderIdsLabel")}</label>
            <input
              id="ticket-orderids"
              className="input-field"
              value={orderIds}
              onChange={(e) => setOrderIds(e.target.value)}
              placeholder="10867110,10867210,10867500"
              required
            />
            <p className="mt-1 text-xs text-on-surface-variant">{t("tickets.orderIdsHint")}</p>
          </div>
        </>
      ) : categoryId ? (
        <div>
          <label className="label" htmlFor="ticket-message">{t("tickets.messageLabel")}</label>
          <textarea
            id="ticket-message"
            rows={5}
            className="input-field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting || !categoryId}>
        {submitting ? t("tickets.submitting") : submitLabel}
      </button>
    </form>
  );
}
