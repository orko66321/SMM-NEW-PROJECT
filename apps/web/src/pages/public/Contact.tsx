import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PublicSupportChannel } from "@smm/shared";
import { getPublicSupportChannels } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import InfoPageShell from "../../components/public/InfoPageShell.js";
import { Icon, type IconName } from "../../components/ds/index.js";

const CHANNEL_ICON: Record<PublicSupportChannel["type"], IconName> = {
  WHATSAPP: "support",
  TELEGRAM: "send",
  MESSENGER: "support",
  CUSTOM: "external",
  TICKET: "docs",
};

export default function Contact() {
  const { t } = useLanguage();
  const { data: channels = [] } = useQuery<PublicSupportChannel[]>({
    queryKey: ["public-support-channels"],
    queryFn: getPublicSupportChannels,
  });

  const linkChannels = channels.filter((c) => c.type !== "TICKET" && c.href);

  return (
    <InfoPageShell title={t("pages.contact.title")} subtitle={t("pages.contact.subtitle")}>
      <h2>{t("pages.contact.channelsHeading")}</h2>
      {linkChannels.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linkChannels.map((c) => (
            <a
              key={c.type + c.label}
              href={c.href ?? "#"}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="card-interactive flex items-center gap-3 rounded-card border border-outline-variant bg-surface-card p-4 !no-underline"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon name={CHANNEL_ICON[c.type]} size={18} />
              </span>
              <span className="text-sm font-semibold text-on-surface">{c.label}</span>
            </a>
          ))}
        </div>
      ) : (
        <p>{t("pages.contact.channelsEmpty")}</p>
      )}

      <h2>{t("pages.contact.ticketHeading")}</h2>
      <p>{t("pages.contact.ticketBody")}</p>
      <p>
        <Link to="/login">{t("nav.signIn")}</Link> · <Link to="/register">{t("nav.signUp")}</Link>
      </p>

      <h2>{t("pages.contact.helpWidgetHeading")}</h2>
      <p>{t("pages.contact.helpWidgetBody")}</p>

      <h2>{t("pages.contact.beforeHeading")}</h2>
      <p>
        {t("pages.contact.beforeBody")} <Link to="/faq">{t("nav.moreItems.faq")}</Link>.
      </p>
    </InfoPageShell>
  );
}
