import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { log } from "./logger.js";

export type { AppRouter } from "./router.js";

const app = express();
const serverStartTime = Date.now();

app.use(cors({ origin: "http://localhost:5173" }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    log.info({ method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - start }, "request");
  });
  next();
});

app.get("/sse/uptime", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173",
  });

  log.debug("SSE uptime client connected");

  const send = () => {
    const uptimeMs = Date.now() - serverStartTime;
    res.write(`data: ${JSON.stringify({ uptimeMs, serverStartTime })}\n\n`);
  };

  send();
  const interval = setInterval(send, 10_000);

  req.on("close", () => {
    clearInterval(interval);
    log.debug("SSE uptime client disconnected");
  });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    onError: ({ path, error }) => {
      log.error({ path: path ?? "<no-path>", error }, "tRPC error");
    },
  }),
);

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  log.info({ port: PORT }, "Server listening");
});
