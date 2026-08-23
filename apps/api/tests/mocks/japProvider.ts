import http from "node:http";
import type { AddressInfo } from "node:net";

type ActionHandler = (params: URLSearchParams) => unknown;

/**
 * Minimal local HTTP server implementing the JAP-standard action dialect
 * (`action=services|add|status|balance`), so providerClient.service.ts can
 * be tested against real HTTP requests/responses without any network call
 * to an actual upstream provider. Each test supplies just the action
 * handlers it needs; anything else 404s.
 */
export function startMockProvider(handlers: Partial<Record<string, ActionHandler>>) {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const params = new URLSearchParams(raw);
      const action = params.get("action") ?? "";
      const handler = handlers[action];
      if (!handler) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `No mock handler for action=${action}` }));
        return;
      }
      const result = handler(params);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
  });

  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/api/v2`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
