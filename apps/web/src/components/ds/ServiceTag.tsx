import { Badge, type BadgeTone } from "./Badge.js";

// Monospace bracketed quality qualifier lifted off a service name
// ([Non-Drop], [HQ], [Refill 30D], [Cheapest], [New]). Exists to kill the
// decorative-Unicode service names coming from providers.
const TONE: Record<string, BadgeTone> = {
  "non-drop": "success",
  hq: "info",
  cheapest: "primary",
  new: "primary",
};

export function ServiceTag({ label }: { label: string }) {
  const tone = TONE[label.toLowerCase().replace(/\s.*$/, "")] ?? "neutral";
  return (
    <Badge tone={tone} mono className="!rounded-sm !px-1.5 !py-0.5 !text-[11px]">
      [{label}]
    </Badge>
  );
}
