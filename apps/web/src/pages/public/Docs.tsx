import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PostCategoryValues, type PostCategory } from "@smm/shared";
import { getPublicPosts } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { Badge, type BadgeTone, EmptyState, Icon, PlatformChip, PlatformChipRow } from "../../components/ds/index.js";
import "../../styles/panel-glass.css";

interface PostCard {
  slug: string;
  category: PostCategory;
  coverImage: string | null;
  youtubeVideoId: string | null;
  pdfName: string | null;
  hasPdf: boolean;
  titleEn: string | null;
  titleBn: string | null;
  publishedAt: string | null;
}

const CATEGORY_TONE: Record<PostCategory, BadgeTone> = {
  DOCUMENTATION: "info",
  BLOG: "primary",
  UPDATE: "success",
};

const TAB_VALUES = ["all", ...PostCategoryValues] as const;
type Tab = (typeof TAB_VALUES)[number];

const isTab = (v: string | null): v is Tab => v !== null && (TAB_VALUES as readonly string[]).includes(v);

export default function Docs() {
  const { t, lang } = useLanguage();
  // `?tab=BLOG` / `?tab=UPDATE` deep-links (used by the navbar "More" menu:
  // Blog & Announcements → BLOG, System Status & Updates → UPDATE).
  const [params, setParams] = useSearchParams();
  const [tab, setTabState] = useState<Tab>(() => (isTab(params.get("tab")) ? (params.get("tab") as Tab) : "all"));

  useEffect(() => {
    const p = params.get("tab");
    setTabState(isTab(p) ? (p as Tab) : "all");
  }, [params]);

  const setTab = (next: Tab) => {
    setTabState(next);
    setParams(next === "all" ? {} : { tab: next }, { replace: true });
  };

  const { data: posts, isLoading } = useQuery<PostCard[]>({
    queryKey: ["public-posts"],
    queryFn: () => getPublicPosts(),
  });

  const filtered = (posts ?? []).filter((p) => tab === "all" || p.category === tab);

  return (
    <div className="no-page-pub" lang={lang}>
      <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
      <h1 className="font-headline text-2xl font-bold text-[#f4f2fb] sm:text-3xl">{t("docs.title")}</h1>
      <p className="mt-2 text-sm text-[#c7c4d7]">{t("docs.subtitle")}</p>

      <PlatformChipRow className="mt-6 flex-wrap">
        {(["all", ...PostCategoryValues] as const).map((key) => (
          <PlatformChip
            key={key}
            label={key === "all" ? t("docs.tabs.all") : t(`docs.tabs.${key}`)}
            active={tab === key}
            onClick={() => setTab(key)}
          />
        ))}
      </PlatformChipRow>

      {isLoading ? (
        <p className="mt-10 text-sm text-on-surface-variant">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="card mt-10"><EmptyState icon="docs" title={t("docs.empty")} /></div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.slug}
              to={`/docs/${p.slug}`}
              className="group card-interactive flex flex-col overflow-hidden rounded-card border border-outline-variant bg-surface-card"
            >
              {p.coverImage ? (
                <img src={p.coverImage} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-surface-container-high text-on-surface-variant">
                  <Icon name={p.youtubeVideoId ? "campaign" : p.hasPdf ? "docs" : "grid"} size={32} />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Badge tone={CATEGORY_TONE[p.category]} className="w-fit">{t(`docs.tabs.${p.category}`)}</Badge>
                <p className="font-display font-semibold text-on-surface group-hover:text-primary">
                  {pickLang(lang, p.titleBn, p.titleEn)}
                </p>
                {p.publishedAt && (
                  <p className="mt-auto text-xs text-on-surface-variant">
                    {t("docs.publishedOn", { date: new Date(p.publishedAt).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
