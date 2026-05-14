import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // Don't pick up compiled test files from package dist/ folders; we only
    // want the original .ts sources.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
