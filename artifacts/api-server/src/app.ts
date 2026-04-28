import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const ALLOWED_ORIGINS = [
  "https://v0-molem-psau.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
];

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile/curl/server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      // Allow any vercel.app preview domain
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
      // Allow v0/Vercel preview iframes
      if (/\.vusercontent\.net$/i.test(origin)) return cb(null, true);
      if (/\.v0\.dev$/i.test(origin) || /\.v0\.app$/i.test(origin)) {
        return cb(null, true);
      }
      // Allow Replit preview/dev domains
      if (/\.replit\.dev$/i.test(origin) || /\.replit\.app$/i.test(origin)) {
        return cb(null, true);
      }
      // Soft-fail: log and reject without throwing (so OPTIONS doesn't 500)
      logger.warn({ origin }, "CORS origin not allowed");
      cb(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({
    name: "Molem API",
    description: "Saudi labor law contract auditor backend",
    docs: "/api/healthz",
  });
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  const message = err instanceof Error ? err.message : "خطأ داخلي في الخادم";
  res.status(500).json({ error: message });
};
app.use(errorHandler);

export default app;
