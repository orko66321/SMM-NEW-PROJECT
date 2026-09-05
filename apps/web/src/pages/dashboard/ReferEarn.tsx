import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyReferral, getPublicSettings } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { Badge, EmptyState, Icon, StatCard } from "../../components/ds/index.js";

export default function ReferEarn() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [copied, setCopied] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  const { data, isLoading } = useQuery({ queryKey: ["referral-me"], queryFn: getMyReferral, enabled: !!user });

  if (!user) return <GuestLockedCard title={t("referEarn.title")} body={t("referEarn.guestBody")} />;

  const referralEnabled = settings?.referralSystemEnabled ?? false;
  const link = `${window.location.origin}/register?ref=${data?.referralCode ?? user.referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("referEarn.title")}</h1>

      {!referralEnabled && (
        <div className="rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-on-surface">
          {t("referEarn.disabledNote")}
        </div>
      )}

      {referralEnabled && settings && (
        <p className="text-sm text-on-surface-variant">
          {settings.referrerRewardType === "FIXED"
            ? t("referEarn.howItWorksFixed", {
                reward: formatCurrency(settings.referrerRewardValue),
                bonus: settings.refereeBonusPercent,
              })
            : t("referEarn.howItWorksPercent", {
                reward: settings.referrerRewardValue,
                bonus: settings.refereeBonusPercent,
              })}
        </p>
      )}

      <div className="card space-y-2">
        <p className="label">{t("referEarn.yourLink")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-control bg-surface-container-highest px-3 py-2 font-mono text-xs">{link}</code>
          <button type="button" className="btn-primary shrink-0 !min-h-[40px] !px-4 !py-2 text-sm" onClick={copyLink}>
            <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? t("common.copied") : t("referEarn.copyLink")}
          </button>
        </div>
        <p className="text-xs text-on-surface-variant">{t("referEarn.codeLabel", { code: data?.referralCode ?? user.referralCode })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t("referEarn.totalInvited")} value={String(data?.invitedCount ?? 0)} icon="users" />
        <StatCard label={t("referEarn.totalEarnings")} value={formatCurrency(data?.totalEarnings ?? 0)} icon="wallet" accent />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">{t("referEarn.historyTitle")}</h2>
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">{t("referEarn.thUser")}</th>
                <th className="px-4 py-3">{t("referEarn.thJoined")}</th>
                <th className="px-4 py-3">{t("referEarn.thReward")}</th>
                <th className="px-4 py-3">{t("referEarn.thStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">{t("common.loading")}</td></tr>}
              {!isLoading && (data?.history.length ?? 0) === 0 && (
                <tr><td colSpan={4} className="px-4 py-6"><EmptyState icon="users" title={t("referEarn.noReferrals")} /></td></tr>
              )}
              {data?.history.map((h, i) => (
                <tr key={`${h.refereeUsername}-${i}`}>
                  <td className="px-4 py-3">{h.refereeUsername}</td>
                  <td className="px-4 py-3 text-xs">{new Date(h.registeredAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-success">{formatCurrency(h.rewardAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={h.status === "COMPLETED" ? "success" : "error"}>{h.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
