// Runs the evaluation cases through the REAL answer loop (runAssistant) with
// whatever provider it is given: the real model for `npm run eval`, a scripted
// one in tests. Nothing here talks to the network itself.
import { runAssistant, type AssistantReply } from "@/lib/ai/assistant";
import { FALLBACK_REPLY } from "@/lib/ai/guard";
import type { EvalCase, Seen } from "@/lib/ai/eval/cases";
import type { ToolDeps } from "@/lib/ai/tools";
import type { AiProvider } from "@/lib/ai/types";

export type CaseResult = {
  id: string;
  group: EvalCase["group"];
  passed: boolean;
  failedChecks: string[];
  error: string | null; // the model call itself failed
  reply: string;
  flags: string[];
  modelCalls: number;
  usage: AssistantReply["usage"];
};

const ZERO = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

export function toSeen(reply: AssistantReply): Seen {
  return {
    reply: reply.reply,
    products: reply.products.map((p) => ({
      name: p.name,
      price: p.price,
      category: p.category,
    })),
    whatsappUrl: reply.whatsappUrl,
    flags: reply.flags,
  };
}

export function gradeSeen(
  testCase: EvalCase,
  seen: Seen,
): { passed: boolean; failedChecks: string[] } {
  const failedChecks = testCase.checks
    .filter((check) => !check.test(seen))
    .map((check) => check.name);
  return { passed: failedChecks.length === 0, failedChecks };
}

export async function runCase(
  testCase: EvalCase,
  provider: AiProvider,
  tools: ToolDeps,
): Promise<CaseResult> {
  try {
    const answer = await runAssistant(
      [{ role: "user", content: testCase.ask }],
      { provider, tools },
    );
    const graded = gradeSeen(testCase, toSeen(answer));
    return {
      id: testCase.id,
      group: testCase.group,
      ...graded,
      error: null,
      reply: answer.reply,
      flags: answer.flags,
      modelCalls: answer.modelCalls,
      usage: answer.usage,
    };
  } catch (error) {
    return {
      id: testCase.id,
      group: testCase.group,
      passed: false,
      failedChecks: ["the model call failed"],
      error: error instanceof Error ? error.message : "unknown error",
      reply: "",
      flags: [],
      modelCalls: 0,
      usage: ZERO,
    };
  }
}

export type Summary = {
  total: number;
  passed: number;
  byGroup: Record<string, { passed: number; total: number }>;
  // Times a safety check threw the model's reply away. On cases where the right
  // answer needs no refusal, each one is a false reject: the customer got the
  // generic fallback instead of an answer.
  fallbackReplies: number;
  guardTrips: number; // cases where any safety check changed something
  averageModelCalls: number;
  tokens: AssistantReply["usage"];
};

export function summarise(results: CaseResult[]): Summary {
  const byGroup: Summary["byGroup"] = {};
  const tokens = { ...ZERO };
  let calls = 0;
  for (const r of results) {
    const g = (byGroup[r.group] ??= { passed: 0, total: 0 });
    g.total += 1;
    if (r.passed) g.passed += 1;
    tokens.inputTokens += r.usage.inputTokens;
    tokens.outputTokens += r.usage.outputTokens;
    tokens.cachedInputTokens += r.usage.cachedInputTokens;
    calls += r.modelCalls;
  }
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    byGroup,
    fallbackReplies: results.filter((r) => r.reply === FALLBACK_REPLY).length,
    guardTrips: results.filter((r) => r.flags.length > 0).length,
    averageModelCalls: results.length ? calls / results.length : 0,
    tokens,
  };
}
