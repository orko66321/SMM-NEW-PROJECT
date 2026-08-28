// Inline PDF "documentation" view. The data URI is rendered in an <iframe>
// using the browser's native PDF viewer — no PDF.js dependency. Mobile
// browsers (Safari/Chrome iOS) often refuse to render a PDF inline and
// download it instead, so the "Open in new tab" link above the frame is
// always shown, not just a fallback.

export default function PdfViewer({
  dataUri,
  name,
  openLabel,
}: {
  dataUri: string;
  name?: string | null;
  openLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span aria-hidden="true">📄</span>
        <span className="font-medium text-on-surface">{name || "Document.pdf"}</span>
        <a
          href={dataUri}
          target="_blank"
          rel="noopener"
          className="text-primary-container underline"
        >
          {openLabel}
        </a>
      </div>
      <div className="h-[80vh] min-h-[480px] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high">
        <iframe src={dataUri} title={name || "PDF document"} className="h-full w-full" />
      </div>
    </div>
  );
}
