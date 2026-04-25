import "reflect-metadata";
import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import {
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
} from "ai";
import { appRouter } from "./router.js";
import { log } from "./logger.js";
import { container } from "./container.js";
import { Config } from "./config.js";
import { LLM } from "./ai.js";
import { runStep } from "./workflow.js";

export type { AppRouter } from "./router.js";

const config = container.resolve(Config);
const llm = container.resolve(LLM);
log.info({ llmEndpointHost: config.env.LLM_ENDPOINT_HOST }, "Config loaded");

const app = express();
const serverStartTime = Date.now();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

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

app.post("/chat", async (req, res) => {
  try {
    const { messages, id: chatId = "default" } = req.body;

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const userText =
      lastUserMsg?.content ??
      lastUserMsg?.parts?.find((p: { type: string }) => p.type === "text")
        ?.text ??
      "";

    const result = await runStep(llm.model(), chatId, userText);

    const uiStream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        writer.write({ type: "text-start", id: chatId });
        writer.write({
          type: "text-delta",
          id: chatId,
          delta: result.replyToUser,
        });
        writer.write({ type: "text-end", id: chatId });
      },
    });

    pipeUIMessageStreamToResponse({ response: res, stream: uiStream });
  } catch (error) {
    log.error({ error }, "Chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    }
  }
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
