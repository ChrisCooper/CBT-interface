import { generateText, tool, stepCountIs } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import { z } from "zod";
import { log } from "./logger.js";
import { verifyCustomerId, processCancellation } from "./service_stubs.js";

type Step = "collect-id" | "confirm-cancel" | "completed";

interface SessionState {
  step: Step;
  customerId?: string;
  history: ModelMessage[];
}

interface StepResult {
  replyToUser: string;
  state: SessionState;
}

const sessions = new Map<string, SessionState>();

function getSession(chatId: string): SessionState {
  return sessions.get(chatId) ?? { step: "collect-id", history: [] };
}

function saveSession(chatId: string, state: SessionState): void {
  sessions.set(chatId, state);
  log.debug({ chatId, state }, "Session updated");
}

const SYSTEM_PROMPT = `You are a polite, empathetic customer support assistant helping users cancel their subscription.
If the user asks unrelated questions, answer them briefly but ALWAYS gently steer the conversation back to the cancellation process.`;

/** Strip model-specific reasoning/channel tokens that leak into raw text output. */
function stripThinkingTokens(text: string): string {
  return text.replace(/<\|channel>.*?<channel\|>/gs, "").trim();
}

export async function runStep(
  model: LanguageModel,
  chatId: string,
  userMessage: string,
): Promise<StepResult> {
  const state = getSession(chatId);
  state.history.push({ role: "user", content: userMessage });

  let result: StepResult;

  switch (state.step) {
    case "collect-id":
      result = await collectCustomerId(model, state, userMessage);
      break;
    case "confirm-cancel":
      result = await confirmCancellation(model, state, userMessage);
      break;
    case "completed":
      result = {
        replyToUser:
          "Your subscription has already been cancelled. Is there anything else I can help with?",
        state,
      };
      break;
  }

  result.state.history.push({ role: "assistant", content: result.replyToUser });
  saveSession(chatId, result.state);
  return result;
}

async function collectCustomerId(
  model: LanguageModel,
  state: SessionState,
  userMessage: string,
): Promise<StepResult> {
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      ...state.history,
      {
        role: "user",
        content: `[STEP INSTRUCTIONS: We need the Customer ID to proceed with cancellation. Customer IDs are typically alphanumeric (e.g., CUST-12345, ABC123). If you can identify a Customer ID in the latest user message, call the verify_customer_id tool to check it. Otherwise, reply helpfully and ask for their Customer ID.]`,
      },
    ],
    tools: {
      verify_customer_id: tool({
        description:
          "Verify a customer ID. Call this when the user provides what appears to be their customer ID.",
        inputSchema: z.object({
          customerId: z
            .string()
            .describe("The customer ID extracted from the user's message"),
        }),
        execute: async ({ customerId }) => verifyCustomerId(customerId),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  const verifyCall = result.steps
    .flatMap((s) => s.toolCalls)
    .find((c) => c.toolName === "verify_customer_id");

  const verifyResult = result.steps
    .flatMap((s) => s.toolResults)
    .find((r) => r.toolName === "verify_customer_id");

  const output = verifyResult?.output as { isValid: boolean; message: string } | undefined;

  if (output?.isValid && verifyCall) {
    const customerId = (verifyCall.input as { customerId: string }).customerId;
    log.info({ extractedId: customerId }, "Customer ID verified");
    return {
      replyToUser: stripThinkingTokens(result.text),
      state: { ...state, step: "confirm-cancel", customerId },
    };
  }

  return { replyToUser: stripThinkingTokens(result.text), state };
}

async function confirmCancellation(
  model: LanguageModel,
  state: SessionState,
  userMessage: string,
): Promise<StepResult> {
  const customerId = state.customerId!;

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      ...state.history,
      {
        role: "user",
        content: `[STEP INSTRUCTIONS: The user has verified Customer ID "${customerId}" and we need them to confirm cancellation. If they explicitly confirm they want to cancel, call the process_cancellation tool. Otherwise, ask them to confirm.]`,
      },
    ],
    tools: {
      process_cancellation: tool({
        description:
          "Process the subscription cancellation for the verified customer. Call this only when the user has explicitly confirmed they want to cancel.",
        inputSchema: z.object({
          customerId: z
            .string()
            .describe("The verified customer ID"),
        }),
        execute: async ({ customerId }) => processCancellation(customerId),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  const cancelResult = result.steps
    .flatMap((s) => s.toolResults)
    .find((r) => r.toolName === "process_cancellation");

  const cancelOutput = cancelResult?.output as { isConfirmed: boolean; message: string } | undefined;

  if (cancelOutput?.isConfirmed) {
    log.info({ customerId }, "Cancellation confirmed");
    return {
      replyToUser: stripThinkingTokens(result.text),
      state: { ...state, step: "completed" },
    };
  }

  return { replyToUser: stripThinkingTokens(result.text), state };
}
