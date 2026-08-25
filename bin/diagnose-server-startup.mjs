#!/usr/bin/env node
// One-off diagnostic for cPanel's "Setup Node.js App" -> "Run JS script"
// feature: this runs inside the exact same Node/venv context Passenger
// uses to spawn the real app, so it can answer two questions SSH would
// normally answer: (1) what env vars does Passenger actually inject
// (specifically PORT, which decides whether the real app.listen() call
// binds where Passenger expects), and (2) does createApp() + listen()
// actually succeed, or throw/hang — without guessing from outside.
// Read-only aside from a transient listen()/close() — never touches the
// database or any persistent state. Run from the repo root (same
// convention as bin/diagnose-db.mjs).
console.log("cwd:", process.cwd());
console.log("node:", process.version);
console.log("PORT env (raw):", JSON.stringify(process.env.PORT));
console.log(
  "env keys matching /passenger|port/i:",
  Object.keys(process.env)
    .filter((k) => /passenger|port/i.test(k))
    .map((k) => `${k}=${process.env[k]}`),
);

try {
  const { createApp } = await import("../apps/api/dist/app.js");
  const { env } = await import("../apps/api/dist/env.js");
  console.log("env.PORT resolved to:", env.PORT);
  console.log("env.NODE_ENV:", env.NODE_ENV);

  const app = createApp();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`LISTEN_OK: bound to 0.0.0.0:${env.PORT}`);
    server.close(() => {
      console.log("Closed cleanly. Diagnostic done.");
      process.exit(0);
    });
  });
  server.on("error", (err) => {
    console.error("LISTEN_FAIL:", err && err.stack ? err.stack : err);
    process.exit(1);
  });
  // Safety net in case neither callback fires within a reasonable window.
  setTimeout(() => {
    console.error("TIMEOUT: neither listening nor error after 8s");
    process.exit(1);
  }, 8000).unref?.();
} catch (err) {
  console.error("STARTUP_FAIL (createApp/import threw):", err && err.stack ? err.stack : err);
  process.exit(1);
}
