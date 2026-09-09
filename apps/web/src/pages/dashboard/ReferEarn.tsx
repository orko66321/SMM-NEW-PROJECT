import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyReferral, getPublicSettings } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { Badge, EmptyState, Icon, StatCard, type IconName } from "../../components/ds/index.js";

type ReferralStatus = "COMPLETED" | "FAILED";

// ── Social share targets ────────────────────────────────────────────────
// Brand glyphs are inline (the design-system Icon set has no social marks).
// Each opens the platform's public share intent in a new tab with the
// referral link + a short pitch pre-filled.
interface Social {
  key: string;
  labelKey: string;
  className: string;
  glyph: ReactNode;
  href: (link: string, text: string) => string;
}

const SOCIALS: Social[] = [
  {
    key: "whatsapp",
    labelKey: "referEarn.shareWhatsapp",
    className: "hover:border-[#25D366]/50 hover:text-[#25D366]",
    glyph: (
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-2.9 4.42c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.72s.74 2 .84 2.14c.1.14 1.44 2.28 3.56 3.11 1.76.7 2.12.56 2.5.52.38-.03 1.24-.5 1.42-.99.17-.49.17-.9.12-.99-.05-.09-.19-.14-.4-.24-.21-.11-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.1-.14.21-.54.68-.66.82-.12.14-.24.16-.45.05-.21-.1-.88-.32-1.68-1.03-.62-.55-1.04-1.24-1.16-1.44-.12-.21-.01-.32.09-.42.09-.09.21-.24.31-.36.1-.12.14-.21.21-.35.07-.14.03-.26-.02-.36-.05-.1-.46-1.13-.64-1.55-.17-.4-.34-.35-.47-.35Z" />
    ),
    href: (link, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
  },
  {
    key: "facebook",
    labelKey: "referEarn.shareFacebook",
    className: "hover:border-[#1877F2]/50 hover:text-[#1877F2]",
    glyph: (
      <path d="M13.5 21v-8.2h2.76l.41-3.2H13.5V7.55c0-.93.26-1.56 1.59-1.56h1.7V3.13c-.3-.04-1.3-.13-2.48-.13-2.45 0-4.13 1.5-4.13 4.24v2.36H7.4v3.2h2.27V21h3.83Z" />
    ),
    href: (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    key: "twitter",
    labelKey: "referEarn.shareTwitter",
    className: "hover:border-on-surface/40 hover:text-on-surface",
    glyph: (
      <path d="M17.53 3H20.5l-6.49 7.42L21.75 21h-6l-4.7-6.15L5.68 21H2.7l6.95-7.94L2.25 3h6.15l4.25 5.62L17.53 3Zm-1.05 16.2h1.65L7.6 4.7H5.83l10.65 14.5Z" />
    ),
    href: (link, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
  },
  {
    key: "telegram",
    labelKey: "referEarn.shareTelegram",
    className: "hover:border-[#229ED9]/50 hover:text-[#229ED9]",
    glyph: (
      <path d="M21.94 4.68c.28-1.17-.86-2.1-1.94-1.66L2.9 9.77c-1.2.48-1.14 2.22.08 2.62l4.3 1.4 1.63 5.02c.2.63.98.83 1.46.37l2.4-2.29 4.28 3.15c.66.48 1.6.12 1.78-.68l3.11-14.08Zm-3.03.66-2.9 13.14-4.05-2.98a1 1 0 0 0-1.28.1l-1.1 1.05.72-3.24 7.35-6.7c.36-.33-.06-.86-.47-.6l-9.06 5.7-3.06-1L18.9 5.34Z" />
    ),
    href: (link, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
  },
];

const STEPS: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: "send", titleKey: "referEarn.step1Title", bodyKey: "referEarn.step1Body" },
  { icon: "users", titleKey: "referEarn.step2Title", bodyKey: "referEarn.step2Body" },
  { icon: "wallet", titleKey: "referEarn.step3Title", bodyKey: "referEarn.step3Body" },
];

export default function ReferEarn() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [copied, setCopied] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  const { data, isLoading } = useQuery({ queryKey: ["referral-me"], queryFn: getMyReferral, enabled: !!user });

  const history = useMemo(() => data?.history ?? [], [data]);

  const stats = useMemo(() => {
    const invited = data?.invitedCount ?? 0;
    const completed = history.filter((h) => h.status === "COMPLETED").length;
    const pending = Math.max(0, invited - history.length);
    const conversion = invited > 0 ? Math.round((completed / invited) * 100) : 0;
    return { invited, pending, conversion };
  }, [data, history]);

  if (!user) return <GuestLockedCard title={t("referEarn.title")} body={t("referEarn.guestBody")} />;

  const code = data?.referralCode ?? user.referralCode;
  const link = `${window.location.origin}/register?ref=${code}`;
  const referralEnabled = settings?.referralSystemEnabled ?? false;
  const shareText = t("referEarn.shareMessage");

  const subtitle =
    referralEnabled && settings
      ? settings.referrerRewardType === "FIXED"
        ? t("referEarn.howItWorksFixed", {
            reward: formatCurrency(settings.referrerRewardValue),
            bonus: settings.refereeBonusPercent,
          })
        : t("referEarn.howItWorksPercent", {
            reward: settings.referrerRewardValue,
            bonus: settings.refereeBonusPercent,
          })
      : t("referEarn.subtitleGeneric");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  function statusBadge(status: ReferralStatus) {
    return status === "COMPLETED" ? (
      <Badge tone="success">{t("referEarn.statusCompleted")}</Badge>
    ) : (
      <Badge tone="error">{t("referEarn.statusFailed")}</Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header>
        <h1 className="text-xl font-bold sm:text-2xl">{t("referEarn.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{subtitle}</p>
      </header>

      {!referralEnabled && (
        <div className="rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-on-surface">
          {t("referEarn.disabledNote")}
        </div>
      )}

      {/* ── Top stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("referEarn.totalInvited")} value={String(stats.invited)} icon="users" />
        <StatCard
          label={t("referEarn.totalEarnings")}
          value={formatCurrency(data?.totalEarnings ?? 0)}
          icon="wallet"
          accent
        />
        <StatCard label={t("referEarn.pendingReferrals")} value={String(stats.pending)} icon="refresh" />
        <StatCard label={t("referEarn.conversionRate")} value={`${stats.conversion}%`} icon="trending-up" />
      </div>

      {/* ── Referral link — primary call to action ──────────────────────── */}
      <div className="rounded-card bg-gradient-to-br from-primary/40 via-primary/10 to-accent/25 p-px shadow-ambient">
        <div className="rounded-[calc(var(--radius-card)-1px)] bg-surface-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-accent-on-dark">
            <Icon name="send" size={18} />
            <h2 className="font-display text-base font-semibold text-on-surface">{t("referEarn.linkCtaTitle")}</h2>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center rounded-control border border-outline-variant bg-surface-container-highest px-3 py-2.5">
              <span className="truncate font-mono text-xs text-on-surface sm:text-sm">{link}</span>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="btn-primary shrink-0 !min-h-[44px] sm:!px-5"
              aria-live="polite"
            >
              <Icon name={copied ? "check" : "copy"} size={16} />
              {copied ? t("common.copied") : t("referEarn.copyLink")}
            </button>
          </div>

          <p className="mt-2 text-xs text-on-surface-variant">{t("referEarn.codeLabel", { code })}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
              {t("referEarn.shareVia")}
            </span>
            {SOCIALS.map((s) => (
              <a
                key={s.key}
                href={s.href(link, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(s.labelKey)}
                title={t(s.labelKey)}
                className={`flex h-10 w-10 items-center justify-center rounded-control border border-outline-variant text-on-surface-variant transition duration-200 ease-ds hover:-translate-y-px ${s.className}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  {s.glyph}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("referEarn.stepsTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.titleKey} className="card relative overflow-hidden">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-3 -top-4 font-display text-6xl font-bold text-primary/10"
              >
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-control bg-primary/15 text-accent-on-dark">
                <Icon name={step.icon} size={20} />
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold text-on-surface">{t(step.titleKey)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{t(step.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent referral activity ───────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("referEarn.activityTitle")}</h2>

        {isLoading ? (
          <div className="card text-center text-sm text-on-surface-variant">{t("common.loading")}</div>
        ) : history.length === 0 ? (
          <div className="card">
            <EmptyState icon="users" title={t("referEarn.noReferrals")} />
          </div>
        ) : (
          <>
            {/* Mobile — stacked cards */}
            <ul className="space-y-3 sm:hidden">
              {history.map((h, i) => (
                <li key={`${h.refereeUsername}-${i}`} className="card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold text-on-surface">{h.refereeUsername}</span>
                    {statusBadge(h.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>{new Date(h.registeredAt).toLocaleDateString()}</span>
                    <span>
                      {t("referEarn.thDeposit")}: {formatCurrency(h.refereeDepositAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant pt-2 text-sm">
                    <span className="text-on-surface-variant">{t("referEarn.thReward")}</span>
                    <span className="font-mono font-semibold text-success">{formatCurrency(h.rewardAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet / desktop — table */}
            <div className="hidden overflow-x-auto rounded-card border border-outline-variant sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-surface-container-high text-left text-xs uppercase tracking-[0.05em] text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("referEarn.thUser")}</th>
                    <th className="px-4 py-3 font-semibold">{t("referEarn.thJoined")}</th>
                    <th className="px-4 py-3 font-semibold">{t("referEarn.thDeposit")}</th>
                    <th className="px-4 py-3 font-semibold">{t("referEarn.thReward")}</th>
                    <th className="px-4 py-3 font-semibold">{t("referEarn.thStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {history.map((h, i) => (
                    <tr key={`${h.refereeUsername}-${i}`} className="row-hover">
                      <td className="px-4 py-3 font-medium text-on-surface">{h.refereeUsername}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {new Date(h.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                        {formatCurrency(h.refereeDepositAmount)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-success">
                        {formatCurrency(h.rewardAmount)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(h.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
