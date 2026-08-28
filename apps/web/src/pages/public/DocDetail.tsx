import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PostCategory } from "@smm/shared";
import { getPublicPost } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { MarkdownPreview } from "../../components/ui/Markdown.js";
import YouTubeEmbed from "../../components/ui/YouTubeEmbed.js";
import PdfViewer from "../../components/ui/PdfViewer.js";

interface PostDetail {
  slug: string;
  category: PostCategory;
  coverImage: string | null;
  youtubeVideoId: string | null;
  pdfFile: string | null;
  pdfName: string | null;
  titleEn: string | null;
  titleBn: string | null;
  contentEn: string | null;
  contentBn: string | null;
  publishedAt: string | null;
}

export default function DocDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLanguage();

  const { data: post, isLoading, isError } = useQuery<PostDetail>({
    queryKey: ["public-post", slug],
    queryFn: () => getPublicPost(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-on-surface-variant sm:px-6">{t("common.loading")}</div>;
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-on-surface-variant">{t("docs.notFound")}</p>
        <Link to="/docs" className="btn-ghost mt-4 inline-flex">{t("docs.backToList")}</Link>
      </div>
    );
  }

  const title = pickLang(lang, post.titleBn, post.titleEn);
  const content = pickLang(lang, post.contentBn, post.contentEn);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/docs" className="text-sm text-on-surface-variant hover:text-on-surface">{t("docs.backToList")}</Link>

      <span className="badge mt-4 flex w-fit bg-primary/15 text-primary">{t(`docs.tabs.${post.category}`)}</span>
      <h1 className="mt-3 font-display text-2xl font-bold text-on-surface sm:text-3xl">{title}</h1>
      {post.publishedAt && (
        <p className="mt-2 text-xs text-on-surface-variant">
          {t("docs.publishedOn", { date: new Date(post.publishedAt).toLocaleDateString() })}
        </p>
      )}

      {post.coverImage && (
        <img src={post.coverImage} alt="" className="mt-6 w-full rounded-lg border border-outline-variant" />
      )}

      {post.youtubeVideoId && (
        <div className="mt-6">
          <YouTubeEmbed videoId={post.youtubeVideoId} title={title} />
        </div>
      )}

      {content.trim() && <MarkdownPreview source={content} className="mt-6" />}

      {post.pdfFile && (
        <div className="mt-8">
          <PdfViewer dataUri={post.pdfFile} name={post.pdfName} openLabel={t("docs.openPdf")} />
        </div>
      )}
    </article>
  );
}
