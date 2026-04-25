import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { container } from "./container.js";
import { Config } from "./config.js";

const config = container.resolve(Config);

export const llm = createOpenAICompatible({
  name: "llm",
  baseURL: `${config.env.LLM_ENDPOINT_HOST}/v1`,
});

export function model(): LanguageModel {
  return llm(config.env.LLM_MODEL);
}
