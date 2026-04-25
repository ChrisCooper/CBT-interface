import "reflect-metadata";
import { injectable } from "tsyringe";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, parse as parsePath } from "node:path";
import { fileURLToPath } from "node:url";

const EnvSchema = z.object({
  LLM_ENDPOINT_HOST: z.string().url("LLM_ENDPOINT_HOST must be a valid URL"),
  LLM_MODEL: z.string().default("llama3"),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

function loadDotenv(path: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    throw new Error(`Missing .env file at ${path}`);
  }

  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    vars[key] = raw.replace(/^["']|["']$/g, "");
  }
  return vars;
}

function findProjectRoot(startDir: string): string {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not find project root (no pnpm-workspace.yaml found). Started searching from ${startDir}`,
  );
}

@injectable()
export class Config {
  readonly env: EnvConfig;

  constructor() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const root = findProjectRoot(__dirname);
    const fileVars = loadDotenv(resolve(root, ".env"));
    const merged = { ...fileVars, ...process.env };
    this.env = EnvSchema.parse(merged);
  }
}
