import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentGatewayKeys, type PaymentGatewayKey } from "@smm/shared";
import { getAdminGatewayConfigs, updateAdminGatewayConfig } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Breadcrumbs } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";

interface GatewayConfigItem {
  provider: PaymentGatewayKey;
  mode: "SANDBOX" | "LIVE";
  enabled: boolean;
  autoVerify: boolean;
  configured: boolean;
  updatedAt: string | null;
}

interface CredentialField {
  key: string;
  label: string;
  type?: "text" | "password";
  required?: boolean;
}

// Per-provider credential shape — drives both the rendered form fields and
// the empty-state defaults. Kept here rather than hardcoded per gateway so
// adding a third gateway later is a data change, not a new form component.
// Mirrors the zod shapes in packages/shared/src/index.ts (bkashCredentialsSchema /
// zinipayCredentialsSchema) exactly.
const GATEWAY_FIELDS: Record<PaymentGatewayKey, CredentialField[]> = {
  BKASH: [
    { key: "baseUrl", label: "Base URL", required: true },
    { key: "appKey", label: "App Key", required: true },
    { key: "appSecret", label: "App Secret", type: "password", required: true },
    { key: "username", label: "Username", required: true },
    { key: "password", label: "Password", type: "password", required: true },
  ],
  ZINIPAY: [
    { key: "baseUrl", label: "Base URL", required: true },
    { key: "apiKey", label: "API Key", required: true },
    { key: "secretKey", label: "Secret Key (optional)", type: "password" },
    // ZiniPay's documented API never asks for a Merchant ID — stored for
    // forward compatibility only, same treatment as secretKey, per
    // services/payments/zinipay.ts and packages/shared's zinipayCredentialsSchema.
    { key: "merchantId", label: "Merchant ID (optional, unused by the adapter today)" },
  ],
};

const DEFAULT_BASE_URL: Record<PaymentGatewayKey, string> = {
  BKASH: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
  ZINIPAY: "https://api.zinipay.com",
};

const GATEWAY_LABELS: Record<PaymentGatewayKey, string> = { BKASH: "bKash", ZINIPAY: "ZiniPay" };

function emptyCredentials(provider: PaymentGatewayKey): Record<string, string> {
  const creds: Record<string, string> = {};
  for (const field of GATEWAY_FIELDS[provider]) creds[field.key] = field.key === "baseUrl" ? DEFAULT_BASE_URL[provider] : "";
  return creds;
}

function GatewayCard({ provider, config }: { provider: PaymentGatewayKey; config?: GatewayConfigItem }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"SANDBOX" | "LIVE">(config?.mode ?? "SANDBOX");
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [autoVerify, setAutoVerify] = useState(config?.autoVerify ?? true);
  const [credentials, setCredentials] = useState<Record<string, string>>(emptyCredentials(provider));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (config) {
      setMode(config.mode);
      setEnabled(config.enabled);
      setAutoVerify(config.autoVerify);
    }
  }, [config]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Optional fields left blank are dropped rather than sent as empty
      // strings, so the server-side zod .optional() shape isn't violated.
      const submitted = Object.fromEntries(
        Object.entries(credentials).filter(([key, value]) => {
          const field = GATEWAY_FIELDS[provider].find((f) => f.key === key);
          return field?.required || value.trim() !== "";
        }),
      );
      await updateAdminGatewayConfig(provider, { mode, enabled, autoVerify, credentials: submitted });
      toast.push(`${GATEWAY_LABELS[provider]} configuration saved.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-gateways"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save gateway config"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{GATEWAY_LABELS[provider]}</p>
          <p className="text-xs text-on-surface-variant">
            {config?.configured ? `${config.mode} · ${config.enabled ? "Enabled" : "Disabled"}` : "Not configured"}
          </p>
        </div>
        <span className={`badge ${config?.enabled ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>
          {config?.enabled ? "Live" : "Off"}
        </span>
      </div>

      <form onSubmit={onSave} className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("SANDBOX")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "SANDBOX" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}
          >
            Sandbox
          </button>
          <button
            type="button"
            onClick={() => setMode("LIVE")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "LIVE" ? "border-warning bg-warning/10 text-warning" : "border-outline-variant text-on-surface-variant"}`}
          >
            Live
          </button>
        </div>

        {GATEWAY_FIELDS[provider].map((field) => (
          <input
            key={field.key}
            className="input-field"
            type={field.type === "password" ? "password" : "text"}
            placeholder={field.label}
            value={credentials[field.key] ?? ""}
            onChange={(e) => setCredentials((c) => ({ ...c, [field.key]: e.target.value }))}
            required={field.required}
          />
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled (customers can use this gateway)
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={autoVerify} onChange={(e) => setAutoVerify(e.target.checked)} className="mt-0.5" />
          <span>
            Auto-verify &amp; auto-credit
            <br />
            <span className="text-xs text-on-surface-variant">
              When on (default), a payment confirmed via {GATEWAY_LABELS[provider]}&apos;s API instantly credits the
              wallet. Turn off to trial a newly connected gateway — verified payments still show up in the manual
              Deposits queue for one-click release instead of auto-crediting.
            </span>
          </span>
        </label>

        {mode === "LIVE" && (
          <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
            Live mode moves real money. Verify sandbox mode works end-to-end first.
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Save configuration"}
        </button>
        <p className="text-xs text-on-surface-variant">Credentials are encrypted at rest and never re-displayed after saving.</p>
      </form>
    </div>
  );
}

export default function AdminPaymentGateways() {
  const { data: configs } = useQuery({ queryKey: ["admin-gateways"], queryFn: getAdminGatewayConfigs });
  const byKey = new Map<PaymentGatewayKey, GatewayConfigItem>((configs ?? []).map((c: GatewayConfigItem) => [c.provider, c]));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Payment Gateways" }]} />
      <h1 className="text-xl font-bold">Payment Gateway API Settings</h1>
      <p className="text-sm text-on-surface-variant">
        Live gateway integrations. Once a gateway is enabled, deposits made through it are automatically verified
        server-to-server and credited to the customer&apos;s wallet — no manual approval needed (see the
        auto-verify toggle on each card). Every other deposit method (Nagad, Rocket, Upay, crypto, etc.) still
        goes through the manual admin-approval flow on the Deposits page until a real automated integration is
        added here.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {PaymentGatewayKeys.map((provider) => (
          <GatewayCard key={provider} provider={provider} config={byKey.get(provider)} />
        ))}
      </div>
    </div>
  );
}
