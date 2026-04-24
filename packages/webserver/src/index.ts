import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";

export type { AppRouter } from "./router.js";

const app = express();
const serverStartTime = Date.now();

app.use(cors({ origin: "http://localhost:5173" }));

app.get("/sse/uptime", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173",
  });

  const send = () => {
    const uptimeMs = Date.now() - serverStartTime;
    res.write(`data: ${JSON.stringify({ uptimeMs, serverStartTime })}\n\n`);
  };

  send();
  const interval = setInterval(send, 10_000);

  req.on("close", () => clearInterval(interval));
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  }),
);

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
