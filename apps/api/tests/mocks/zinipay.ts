import http from "node:http";
import type { AddressInfo } from "node:net";

type RouteHandler = (body: unknown) => unknown;

/**
 * Minimal local HTTP server implementing the two ZiniPay endpoints our
 * adapter calls (create/verify), so tests/zinipay.test.ts can verify the
 * webhook/callback trust boundary without a real ZiniPay account. See
 * services/payments/zinipay.ts for the real endpoint shapes this mirrors.
 */
export function startMockZiniPay(routes: { verify?: RouteHandler; invoiceId?: string }) {
  const invoiceId = routes.invoiceId ?? "mock-invoice-id";
  let lastCreateBody: Record<string, unknown> | undefined;
  let lastVerifyBody: Record<string, unknown> | undefined;

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      let result: unknown;

      if (req.url?.endsWith("/v1/payment/create")) {
        lastCreateBody = body;
        result = { status: true, message: "Invoice created successfully.", payment_url: `https://secure.zinipay.com/payment/${invoiceId}` };
      } else if (req.url?.endsWith("/v1/payment/verify")) {
        lastVerifyBody = body;
        result = routes.verify ? routes.verify(body) : { invoice_id: invoiceId, status: "COMPLETED", amount: 25 };
      } else {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
  });

  return new Promise<{
    baseUrl: string;
    invoiceId: string;
    close: () => Promise<void>;
    getLastCreateBody: () => Record<string, unknown> | undefined;
    getLastVerifyBody: () => Record<string, unknown> | undefined;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        invoiceId,
        close: () => new Promise((r) => server.close(() => r())),
        getLastCreateBody: () => lastCreateBody,
        getLastVerifyBody: () => lastVerifyBody,
      });
    });
  });
}
