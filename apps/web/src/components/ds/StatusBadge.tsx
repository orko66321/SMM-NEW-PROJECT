import { useLanguage } from "../../context/LanguageContext.js";
import { Badge, type BadgeTone } from "./Badge.js";

// Maps an order / deposit / ticket status enum to the right semantic pill,
// using the panel's fixed status vocabulary (translations `common.*Status.*`).
// Never paraphrase these labels — customers learn them as machine states.

type Kind = "order" | "deposit" | "ticket";

const ORDER_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  PROCESSING: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  PARTIAL: "primary",
  CANCELED: "error",
  FAILED: "error",
};

const DEPOSIT_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const TICKET_TONE: Record<string, BadgeTone> = {
  OPEN: "info",
  PENDING_ADMIN: "warning",
  PENDING_USER: "primary",
  CLOSED: "neutral",
};

const TONE_MAP: Record<Kind, Record<string, BadgeTone>> = {
  order: ORDER_TONE,
  deposit: DEPOSIT_TONE,
  ticket: TICKET_TONE,
};

const I18N_GROUP: Record<Kind, string> = {
  order: "common.orderStatus",
  deposit: "common.depositStatus",
  ticket: "common.ticketStatus",
};

export function statusTone(kind: Kind, status: string): BadgeTone {
  return TONE_MAP[kind][status] ?? "neutral";
}

export function StatusBadge({
  status,
  kind = "order",
  className,
}: {
  status: string;
  kind?: Kind;
  className?: string;
}) {
  const { t } = useLanguage();
  const label = t(`${I18N_GROUP[kind]}.${status}`);
  return (
    <Badge tone={statusTone(kind, status)} className={className}>
      {label}
    </Badge>
  );
}
