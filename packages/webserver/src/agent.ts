import { Agent } from "@mastra/core/agent";
import { container } from "./container.js";
import { LLM } from "./ai.js";

const llm = container.resolve(LLM);

export const cancellationAgent = new Agent({
  id: "cancellation-agent",
  name: "Cancellation Assistant",
  instructions: `You are a polite, empathetic customer support assistant helping users cancel their subscription.
Follow this flow:
1. Collect the user's Customer ID (alphanumeric).
2. Confirm they want to cancel.
3. Process the cancellation.
Be professional and concise. If sidetracked, steer back to the cancellation process.`,
  model: llm.mastraModel(),
});
