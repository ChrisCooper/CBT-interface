import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { Config } from "./config.js";

@injectable()
export class LLM {
  private readonly provider;

  constructor(@inject(Config) private config: Config) {
    this.provider = createOpenAICompatible({
      name: "llm",
      baseURL: `${config.env.LLM_ENDPOINT_HOST}/v1`,
      supportsStructuredOutputs: true,
    });
  }

  model(): LanguageModel {
    return this.provider(this.config.env.LLM_MODEL);
  }
}
