import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PostCategoryValues, type PostCategory } from "@smm/shared";
import { getPublicPosts } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";

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

const CATEGORY_BADGE: Record<PostCategory, string> = {
  DOCUMENTATION: "bg-info/15 text-info",
  BLOG: "bg-primary/15 text-primary",
  UPDATE: "bg-success/15 text-success",
};

export default function Docs() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<"all" | PostCategory>("all");

  const { data: posts, isLoading } = useQuery<PostCard[]>({
    queryKey: ["public-posts"],
    queryFn: () => getPublicPosts(),
  });

  const filtered = (posts ?? []).filter((p) => tab === "all" || p.category === tab);

  return (
    <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-on-surface">{t("docs.title")}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">{t("docs.subtitle")}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", ...PostCategoryValues] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              tab === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {key === "all" ? t("docs.tabs.all") : t(`docs.tabs.${key}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-on-surface-variant">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 rounded-lg border border-outline-variant px-4 py-10 text-center text-on-surface-variant">
          {t("docs.empty")}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.slug}
              to={`/docs/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition hover:border-primary/50"
            >
              {p.coverImage ? (
                <img src={p.coverImage} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-surface-container-high text-3xl">
                  {p.youtubeVideoId ? "▶" : p.hasPdf ? "📄" : "✳"}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <span className={`badge w-fit ${CATEGORY_BADGE[p.category]}`}>{t(`docs.tabs.${p.category}`)}</span>
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
  );
}
