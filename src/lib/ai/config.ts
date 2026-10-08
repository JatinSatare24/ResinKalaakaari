// Everything the AI assistant reads from the environment, and every limit it
// obeys, in one place. Pure: no React, no Supabase, no network.
//
// The provider key is read here and nowhere else, and only on the server.
// None of these variables start with NEXT_PUBLIC_, so Next never sends them to
// the browser.

// --- Limits (the numbers every other file in lib/ai refers to) ---

export const AI_LIMITS = {
  // What the browser may send.
  maxMessageChars: 500, // one customer message
  maxHistoryMessages: 6, // messages kept from the chat so far
  maxMessagesInBody: 50, // above this the body is refused outright (cheap guard)

  // What we accept back from the model.
  maxReplyChars: 600,
  maxProductsPerReply: 5,
  maxHandoffChars: 500,

  // Tool arguments.
  maxSearchQueryChars: 80,
  maxSimilarDescriptionChars: 200,

  // Provider calls.
  // A ceiling, not a target: you pay only for tokens actually produced. It also
  // counts the model's hidden reasoning, which OpenAI warns can use the whole
  // budget before any visible text, so it is deliberately roomy.
  maxOutputTokens: 3000,
  chatTimeoutMs: 12_000, // one model call
  turnTimeoutMs: 25_000, // a whole question: every model call and tool together
  maxModelCalls: 3, // per question: ask, (tools), answer. The last one gets no tools.
  maxToolCallsPerTurn: 3, // tool requests run per model call; the rest are refused
  maxRequestBodyChars: 20_000, // the whole POST body, before it is even parsed
  embedTimeoutMs: 15_000, // one embeddings call (the admin save passes a shorter one)

  // Embeddings.
  embedBatchSize: 20, // texts per embeddings request
  maxEmbeddingTextChars: 2_200, // name + category + description, cut to this
} as const;

// How many chat messages one visitor, and the whole shop, may send. Counted in
// the database (ai_check_rate_limit), so every server copy shares one count.
// A visitor is a keyed hash of their IP address, never the address itself.
// Worst case spend: globalPerDay questions x about a quarter of a cent each.
export const AI_RATE_LIMITS = {
  ipPerHour: 15,
  ipPerDay: 40,
  globalPerDay: 150,
} as const;

// text-embedding-3-small returns 1536 numbers by default. The database column
// (phase-11 SQL) must use the same number.
export const EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_CHAT_MODEL = "gpt-5.6-luna";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_REASONING_EFFORT = "low";

// --- Environment ---

export type AiConfig = {
  // The feature flag. Off unless AI_ASSISTANT_ENABLED is exactly "true".
  enabled: boolean;
  // "mock" answers from a built-in fake, for local work with no key.
  provider: "openai" | "mock";
  apiKey: string | null;
  // Shared secret between this server and the rate-limit database function,
  // also used to key the visitor hash. Without it the assistant stays off.
  gateSecret: string | null;
  model: string;
  embeddingModel: string;
  reasoningEffort: string;
};

type Env = Record<string, string | undefined>;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function readAiConfig(env: Env = process.env): AiConfig {
  return {
    enabled: env.AI_ASSISTANT_ENABLED === "true",
    provider: env.AI_PROVIDER === "mock" ? "mock" : "openai",
    apiKey: clean(env.OPENAI_API_KEY),
    gateSecret: clean(env.AI_GATE_SECRET),
    model: clean(env.OPENAI_MODEL) ?? DEFAULT_CHAT_MODEL,
    embeddingModel:
      clean(env.OPENAI_EMBEDDING_MODEL) ?? DEFAULT_EMBEDDING_MODEL,
    reasoningEffort:
      clean(env.OPENAI_REASONING_EFFORT) ?? DEFAULT_REASONING_EFFORT,
  };
}

// True when the assistant may run: the flag is on, the rate limiter has its
// secret, AND there is something to answer with (a key, or the mock). The
// bubble and the route both ask this, so a half-configured setup stays off
// instead of running without limits.
export function isAiAvailable(config: AiConfig): boolean {
  if (!config.enabled || config.gateSecret === null) return false;
  return config.provider === "mock" || config.apiKey !== null;
}
