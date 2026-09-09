import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import InfoPageShell from "../../components/public/InfoPageShell.js";
import { Icon } from "../../components/ds/index.js";

// Native <details>/<summary> — fully keyboard-accessible and works with no JS.
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Do I need an account to browse services and prices?",
    a: (
      <>
        No. The full <Link to="/services">service catalogue</Link> with live rates is public. You only
        need a free account to add funds and place orders.
      </>
    ),
  },
  {
    q: "How do I add funds?",
    a: "After signing up, open your wallet and choose bKash, Nagad, Rocket or USDT. Deposits are verified automatically and credited within a few minutes — no manual confirmation step.",
  },
  {
    q: "How fast do orders start?",
    a: "Most orders begin processing within seconds of payment clearing. Delivery speed after that depends on the specific service and quantity; each service lists its average completion time.",
  },
  {
    q: "Is there an API?",
    a: (
      <>
        Yes. Every dashboard action is available over a documented REST API authenticated with your
        personal key. See the <Link to="/api-docs">API documentation</Link>.
      </>
    ),
  },
  {
    q: "What is your refund policy?",
    a: (
      <>
        Wallet balance is spent per order. If a provider cannot deliver, the order is marked failed
        and automatically refunded to your wallet. See the <Link to="/terms">Terms of Service</Link>{" "}
        for the full policy.
      </>
    ),
  },
  {
    q: "Can I get a partial refill or cancellation?",
    a: "Many services support refill or cancellation while an order is in progress. Where available, the option appears on the order in your history. Automated support can also handle common refill/cancel requests.",
  },
  {
    q: "Do you offer reseller or volume pricing?",
    a: "Panel rates are already wholesale. Resellers and agencies running consistent volume can contact support to discuss custom rates.",
  },
  {
    q: "How do I contact support?",
    a: (
      <>
        Use the floating help button on any page, open a ticket from your dashboard, or see the{" "}
        <Link to="/contact">Contact &amp; Support</Link> page for all channels.
      </>
    ),
  },
];

export default function Faq() {
  const { t } = useLanguage();
  return (
    <InfoPageShell title={t("pages.faq.title")} subtitle={t("pages.faq.subtitle")}>
      <div className="space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-card border border-outline-variant bg-surface-card px-4 open:bg-surface-container/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-display text-sm font-semibold text-on-surface marker:content-none">
              {item.q}
              <Icon
                name="chevron-down"
                size={18}
                className="shrink-0 text-on-surface-variant transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="pb-4 pt-0 text-sm leading-relaxed text-on-surface-variant">{item.a}</div>
          </details>
        ))}
      </div>
    </InfoPageShell>
  );
}
