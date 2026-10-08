// Stand-ins for the real provider. Two kinds:
//
//   createScriptedProvider  for tests. You write down exactly what the "model"
//                           will say, call by call, and afterwards see exactly
//                           what it was sent.
//   createDemoProvider      for local work with no key (AI_PROVIDER=mock). A few
//                           keyword rules that call the same tools and return
//                           the same answer shape as the real model would.
//
// Both also fake embeddings: a bag-of-words hash, so texts that share words
// land close together. Good enough to test search ordering, not a language
// model. Nothing here ever touches the network.
import { EMBEDDING_DIMENSIONS } from "@/lib/ai/config";
import type { ToolResult } from "@/lib/ai/schemas";
import {
  AiProviderError,
  type AiProvider,
  type ModelTurn,
  type RespondInput,
  type ToolCall,
} from "@/lib/ai/types";

// --- Fake embeddings ---

// FNV-1a: a tiny, stable string hash.
function hash(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fakeEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  for (const word of words) vector[hash(word) % EMBEDDING_DIMENSIONS] += 1;

  let length = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0));
  if (length === 0) {
    vector[0] = 1; // an empty text still gets a valid unit vector
    length = 1;
  }
  return vector.map((n) => n / length);
}

// Cosine similarity of two unit vectors is just their dot product.
export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// --- Building turns ---

const NO_USAGE = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

export function textTurn(text: string): ModelTurn {
  return {
    text,
    toolCalls: [],
    outputItems: [{ fake: "text" }],
    usage: NO_USAGE,
  };
}

export function toolTurn(
  calls: { name: string; args: unknown; callId?: string }[],
): ModelTurn {
  const toolCalls: ToolCall[] = calls.map((call, i) => ({
    callId: call.callId ?? `call-${i + 1}`,
    name: call.name,
    argumentsJson: JSON.stringify(call.args),
  }));
  return {
    text: null,
    toolCalls,
    outputItems: toolCalls.map((c) => ({ fake: "function_call", ...c })),
    usage: NO_USAGE,
  };
}

// The model's final answer, as the JSON text the real model would send.
export function answerJson(
  reply: string,
  productIds: string[] = [],
  handoffSummary: string | null = null,
): string {
  return JSON.stringify({
    reply,
    product_ids: productIds,
    handoff_summary: handoffSummary,
  });
}

// --- Scripted provider (tests) ---

export type ScriptStep =
  | ModelTurn
  | AiProviderError
  | ((input: RespondInput) => ModelTurn | AiProviderError);

export function createScriptedProvider(script: ScriptStep[]) {
  const respondCalls: RespondInput[] = [];
  const embedCalls: string[][] = [];
  let next = 0;

  const provider: AiProvider = {
    async respond(input) {
      respondCalls.push(input);
      const step = script[next++];
      if (step === undefined) {
        throw new Error("scripted provider: the script ran out of steps");
      }
      const result = typeof step === "function" ? step(input) : step;
      if (result instanceof AiProviderError) throw result;
      return result;
    },
    async embed(texts) {
      embedCalls.push(texts);
      return texts.map(fakeEmbedding);
    },
  };
  return { provider, respondCalls, embedCalls };
}

// --- Demo provider (local work, no key) ---

const DEMO_TAG = "(demo mode) ";

function lastUserText(input: RespondInput): string {
  for (let i = input.items.length - 1; i >= 0; i--) {
    const item = input.items[i];
    if (item.type === "message" && item.role === "user") return item.text;
  }
  return "";
}

// Every product a tool has returned so far in this turn.
function productsFromToolResults(input: RespondInput): { id: string }[] {
  const products: { id: string }[] = [];
  for (const item of input.items) {
    if (item.type !== "tool_result") continue;
    try {
      const result = JSON.parse(item.output) as ToolResult;
      if ("products" in result) products.push(...result.products);
    } catch {
      // not JSON: ignore it
    }
  }
  return products;
}

export function createDemoProvider(): AiProvider {
  let calls = 0;

  return {
    async respond(input) {
      const text = lastUserText(input);
      const lower = text.toLowerCase();
      const hasToolResult = input.items.some((i) => i.type === "tool_result");

      // Second step: a tool already ran, so answer from its rows.
      if (hasToolResult) {
        const products = productsFromToolResults(input);
        const reply = products.length
          ? `${DEMO_TAG}Here are some options. The prices are shown below.`
          : `${DEMO_TAG}I could not find a match. Message us on WhatsApp and we will help.`;
        return textTurn(
          answerJson(
            reply,
            products.map((p) => p.id),
          ),
        );
      }

      // Questions the fixed shop text answers: no tool needed.
      if (
        /\b(shipping|delivery|deliver|refund|return|terms|privacy|contact)\b/.test(
          lower,
        )
      ) {
        return textTurn(
          answerJson(
            `${DEMO_TAG}Our shipping, terms and privacy pages have the details.`,
          ),
        );
      }
      // A made-to-order request: hand it to the owner.
      if (/\b(custom|personali[sz]ed|made to order)\b/.test(lower)) {
        return textTurn(
          answerJson(
            `${DEMO_TAG}That sounds like a custom piece. Send the owner a message with your idea.`,
            [],
            text.slice(0, 300),
          ),
        );
      }

      calls += 1;
      const callId = `demo-${calls}`;
      const budget = lower.match(
        /(?:under|below|less than|within)\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/,
      );
      if (budget) {
        const maxPrice = Number(budget[1].replace(/,/g, ""));
        return toolTurn([
          {
            callId,
            name: "search_products",
            args: { query: null, category_slug: null, max_price: maxPrice },
          },
        ]);
      }
      if (/\b(gift|wedding|anniversary|birthday|present)\b/.test(lower)) {
        return toolTurn([
          {
            callId,
            name: "find_similar_products",
            args: { description: text.slice(0, 200) },
          },
        ]);
      }
      return toolTurn([
        {
          callId,
          name: "search_products",
          args: {
            query: text.slice(0, 80),
            category_slug: null,
            max_price: null,
          },
        },
      ]);
    },

    async embed(texts) {
      return texts.map(fakeEmbedding);
    },
  };
}
