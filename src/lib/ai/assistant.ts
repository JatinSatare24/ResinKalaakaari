// One customer question, start to finish. This is the loop that turns a chat
// into an answer:
//
//   model call 1  -> maybe asks for tools -> we run them (read only)
//   model call 2  -> maybe asks for more  -> we run them
//   model call 3  -> must answer: it is given NO tools
//
// Hard limits: at most 3 model calls, at most 3 tool runs per call, 25 seconds
// for the whole question. A model that loops, or is told to loop by text in a
// product description, runs out of road and gets cut off.
//
// The product list the customer sees is drawn from database rows we hold, never
// from anything the model wrote. The model only picks WHICH rows (by id), and
// guard.ts has already removed ids no tool returned.
import { AI_LIMITS } from "@/lib/ai/config";
import {
  applyGuards,
  buildAllowedAmounts,
  buildWhatsAppUrl,
} from "@/lib/ai/guard";
import { SHOP_CONTACTS, SHOP_KNOWLEDGE } from "@/lib/ai/knowledge";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import {
  ASSISTANT_OUTPUT_FORMAT,
  TOOL_DEFINITIONS,
  parseAssistantOutput,
  type ChatMessage,
} from "@/lib/ai/schemas";
import { runTool, type ToolDeps } from "@/lib/ai/tools";
import {
  AiProviderError,
  type AiProvider,
  type ConversationItem,
} from "@/lib/ai/types";
import type { AiProductRow } from "@/lib/data/ai-products";

export type AssistantDeps = { provider: AiProvider; tools: ToolDeps };

export type AssistantProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string | null;
};

export type AssistantReply = {
  reply: string;
  products: AssistantProduct[]; // from database rows, in the model's order
  whatsappUrl: string | null; // a hand-off link, or null
  flags: string[]; // what the guards changed (logs and evals only)
  modelCalls: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
};

export async function runAssistant(
  messages: ChatMessage[],
  deps: AssistantDeps,
): Promise<AssistantReply> {
  const signal = AbortSignal.timeout(AI_LIMITS.turnTimeoutMs);
  const items: ConversationItem[] = messages.map((m) => ({
    type: "message",
    role: m.role,
    text: m.content,
  }));
  // Every row a tool has returned this turn, by id.
  const known = new Map<string, AiProductRow>();
  const usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

  for (let call = 1; call <= AI_LIMITS.maxModelCalls; call++) {
    const isLast = call === AI_LIMITS.maxModelCalls;
    const turn = await deps.provider.respond(
      {
        instructions: SYSTEM_PROMPT,
        items,
        // The final call has no tools, so it has to answer.
        tools: isLast ? [] : TOOL_DEFINITIONS,
        outputFormat: ASSISTANT_OUTPUT_FORMAT,
      },
      { signal },
    );
    usage.inputTokens += turn.usage.inputTokens;
    usage.outputTokens += turn.usage.outputTokens;
    usage.cachedInputTokens += turn.usage.cachedInputTokens;

    if (turn.toolCalls.length > 0 && !isLast) {
      // Hand the model's own output back untouched, then one result per request.
      items.push({ type: "provider_output", items: turn.outputItems });
      const runs = await Promise.all(
        turn.toolCalls.map(async (toolCall, index) => {
          if (index >= AI_LIMITS.maxToolCallsPerTurn) {
            return {
              callId: toolCall.callId,
              output: JSON.stringify({ error: "too many tool requests" }),
              products: [] as AiProductRow[],
            };
          }
          const run = await runTool(toolCall, deps.tools, signal);
          return { callId: toolCall.callId, ...run };
        }),
      );
      for (const run of runs) {
        items.push({
          type: "tool_result",
          callId: run.callId,
          output: run.output,
        });
        for (const row of run.products) known.set(row.id, row);
      }
      continue;
    }

    if (turn.text === null) {
      throw new AiProviderError("bad_response", "The model gave no answer");
    }
    const parsed = parseAssistantOutput(turn.text);
    if (!parsed.ok) {
      throw new AiProviderError("bad_response", "The answer was not valid");
    }

    const { output, flags } = applyGuards(parsed.value, {
      allowedIds: new Set(known.keys()),
      allowedAmounts: buildAllowedAmounts({
        toolPrices: [...known.values()].map((row) => row.price),
        knowledgeText: SHOP_KNOWLEDGE,
        // Only the customer's own words count. Earlier "assistant" messages
        // come from the browser and could be forged.
        userMessages: messages
          .filter((m) => m.role === "user")
          .map((m) => m.content),
      }),
      allowedContacts: SHOP_CONTACTS,
    });

    const products: AssistantProduct[] = [];
    for (const id of output.productIds) {
      const row = known.get(id);
      if (!row) continue;
      products.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: row.price,
        category: row.category,
      });
    }

    // A hand-off link when the model wrote a brief; a plain "message us" link
    // when a guard threw the reply away and the customer needs somewhere to go.
    const replaced = flags.some(
      (flag) => flag === "amount_not_allowed" || flag.startsWith("reply_"),
    );
    const whatsappUrl = output.handoffSummary
      ? buildWhatsAppUrl(output.handoffSummary)
      : replaced
        ? buildWhatsAppUrl(null)
        : null;

    return {
      reply: output.reply,
      products,
      whatsappUrl,
      flags,
      modelCalls: call,
      usage,
    };
  }

  // Unreachable: the last call always returns or throws above.
  throw new AiProviderError("bad_response", "No answer was produced");
}
