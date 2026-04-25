import { generateObject } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import { z } from "zod";
import { log } from "./logger.js";

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
If the user asks unrelated questions, answer them briefly but ALWAYS gently steer the conversation back to the cancellation process.
You MUST respond with valid JSON matching the requested schema.`;

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
  const { object } = await generateObject({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      ...state.history,
      {
        role: "user",
        content: `[STEP INSTRUCTIONS: We need the Customer ID to proceed with cancellation. Customer IDs are typically alphanumeric (e.g., CUST-12345, ABC123). If you can identify a Customer ID in the latest user message, extract it into extractedId. Otherwise, reply helpfully and ask for their Customer ID.]`,
      },
    ],
    schema: z.object({
      extractedId: z
        .string()
        .nullable()
        .describe(
          "The customer ID if found in the user's message, or null if not found",
        ),
      conversationalReply: z
        .string()
        .describe("A friendly, helpful reply to the user"),
    }),
  });

  if (object.extractedId) {
    log.info(
      { chatId: state, extractedId: object.extractedId },
      "Customer ID extracted",
    );
    return {
      replyToUser: object.conversationalReply,
      state: { ...state, step: "confirm-cancel", customerId: object.extractedId },
    };
  }

  return { replyToUser: object.conversationalReply, state };
}

async function confirmCancellation(
  model: LanguageModel,
  state: SessionState,
  userMessage: string,
): Promise<StepResult> {
  const { object } = await generateObject({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      ...state.history,
      {
        role: "user",
        content: `[STEP INSTRUCTIONS: The user has Customer ID "${state.customerId}" and we previously asked them to confirm cancellation. Did they explicitly confirm they want to cancel? Respond appropriately.]`,
      },
    ],
    schema: z.object({
      isConfirmed: z
        .boolean()
        .describe(
          "true if the user explicitly confirmed cancellation, false otherwise",
        ),
      conversationalReply: z
        .string()
        .describe("A friendly, helpful reply to the user"),
    }),
  });

  if (object.isConfirmed) {
    log.info({ customerId: state.customerId }, "Cancellation confirmed");
    return {
      replyToUser: object.conversationalReply,
      state: { ...state, step: "completed" },
    };
  }

  return { replyToUser: object.conversationalReply, state };
}
