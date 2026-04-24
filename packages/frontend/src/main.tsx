import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./trpc";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (import.meta.env.DEV) {
              console.error("[Query Error]", error);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (import.meta.env.DEV) {
              console.error("[Mutation Error]", error);
            }
          },
        }),
        defaultOptions: {
          queries: { retry: 1 },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:3000/trpc",
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
