// Minimal, dependency-free Markdown renderer for admin-authored post
// bodies. The source is HTML-escaped *first*, so no raw HTML in the input
// can ever reach the DOM — the only tags produced are the fixed set this
// file emits. That's the whole XSS story; there is no separate sanitize
// step and none is needed.
//
// Supported: # / ## / ### headings, **bold**, *italic* / _italic_,
// `inline code`, - and 1. lists, > blockquotes, --- rules,
// [text](url) links, ![alt](url) images, paragraphs, blank-line breaks.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Only http(s), mailto and protocol-relative — blocks javascript:, data:, etc.
function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)) return escapeHtml(trimmed);
  return "#";
}

function inline(text: string): string {
  let out = escapeHtml(text);
  // images before links (both use the ()[] shape)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => {
    return `<img src="${safeUrl(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    return `<a href="${safeUrl(url)}" target="_blank" rel="noopener nofollow">${escapeHtml(label)}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = (heading[1] ?? "#").length + 1; // # -> h2, ## -> h3, ### -> h4
      html.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const wanted = ordered ? "ol" : "ul";
      if (listType && listType !== wanted) closeList();
      if (!listType) {
        listType = wanted;
        html.push(`<${wanted}>`);
      }
      html.push(`<li>${inline((ordered ?? unordered)?.[1] ?? "")}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

/** Renders trusted-by-construction Markdown output with prose-ish styling. */
export function MarkdownPreview({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div
      className={
        "space-y-3 text-sm leading-relaxed text-on-surface " +
        "[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:font-display " +
        "[&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:font-display " +
        "[&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-bold " +
        "[&_p]:text-on-surface-variant " +
        "[&_a]:text-primary-container [&_a]:underline " +
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-on-surface-variant [&_ul]:space-y-1 " +
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-on-surface-variant [&_ol]:space-y-1 " +
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-on-surface-variant [&_blockquote]:italic " +
        "[&_code]:rounded [&_code]:bg-surface-container-high [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs " +
        "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-outline-variant " +
        "[&_hr]:border-outline-variant " +
        className
      }
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
