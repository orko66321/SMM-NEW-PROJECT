import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
import { getMyProfile } from "../../api/resources.js";

type Lang = "curl" | "js" | "php";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

function CodeTabs({ snippets }: { snippets: Record<Lang, string> }) {
  const [lang, setLang] = useState<Lang>("curl");
  const labels: Record<Lang, string> = { curl: "cURL", js: "JavaScript", php: "PHP" };

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant">
      <div className="flex border-b border-outline-variant bg-surface-container-high">
        {(Object.keys(labels) as Lang[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setLang(key)}
            className={`px-4 py-2 font-mono text-xs font-semibold transition ${
              lang === key ? "bg-surface-deep text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto bg-surface-deep p-4 text-xs leading-relaxed text-on-surface">
        <code className="font-mono">{snippets[lang]}</code>
      </pre>
    </div>
  );
}

function endpointSnippets(method: "GET" | "POST", path: string, body?: Record<string, unknown>, extraHeaders: string[] = []) {
  const url = `${API_BASE}${path}`;
  const bodyJson = body ? JSON.stringify(body, null, 2) : undefined;

  const curl = [
    `curl -X ${method} "${url}" \\`,
    `  -H "X-API-Key: YOUR_API_KEY" \\`,
    ...extraHeaders.map((h) => `  -H "${h}" \\`),
    bodyJson ? `  -H "Content-Type: application/json" \\\n  -d '${bodyJson.replace(/\n\s*/g, " ")}'` : `  -H "Content-Type: application/json"`,
  ].join("\n");

  const js = [
    `const res = await fetch("${url}", {`,
    `  method: "${method}",`,
    `  headers: {`,
    `    "X-API-Key": "YOUR_API_KEY",`,
    `    "Content-Type": "application/json",`,
    ...extraHeaders.map((h) => `    "${h.split(":")[0]}": "${h.split(":").slice(1).join(":").trim()}",`),
    `  },`,
    ...(bodyJson ? [`  body: JSON.stringify(${bodyJson.replace(/\n/g, "\n  ")}),`] : []),
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].join("\n");

  const php = [
    `$ch = curl_init("${url}");`,
    `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`,
    `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`,
    `curl_setopt($ch, CURLOPT_HTTPHEADER, [`,
    `    "X-API-Key: YOUR_API_KEY",`,
    `    "Content-Type: application/json",`,
    ...extraHeaders.map((h) => `    "${h}",`),
    `]);`,
    ...(bodyJson ? [`curl_setopt($ch, CURLOPT_POSTFIELDS, '${bodyJson.replace(/'/g, "\\'")}');`] : []),
    `$response = curl_exec($ch);`,
    `curl_close($ch);`,
    `$data = json_decode($response, true);`,
  ].join("\n");

  return { curl, js, php };
}

export default function ApiDocs() {
  const { user } = useAuth();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile, enabled: !!user });

  const placeOrder = endpointSnippets(
    "POST",
    "/orders",
    { serviceId: "SERVICE_ID", link: "https://instagram.com/yourprofile", quantity: 1000 },
    ["Idempotency-Key: a-unique-request-id"],
  );
  const orderStatus = endpointSnippets("GET", "/orders?page=1&pageSize=20");
  const walletBalance = endpointSnippets("GET", "/wallet");
  const servicesList = endpointSnippets("GET", "/services");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-on-surface">API Documentation</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        A REST API for resellers — the exact same endpoints the dashboard itself uses, authenticated with a
        personal API key instead of a login session.
      </p>

      <div className="mt-6 card">
        <h2 className="text-sm font-semibold">Your API key</h2>
        {user ? (
          profile?.apiKeyPrefix ? (
            <p className="mt-1 font-mono text-sm text-on-surface-variant">{profile.apiKeyPrefix}••••••••••••••••••••••••</p>
          ) : (
            <p className="mt-1 text-sm text-on-surface-variant">
              You haven&apos;t generated one yet — head to{" "}
              <Link to="/dashboard/profile" className="text-primary hover:underline">Profile &amp; Settings</Link> to create one.
            </p>
          )
        ) : (
          <p className="mt-1 text-sm text-on-surface-variant">
            <Link to="/login" className="text-primary hover:underline">Sign in</Link> and generate a key from your
            Profile page to replace <code className="font-mono text-xs">YOUR_API_KEY</code> below.
          </p>
        )}
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-on-surface">Authentication</h2>
        <p className="text-sm text-on-surface-variant">
          Send your key on every request as the <code className="font-mono text-xs">X-API-Key</code> header. There
          is no session, no OAuth handshake — the key is the credential.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-on-surface">List services &amp; live rates</h2>
        <p className="text-sm text-on-surface-variant"><code className="font-mono text-xs">GET /services</code></p>
        <CodeTabs snippets={servicesList} />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-on-surface">Place an order</h2>
        <p className="text-sm text-on-surface-variant">
          <code className="font-mono text-xs">POST /orders</code> — the server always recalculates the charge from
          the live service price server-side; anything you send is ignored except serviceId/link/quantity.
          <code className="ml-2 font-mono text-xs">Idempotency-Key</code> is required and prevents accidental
          double-orders if a request is retried.
        </p>
        <CodeTabs snippets={placeOrder} />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-on-surface">Check order status</h2>
        <p className="text-sm text-on-surface-variant"><code className="font-mono text-xs">GET /orders</code></p>
        <CodeTabs snippets={orderStatus} />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-on-surface">Wallet balance</h2>
        <p className="text-sm text-on-surface-variant"><code className="font-mono text-xs">GET /wallet</code></p>
        <CodeTabs snippets={walletBalance} />
      </section>
    </div>
  );
}
