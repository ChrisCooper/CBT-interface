import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "webserver";

export const trpc = createTRPCReact<AppRouter>();
