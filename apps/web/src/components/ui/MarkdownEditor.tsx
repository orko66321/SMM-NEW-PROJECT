import { useRef, useState } from "react";
import { MarkdownPreview } from "./Markdown.js";

// Plain <textarea> plus a tiny toolbar that wraps/inserts Markdown around
// the current selection — no editor library. Pairs with Markdown.tsx's
// renderer for the live preview.

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}

type Action =
  | { label: string; title: string; wrap: [string, string] }
  | { label: string; title: string; linePrefix: string };

const ACTIONS: Action[] = [
  { label: "H2", title: "Heading", linePrefix: "## " },
  { label: "B", title: "Bold", wrap: ["**", "**"] },
  { label: "I", title: "Italic", wrap: ["_", "_"] },
  { label: "• List", title: "Bulleted list", linePrefix: "- " },
  { label: "1. List", title: "Numbered list", linePrefix: "1. " },
  { label: "❝", title: "Quote", linePrefix: "> " },
  { label: "Link", title: "Link", wrap: ["[", "](https://)"] },
  { label: "Image", title: "Image", wrap: ["![", "](https://)"] },
];

export default function MarkdownEditor({ value, onChange, placeholder, rows = 10, id }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function apply(action: Action) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let caret: number;
    if ("wrap" in action) {
      const [before, after] = action.wrap;
      next = value.slice(0, start) + before + selected + after + value.slice(end);
      caret = start + before.length + selected.length + after.length;
    } else {
      // Prefix every line the selection touches (or the current line).
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end || start);
      const prefixed = block
        .split("\n")
        .map((l) => (l.startsWith(action.linePrefix) ? l : action.linePrefix + l))
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(end || start);
      caret = lineStart + prefixed.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant p-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            title={a.title}
            onClick={() => apply(a)}
            className="rounded px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={`ml-auto rounded px-2 py-1 text-xs font-semibold ${
            showPreview ? "bg-primary/20 text-primary-container" : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          Preview
        </button>
      </div>

      {showPreview ? (
        <div className="min-h-[8rem] p-3">
          {value.trim() ? (
            <MarkdownPreview source={value} />
          ) : (
            <p className="text-sm text-on-surface-variant/60">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent px-3 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
        />
      )}
    </div>
  );
}
