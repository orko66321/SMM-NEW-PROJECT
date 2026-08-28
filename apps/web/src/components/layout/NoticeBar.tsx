import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicNotices } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";

interface Notice {
  id: string;
  messageBn: string | null;
  messageEn: string | null;
  level: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}

const LEVEL_STYLES: Record<Notice["level"], string> = {
  INFO: "bg-info/15 text-info border-info/30",
  WARNING: "bg-warning/15 text-warning border-warning/30",
  SUCCESS: "bg-success/15 text-success border-success/30",
  ERROR: "bg-error/15 text-error border-error/30",
};

const DISMISSED_KEY = "smm_dismissed_notices";

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function NoticeBar() {
  const { t, lang } = useLanguage();
  const { data: notices } = useQuery({ queryKey: ["public-notices"], queryFn: getPublicNotices, staleTime: 60_000 });
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const visible = (notices ?? []).filter((n: Notice) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // per-session convenience only — safe to no-op if storage is blocked
    }
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {visible.map((notice: Notice) => (
        <div key={notice.id} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${LEVEL_STYLES[notice.level]}`}>
          <span>{lang === "bn" ? notice.messageBn || notice.messageEn : notice.messageEn || notice.messageBn}</span>
          <button type="button" onClick={() => dismiss(notice.id)} aria-label={t("noticeBar.dismiss")} className="ml-3 shrink-0 opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
