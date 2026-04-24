import { createAppRouter } from "../../router.js";
import type { TestDb } from "./db.js";

type AppRouter = ReturnType<typeof createAppRouter>;
export type TestCaller = ReturnType<AppRouter["createCaller"]>;

export const trpcFixture = {
  trpc: async (
    { db }: { db: TestDb },
    use: (trpc: TestCaller) => Promise<void>,
  ) => {
    const router = createAppRouter(db as any);
    await use(router.createCaller({}));
  },
};
