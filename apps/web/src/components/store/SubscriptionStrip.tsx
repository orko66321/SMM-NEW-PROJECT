import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getStoreSubscriptions, type StoreSubscriptionItem } from "../../api/resources.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";

// Cross-sell strip shown under the New Order form: subscription products
// from the Store, bought from the same wallet balance. Deliberately generic
// — every card comes straight from the Store catalog, nothing hardcoded —
// and the whole section hides itself when there are no subscriptions.
// Styled to sit on the New Order page's violet-glass ground (see
// styles/new-order.css); the cards stay light-on-dark, matching the Store grid.
const MAX_CARDS = 10;

function SubscriptionCard({ product }: { product: StoreSubscriptionItem }) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const locked = product.accessType !== "ALL";

  return (
    <Link
      to={`/dashboard/store?product=${encodeURIComponent(product.slug)}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_12px_22px_-10px_rgba(2,6,23,0.55)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_18px_32px_-12px_rgba(124,58,237,0.5)]"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {product.logo ? (
          <img src={product.logo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]">
            <span className="font-headline text-4xl font-bold text-white/90 drop-shadow-md">
              {product.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        {locked && (
          <span className="absolute left-2 top-2 rounded-full bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/80">
            {t(`store.accessType.${product.accessType}`)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center gap-1.5 border-b-2 border-[#7c3aed] bg-white px-2 py-3 text-center">
        <span className="line-clamp-2 text-[12.5px] font-bold leading-tight text-[#0B1F3A]">{product.name}</span>
        <span className="h-0.5 w-8 rounded-full bg-[#7c3aed]" />
        <span className="font-headline text-[10.5px] font-semibold text-slate-500">
          {t("store.startingFrom", { price: formatCurrency(product.salePrice) })}
        </span>
      </div>
    </Link>
  );
}

export default function SubscriptionStrip() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["store-subscriptions", MAX_CARDS],
    queryFn: () => getStoreSubscriptions(MAX_CARDS),
    staleTime: 60_000,
  });

  // Self-hiding: no spinner, no empty state — if the panel sells no
  // subscriptions the New Order page looks exactly as it did before.
  if (isLoading || !data || data.length === 0) return null;

  return (
    <section aria-labelledby="subscription-strip-title" className="lg:col-span-3">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="subscription-strip-title"
            className="flex items-center gap-2 font-headline text-[18px] font-bold text-[#f4f2fb] sm:text-[20px]"
          >
            <span className="h-1.5 w-1.5 rounded-[2px] bg-[#d2bbff] shadow-[0_0_8px_#d2bbff]" />
            {t("newOrder.subscriptionsTitle")}
          </h2>
          <p className="mt-1 text-xs text-[#8b8598]">{t("newOrder.subscriptionsSubtitle")}</p>
        </div>
        <Link
          to="/dashboard/store"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#3a3a47] bg-[#1b1b25] px-3.5 py-2 text-xs font-semibold text-[#d2bbff] transition hover:border-[#d2bbff]"
        >
          {t("newOrder.subscriptionsSeeAll")}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-5">
        {data.map((product) => (
          <SubscriptionCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
