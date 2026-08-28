import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { AccessType, ProductDesignTemplate, ProductType } from "@smm/shared";
import { getStoreBrandProducts, getStoreBrands, getStoreProductPackages, purchaseStorePackage } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { AuthPromptModal } from "../../components/auth/GuestGate.js";

interface BrandItem {
  id: string;
  name: string;
  level: number;
  productDesign: ProductDesignTemplate;
  logo: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  salePrice: string;
  productType: ProductType;
  accessType: AccessType;
  userInputFieldName: string;
  orderInstructionsLink: string | null;
  description: string | null;
  isQuantityShowUser: boolean;
}

interface PackageItem {
  id: string;
  name: string;
  amount: number;
  salePrice: string;
  extraFee: string;
  server: string | null;
}

function canAccess(product: ProductItem, user: { isVip: boolean; isReseller: boolean } | null) {
  if (product.accessType === "ALL") return true;
  if (!user) return false;
  if (product.accessType === "VIP") return user.isVip;
  return user.isReseller;
}

// Grid density driven by the Brand's chosen "Product Design" template — the
// same component renders a compact "Special Offer" strip and a bigger
// "Topup" grid purely from this class swap, no per-section custom code.
// Target: mobile 2 cols / tablet 3 / desktop 5 (mamatopup-style card grid).
const PRODUCT_GRID_CLASSES: Record<ProductDesignTemplate, string> = {
  SMALL_STRIP: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
  STANDARD_GRID: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
  FEATURED_LARGE: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
};

// Card image aspect ratio — reference artwork is roughly square. Switch to
// "aspect-[4/3]" here if your banners are landscape; every store card
// follows this one value.
const CARD_IMAGE_ASPECT = "aspect-square";

// Shared presentational card: colorful image on top, white label strip
// below (centered bold navy title + thin purple underline accent), one
// unit with a box-shadow, hover scale-up. Deliberately sits on a light
// background even though the dashboard around it is dark — same treatment
// as the reference site. Still a <button> (not a link) so it keeps the
// existing brand→product→package drill-down behaviour.
function StoreCard({
  name,
  image,
  price,
  badge,
  locked = false,
  onSelect,
}: {
  name: string;
  image: string | null;
  price?: string;
  badge?: string;
  locked?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      className={`group flex flex-col overflow-hidden rounded-md bg-white shadow-lg shadow-black/30 ring-1 ring-black/5 transition duration-200 ${
        locked
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/40"
      }`}
    >
      <div className={`relative w-full ${CARD_IMAGE_ASPECT} overflow-hidden`}>
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          // Placeholder until real artwork is uploaded — vibrant purple
          // gradient + the product's initial, so the grid still looks good.
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-container">
            <span className="font-display text-4xl font-extrabold text-white/90 drop-shadow-md">
              {name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/80">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 border-b-2 border-primary bg-white px-2 py-3 text-center">
        <span className="line-clamp-2 text-sm font-bold leading-tight text-[#0B1F3A]">{name}</span>
        <span className="h-0.5 w-8 rounded-full bg-primary" />
        {price && <span className="font-mono text-xs text-slate-500">{price}</span>}
      </div>
    </button>
  );
}

function BrandTile({ brand, onSelect }: { brand: BrandItem; onSelect: () => void }) {
  return <StoreCard name={brand.name} image={brand.logo} onSelect={onSelect} />;
}

function ProductTile({
  product,
  locked,
  onSelect,
}: {
  product: ProductItem;
  locked: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  return (
    <StoreCard
      name={product.name}
      image={product.logo}
      price={t("store.startingFrom", { price: formatCurrency(product.salePrice) })}
      badge={locked ? t(`store.accessType.${product.accessType}`) : undefined}
      locked={locked}
      onSelect={onSelect}
    />
  );
}

function PurchasePanel({ product, pkg, onDone }: { product: ProductItem; pkg: PackageItem; onDone: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [buyerInput, setBuyerInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [deliveredCode, setDeliveredCode] = useState<string | null>(null);

  const total = Number(pkg.salePrice) + Number(pkg.extraFee);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await purchaseStorePackage({ packageId: pkg.id, buyerInput }, idempotencyKey);
      toast.push(t("store.purchaseSuccessToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (result.deliveredCode) {
        setDeliveredCode(result.deliveredCode);
      } else {
        onDone();
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAuthPromptOpen(true);
        return;
      }
      setError(apiErrorMessage(err, t("store.purchaseFailedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  if (deliveredCode) {
    return (
      <div className="card space-y-3">
        <h3 className="font-semibold text-success">{t("store.deliveredTitle")}</h3>
        <code className="block break-all rounded-md bg-surface-container-highest px-3 py-2 text-sm">{deliveredCode}</code>
        <button type="button" className="btn-primary" onClick={onDone}>{t("common.close")}</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h3 className="font-semibold">{pkg.name}</h3>
      {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error break-words">{error}</p>}

      <div>
        <label className="label" htmlFor="buyer-input">{product.userInputFieldName}</label>
        <input id="buyer-input" className="input-field" value={buyerInput} onChange={(e) => setBuyerInput(e.target.value)} required />
      </div>

      {product.orderInstructionsLink && (
        <a href={product.orderInstructionsLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          {t("store.howToOrder")}
        </a>
      )}

      <div className="space-y-1 rounded-md bg-surface-container-high px-4 py-3 text-sm">
        <div className="flex justify-between"><span className="text-on-surface-variant">{t("store.basePrice")}</span><span className="font-mono">{formatCurrency(pkg.salePrice)}</span></div>
        {Number(pkg.extraFee) > 0 && (
          <div className="flex justify-between"><span className="text-on-surface-variant">{t("store.extraFee")}</span><span className="font-mono">{formatCurrency(pkg.extraFee)}</span></div>
        )}
        <div className="flex justify-between border-t border-outline-variant pt-1 font-semibold"><span>{t("store.total")}</span><span className="font-mono text-success">{formatCurrency(total)}</span></div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? t("store.buying") : t("store.buyNow")}
      </button>

      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} title={t("store.authPromptTitle")} body={t("store.authPromptBody")} />
    </form>
  );
}

export default function Store() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const [brandId, setBrandId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);

  const { data: brands, isLoading: brandsLoading } = useQuery({ queryKey: ["store-brands"], queryFn: () => getStoreBrands() });
  const { data: products } = useQuery({
    queryKey: ["store-products", brandId],
    queryFn: () => getStoreBrandProducts(brandId!),
    enabled: !!brandId,
  });
  const { data: packages } = useQuery({
    queryKey: ["store-packages", productId],
    queryFn: () => getStoreProductPackages(productId!),
    enabled: !!productId,
  });

  const selectedBrand = useMemo(() => (brands as BrandItem[] | undefined)?.find((b) => b.id === brandId) ?? null, [brands, brandId]);
  const selectedProduct = useMemo(() => (products as ProductItem[] | undefined)?.find((p) => p.id === productId) ?? null, [products, productId]);

  function reset() {
    setBrandId(null);
    setProductId(null);
    setSelectedPackage(null);
  }

  function backToBrand() {
    setProductId(null);
    setSelectedPackage(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <h1 className="text-xl font-bold">{t("store.title")}</h1>
        {(selectedBrand || selectedProduct) && (
          <nav className="flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
            <button type="button" className="hover:text-primary hover:underline" onClick={reset}>{t("store.title")}</button>
            {selectedBrand && (
              <>
                <span>/</span>
                <button type="button" className="hover:text-primary hover:underline" onClick={backToBrand}>{selectedBrand.name}</button>
              </>
            )}
            {selectedProduct && (
              <>
                <span>/</span>
                <span className="text-on-surface">{selectedProduct.name}</span>
              </>
            )}
          </nav>
        )}
      </div>

      {!selectedBrand && (
        <>
          {brandsLoading && <p className="text-sm text-on-surface-variant">{t("common.loading")}</p>}
          {!brandsLoading && (brands as BrandItem[] | undefined)?.length === 0 && (
            <p className="card text-center text-sm text-on-surface-variant">{t("store.noBrands")}</p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-5">
            {(brands as BrandItem[] | undefined)?.map((b) => (
              <BrandTile key={b.id} brand={b} onSelect={() => setBrandId(b.id)} />
            ))}
          </div>
        </>
      )}

      {selectedBrand && !selectedProduct && (
        <div className={`grid gap-4 sm:gap-5 ${PRODUCT_GRID_CLASSES[selectedBrand.productDesign]}`}>
          {(products as ProductItem[] | undefined)?.map((p) => (
            <ProductTile key={p.id} product={p} locked={!canAccess(p, user)} onSelect={() => setProductId(p.id)} />
          ))}
          {products && (products as ProductItem[]).length === 0 && (
            <p className="col-span-full card text-center text-sm text-on-surface-variant">{t("store.noProducts")}</p>
          )}
        </div>
      )}

      {selectedProduct && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {selectedProduct.description && (
              <p className="card whitespace-pre-line text-sm text-on-surface-variant">{selectedProduct.description}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(packages as PackageItem[] | undefined)?.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const total = Number(pkg.salePrice) + Number(pkg.extraFee);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`card flex items-center justify-between gap-2 !p-4 text-left transition ${isSelected ? "border-primary" : "hover:border-primary/60"}`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{pkg.name}</span>
                      {pkg.server && <span className="block text-xs text-on-surface-variant">{pkg.server}</span>}
                    </span>
                    <span className="font-mono text-success">{formatCurrency(total)}</span>
                  </button>
                );
              })}
              {packages && (packages as PackageItem[]).length === 0 && (
                <p className="col-span-full card text-center text-sm text-on-surface-variant">{t("store.noPackages")}</p>
              )}
            </div>
          </div>

          <div>
            {selectedPackage ? (
              <PurchasePanel product={selectedProduct} pkg={selectedPackage} onDone={() => setSelectedPackage(null)} />
            ) : (
              <p className="card text-center text-sm text-on-surface-variant">{t("store.choosePackage")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
