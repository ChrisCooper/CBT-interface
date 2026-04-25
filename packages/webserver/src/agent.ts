import { Agent } from "@mastra/core/agent";
import { container } from "./container.js";
import { LLM } from "./ai.js";

const llm = container.resolve(LLM);

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "You are a helpful, concise assistant. Answer questions clearly and directly.",
  model: llm.mastraModel(),
});
