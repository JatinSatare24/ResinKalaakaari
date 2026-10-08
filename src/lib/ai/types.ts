// The small, provider-neutral interface the rest of the app uses. The OpenAI
// code (provider.ts) and the fakes (mock-provider.ts) both implement it, and
// nothing outside lib/ai/provider.ts knows which one is answering.

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // a JSON schema
};

// One entry of the conversation the model sees.
export type ConversationItem =
  | { type: "message"; role: "user" | "assistant"; text: string }
  // Whatever the model produced on an earlier call (its tool requests and any
  // hidden reasoning), handed back unchanged. The caller never looks inside.
  | { type: "provider_output"; items: unknown[] }
  | { type: "tool_result"; callId: string; output: string };

export type ToolCall = { callId: string; name: string; argumentsJson: string };

export type ModelTurn = {
  text: string | null; // the answer (JSON text when an output format was asked for)
  toolCalls: ToolCall[]; // tools the model wants run before it answers
  outputItems: unknown[]; // opaque: pass back inside a provider_output item
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
};

export type OutputFormat = { name: string; schema: Record<string, unknown> };

export type RespondInput = {
  instructions: string; // the system prompt
  items: ConversationItem[];
  tools: ToolDefinition[];
  outputFormat?: OutputFormat;
};

export type CallOptions = {
  timeoutMs?: number;
  signal?: AbortSignal; // lets a caller cancel on top of the timeout
};

export interface AiProvider {
  respond(input: RespondInput, options?: CallOptions): Promise<ModelTurn>;
  // One vector per text, in the same order.
  embed(texts: string[], options?: CallOptions): Promise<number[][]>;
}

// What went wrong, in terms the rest of the app can act on. The message is
// safe to log: it never contains the key, the request or the model's text.
export type AiErrorKind =
  | "not_configured" // no key
  | "timeout"
  | "rate_limited" // too many requests, try later
  | "quota" // the prepaid balance or spending limit is used up
  | "auth" // the key is wrong or lacks access
  | "unavailable" // network failure or a 5xx from the provider
  | "refused" // the model declined to answer
  | "bad_response"; // the reply was not what the API promises

export class AiProviderError extends Error {
  readonly kind: AiErrorKind;
  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
  }
}
