import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "shared";

export const trpc = createTRPCReact<AppRouter>();
