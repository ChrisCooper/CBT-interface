import "reflect-metadata";
import { injectable } from "tsyringe";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EnvSchema = z.object({
  LLM_ENDPOINT_HOST: z.string().url("LLM_ENDPOINT_HOST must be a valid URL"),
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

@injectable()
export class Config {
  readonly env: EnvConfig;

  constructor() {
    const dotenvPath = resolve(process.cwd(), ".env");
    const fileVars = loadDotenv(dotenvPath);
    const merged = { ...fileVars, ...process.env };
    this.env = EnvSchema.parse(merged);
  }
}
