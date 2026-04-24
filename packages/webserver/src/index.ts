import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "shared";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

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
