import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimit.js";

export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip / rate-limiting
  // behind a reverse proxy or load balancer in production).
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );

  // 1mb was fine for every other route, but bulk-selecting a large real
  // provider catalog (my.smmgen.com alone has ~7,800 services) for import
  // can get close to it on just the id array — 5mb gives real headroom
  // without meaningfully changing this app's request-size risk profile.
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use(generalLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
