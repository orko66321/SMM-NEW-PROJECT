import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminGatewayConfigs, updateAdminGatewayConfig } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface GatewayConfigItem {
  provider: string;
  mode: "SANDBOX" | "LIVE";
  enabled: boolean;
  configured: boolean;
  updatedAt: string | null;
}

const emptyCreds = { appKey: "", appSecret: "", username: "", password: "", baseUrl: "https://tokenized.sandbox.bka.sh/v1.2.0-beta" };

export default function AdminPaymentGateways() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: configs } = useQuery({ queryKey: ["admin-gateways"], queryFn: getAdminGatewayConfigs });

  const [mode, setMode] = useState<"SANDBOX" | "LIVE">("SANDBOX");
  const [enabled, setEnabled] = useState(false);
  const [credentials, setCredentials] = useState(emptyCreds);
  const [submitting, setSubmitting] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateAdminGatewayConfig("BKASH", { mode, enabled, credentials });
      toast.push("bKash configuration saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-gateways"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save gateway config"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  const bkash = configs?.find((c: GatewayConfigItem) => c.provider === "BKASH");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Payment Gateways</h1>
      <p className="text-sm text-on-surface-variant">
        Live gateway integrations. Every other deposit method (Nagad, Rocket, Upay, crypto, etc.) still
        goes through the manual admin-approval flow on the Deposits page until a real integration is
        added here.
      </p>

      <div className="card flex max-w-md items-center justify-between">
        <div>
          <p className="font-semibold">bKash</p>
          <p className="text-xs text-on-surface-variant">
            {bkash?.configured ? `${bkash.mode} · ${bkash.enabled ? "Enabled" : "Disabled"}` : "Not configured"}
          </p>
        </div>
        <span className={`badge ${bkash?.enabled ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>
          {bkash?.enabled ? "Live" : "Off"}
        </span>
      </div>

      <form onSubmit={onSave} className="card max-w-md space-y-3">
        <h2 className="text-sm font-semibold">Configure bKash</h2>

        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("SANDBOX")} className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "SANDBOX" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
            Sandbox
          </button>
          <button type="button" onClick={() => setMode("LIVE")} className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "LIVE" ? "border-warning bg-warning/10 text-warning" : "border-outline-variant text-on-surface-variant"}`}>
            Live
          </button>
        </div>

        <input className="input-field" placeholder="Base URL" value={credentials.baseUrl} onChange={(e) => setCredentials((c) => ({ ...c, baseUrl: e.target.value }))} required />
        <input className="input-field" placeholder="App Key" value={credentials.appKey} onChange={(e) => setCredentials((c) => ({ ...c, appKey: e.target.value }))} required />
        <input className="input-field" type="password" placeholder="App Secret" value={credentials.appSecret} onChange={(e) => setCredentials((c) => ({ ...c, appSecret: e.target.value }))} required />
        <input className="input-field" placeholder="Username" value={credentials.username} onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))} required />
        <input className="input-field" type="password" placeholder="Password" value={credentials.password} onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))} required />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled (customers can use this gateway)
        </label>

        {mode === "LIVE" && (
          <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
            Live mode moves real money. Verify sandbox mode works end-to-end first.
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Saving…" : "Save configuration"}</button>
        <p className="text-xs text-on-surface-variant">Credentials are encrypted at rest and never re-displayed after saving.</p>
      </form>
    </div>
  );
}
