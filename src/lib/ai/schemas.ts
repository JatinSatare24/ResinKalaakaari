// Validators for everything that crosses a trust line in the assistant:
//   browser -> server   parseChatRequest        (the customer's messages)
//   model   -> server   parseAssistantOutput    (the model's final answer)
//   model   -> server   parseToolArguments      (what the model asks a tool to do)
// Plus the JSON descriptions we send the model (tool list, answer shape).
//
// Pure: no React, no Supabase, no network. Nothing here trusts its input: a
// wrong type, a missing field, a huge string or an unknown value comes back as
// { ok: false }, never as an exception and never as a half-valid object.
import { MAX_PRODUCT_PRICE } from "@/lib/constants";
import { isUuid } from "@/lib/orders";
import { AI_LIMITS } from "@/lib/ai/config";
import type { ToolDefinition } from "@/lib/ai/types";

// --- Text cleaning ---

// Control characters, zero-width characters and the "right-to-left override"
// family. Text with these in it can hide words from a human reader while a
// model still reads them, so they are removed from everything we accept.
const HIDDEN_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(HIDDEN_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Cut text to `max` characters. Prefers to cut at a space (not mid-word) and
// adds an ellipsis so a cut answer does not look finished.
export function capText(value: string, max: number): string {
  if (value.length <= max) return value;
  const room = max - 1; // one character left for the ellipsis
  const space = value.lastIndexOf(" ", room);
  const cut = space > room * 0.6 ? space : room;
  return `${value.slice(0, cut).trimEnd()}…`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// --- Browser -> server: the chat request ---

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatRequestResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; reason: "invalid" | "empty" | "too_long" };

// The body is { messages: [{ role, content }, ...] }. Only "user" and
// "assistant" roles are accepted: a "system" or "developer" message sent from
// a browser is refused, so a visitor can never add rules of their own.
// Earlier assistant messages come from the browser too, so they are treated as
// untrusted text exactly like the customer's own words.
export function parseChatRequest(body: unknown): ChatRequestResult {
  if (!isPlainObject(body) || !Array.isArray(body.messages)) {
    return { ok: false, reason: "invalid" };
  }
  const raw = body.messages;
  if (raw.length === 0) return { ok: false, reason: "empty" };
  if (raw.length > AI_LIMITS.maxMessagesInBody) {
    return { ok: false, reason: "invalid" };
  }

  const messages: ChatMessage[] = [];
  for (const entry of raw) {
    if (!isPlainObject(entry)) return { ok: false, reason: "invalid" };
    const { role, content } = entry;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, reason: "invalid" };
    }
    if (typeof content !== "string") return { ok: false, reason: "invalid" };

    // Check the raw length first so a giant string is refused before we
    // spend time cleaning it. Hidden characters can only shrink it, so
    // anything past 4x the limit is too long however it is cleaned.
    if (content.length > AI_LIMITS.maxMessageChars * 4) {
      return { ok: false, reason: "too_long" };
    }
    const text = cleanText(content);
    if (text.length > AI_LIMITS.maxMessageChars) {
      return { ok: false, reason: "too_long" };
    }
    if (text) messages.push({ role, content: text }); // blank turns are dropped
  }

  // Keep the most recent turns only, and never start on an assistant turn.
  let window = messages.slice(-AI_LIMITS.maxHistoryMessages);
  while (window.length > 0 && window[0].role === "assistant") {
    window = window.slice(1);
  }
  if (window.length === 0 || window[window.length - 1].role !== "user") {
    return { ok: false, reason: "empty" };
  }
  return { ok: true, messages: window };
}

// --- Model -> server: the final answer ---

export type AssistantOutput = {
  reply: string; // plain text, at most maxReplyChars
  productIds: string[]; // uuids, unique, at most maxProductsPerReply
  handoffSummary: string | null; // short brief for the owner, or null
};

export type AssistantOutputResult =
  { ok: true; value: AssistantOutput } | { ok: false };

// The model is asked for JSON { reply, product_ids, handoff_summary }. Strict
// mode is a request, not a guarantee, and it cannot express length limits, so
// every rule is checked again here. Lengths are capped, not rejected: a reply
// that runs a little long is still a good reply.
export function parseAssistantOutput(text: string): AssistantOutputResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isPlainObject(data)) return { ok: false };

  const { reply, product_ids, handoff_summary } = data;
  if (typeof reply !== "string") return { ok: false };
  if (!Array.isArray(product_ids) || product_ids.length > 50) {
    return { ok: false };
  }
  if (
    handoff_summary !== undefined &&
    handoff_summary !== null &&
    typeof handoff_summary !== "string"
  ) {
    return { ok: false };
  }

  const cleanReply = cleanText(reply);
  if (!cleanReply) return { ok: false };

  // Ids: only strings that look like uuids, no repeats, in the model's order.
  const seen = new Set<string>();
  const productIds: string[] = [];
  for (const id of product_ids) {
    if (typeof id !== "string") return { ok: false };
    const key = id.trim().toLowerCase();
    if (!isUuid(key) || seen.has(key)) continue;
    seen.add(key);
    productIds.push(key);
    if (productIds.length === AI_LIMITS.maxProductsPerReply) break;
  }

  const summary =
    typeof handoff_summary === "string" ? cleanText(handoff_summary) : "";

  return {
    ok: true,
    value: {
      reply: capText(cleanReply, AI_LIMITS.maxReplyChars),
      productIds,
      handoffSummary: summary
        ? capText(summary, AI_LIMITS.maxHandoffChars)
        : null,
    },
  };
}

// --- Model -> server: tool arguments ---

export const TOOL_NAMES = [
  "search_products",
  "find_similar_products",
  "get_product",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type ParsedToolCall =
  | {
      name: "search_products";
      args: {
        query: string | null;
        categorySlug: string | null;
        maxPrice: number | null;
      };
    }
  | { name: "find_similar_products"; args: { description: string } }
  | { name: "get_product"; args: { productId: string } };

export type ToolCallResult =
  { ok: true; call: ParsedToolCall } | { ok: false; reason: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ARGUMENTS_CHARS = 2_000;

// `reason` is shown to the model as the tool's answer, so it can fix the
// call, and it never contains the model's own text back (no echo of input).
export function parseToolArguments(
  name: string,
  argumentsJson: string,
): ToolCallResult {
  if (!(TOOL_NAMES as readonly string[]).includes(name)) {
    return { ok: false, reason: "unknown tool" };
  }
  if (argumentsJson.length > MAX_ARGUMENTS_CHARS) {
    return { ok: false, reason: "arguments too long" };
  }
  let data: unknown;
  try {
    data = JSON.parse(argumentsJson);
  } catch {
    return { ok: false, reason: "arguments are not valid JSON" };
  }
  if (!isPlainObject(data)) {
    return { ok: false, reason: "arguments must be an object" };
  }

  if (name === "search_products") {
    const { query, category_slug, max_price } = data;

    let cleanQuery: string | null = null;
    if (query !== undefined && query !== null) {
      if (typeof query !== "string") {
        return { ok: false, reason: "query must be text or null" };
      }
      const text = cleanText(query);
      cleanQuery = text ? capText(text, AI_LIMITS.maxSearchQueryChars) : null;
    }

    let categorySlug: string | null = null;
    if (category_slug !== undefined && category_slug !== null) {
      if (
        typeof category_slug !== "string" ||
        category_slug.length > 60 ||
        !SLUG_PATTERN.test(category_slug)
      ) {
        return { ok: false, reason: "category_slug is not a valid slug" };
      }
      categorySlug = category_slug;
    }

    let maxPrice: number | null = null;
    if (max_price !== undefined && max_price !== null) {
      if (
        typeof max_price !== "number" ||
        !Number.isInteger(max_price) ||
        max_price < 1 ||
        max_price > MAX_PRODUCT_PRICE
      ) {
        return { ok: false, reason: "max_price must be a whole number" };
      }
      maxPrice = max_price;
    }

    return {
      ok: true,
      call: {
        name,
        args: { query: cleanQuery, categorySlug, maxPrice },
      },
    };
  }

  if (name === "find_similar_products") {
    const { description } = data;
    if (typeof description !== "string") {
      return { ok: false, reason: "description must be text" };
    }
    const text = cleanText(description);
    if (!text) return { ok: false, reason: "description is empty" };
    return {
      ok: true,
      call: {
        name,
        args: {
          description: capText(text, AI_LIMITS.maxSimilarDescriptionChars),
        },
      },
    };
  }

  // get_product
  const { product_id } = data;
  if (typeof product_id !== "string" || !isUuid(product_id)) {
    return { ok: false, reason: "product_id must be a uuid" };
  }
  return {
    ok: true,
    call: {
      name: "get_product",
      args: { productId: product_id.toLowerCase() },
    },
  };
}

// --- What a tool hands back to the model ---

// Slim on purpose: every field costs tokens on every later call.
export type ToolProductRow = {
  id: string;
  name: string;
  price: number; // whole rupees, straight from the products table
  category: string | null;
  description: string; // trimmed
};

export type ToolResult = { products: ToolProductRow[] } | { error: string };

// --- What we send the model ---

// Strict mode wants every property listed as required, an optional value is
// "type or null". The descriptions are the model's only manual for each tool.
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "search_products",
    description:
      "Find products in the shop by words, category or highest price. Use it for questions like 'nameplates under 1000'. Returns up to 5 products with their current price. Pass null for anything the customer did not ask for.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: ["string", "null"],
          description: "Words to look for in the product name or description.",
        },
        category_slug: {
          type: ["string", "null"],
          description: "Category slug, for example resin-clocks.",
        },
        max_price: {
          type: ["integer", "null"],
          description: "Highest price in whole rupees.",
        },
      },
      required: ["query", "category_slug", "max_price"],
      additionalProperties: false,
    },
  },
  {
    name: "find_similar_products",
    description:
      "Find products by meaning, for open questions like 'a gift for my sister's wedding'. Describe what the customer wants in one short sentence. Returns up to 5 products with their current price.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "What the customer is looking for, in plain words.",
        },
      },
      required: ["description"],
      additionalProperties: false,
    },
  },
  {
    name: "get_product",
    description:
      "Get one product by its id, with its current price. Use it only with an id returned by another tool.",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "A product id (uuid)." },
      },
      required: ["product_id"],
      additionalProperties: false,
    },
  },
];

// The shape of the model's final answer. No length keywords: strict mode may
// not support them, and parseAssistantOutput enforces the limits anyway.
export const ASSISTANT_OUTPUT_FORMAT = {
  name: "shop_assistant_answer",
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      product_ids: { type: "array", items: { type: "string" } },
      handoff_summary: { type: ["string", "null"] },
    },
    required: ["reply", "product_ids", "handoff_summary"],
    additionalProperties: false,
  },
} as const;
