import http from "node:http";
import type { AddressInfo } from "node:net";

type RouteHandler = (body: unknown) => unknown;

/**
 * Minimal local HTTP server implementing the three bKash Tokenized Checkout
 * endpoints our adapter calls (grant/create/execute/query), so
 * tests/payments.test.ts can verify the callback route's trust boundary
 * (it must call these itself, never trust the browser's query string)
 * without any real bKash sandbox account.
 */
export function startMockBkash(routes: {
  execute?: RouteHandler;
  query?: RouteHandler;
  paymentID?: string;
}) {
  const paymentID = routes.paymentID ?? "mock-payment-id";

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      let result: unknown;

      if (req.url?.endsWith("/token/grant")) {
        result = { id_token: "mock-id-token", token_type: "Bearer" };
      } else if (req.url?.endsWith("/checkout/create")) {
        result = { statusCode: "0000", statusMessage: "Successful", paymentID, bkashURL: "https://mock.bka.sh/redirect" };
      } else if (req.url?.endsWith("/checkout/execute")) {
        result = routes.execute
          ? routes.execute(body)
          : { statusCode: "0000", statusMessage: "Successful", paymentID, transactionStatus: "Completed", amount: "10.00" };
      } else if (req.url?.endsWith("/payment/status")) {
        result = routes.query ? routes.query(body) : { statusCode: "0000", statusMessage: "Successful", paymentID, transactionStatus: "Completed" };
      } else {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
  });

  return new Promise<{ baseUrl: string; paymentID: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        paymentID,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
