import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicNotices } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/Icon.js";

interface Notice {
  id: string;
  messageBn: string | null;
  messageEn: string | null;
  level: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}

const LEVEL: Record<Notice["level"], { cls: string; icon: IconName }> = {
  INFO: { cls: "badge-info", icon: "info" },
  WARNING: { cls: "badge-warning", icon: "warning" },
  SUCCESS: { cls: "badge-success", icon: "check-circle" },
  ERROR: { cls: "badge-error", icon: "error" },
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
      {visible.map((notice: Notice) => {
        const level = LEVEL[notice.level];
        return (
          <div
            key={notice.id}
            className={`flex items-center gap-2.5 rounded-control border px-3 py-2 text-sm ${level.cls}`}
          >
            <Icon name={level.icon} size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {lang === "bn" ? notice.messageBn || notice.messageEn : notice.messageEn || notice.messageBn}
            </span>
            <button
              type="button"
              onClick={() => dismiss(notice.id)}
              aria-label={t("noticeBar.dismiss")}
              className="shrink-0 opacity-70 transition hover:opacity-100"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
