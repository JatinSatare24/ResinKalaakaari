// The chat endpoint's logic, with every outside thing passed in (`deps`) so the
// tests can run it with fakes. The route file is a thin wrapper around this.
//
// Order of checks, cheapest first, and nothing reaches the model (the only
// part that costs money) until all of them pass:
//   1. is the assistant switched on and configured?
//   2. did the request come from our own site?       (Origin check)
//   3. is the body a sane size and valid?
//   4. is this visitor, and the shop, under the rate limit?
//
// Failing closed: if the rate limiter itself errors, the answer is "no", never
// "go ahead unlimited".
import { AI_LIMITS } from "@/lib/ai/config";
import { parseChatRequest, type ChatMessage } from "@/lib/ai/schemas";
import type { AssistantReply } from "@/lib/ai/assistant";
import { AiProviderError } from "@/lib/ai/types";
import { clientIp, visitorKey } from "@/lib/ai/visitor-key";
import type { RateLimitVerdict } from "@/lib/data/ai-rate-limit";

export type ChatDeps = {
  available: boolean;
  gateSecret: string;
  checkRateLimit(key: string): Promise<RateLimitVerdict>;
  runAssistant(messages: ChatMessage[]): Promise<AssistantReply>;
  // Safe to log: never contains the question, the answer or any key.
  log(event: string, detail?: Record<string, unknown>): void;
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// A browser always sends Origin on a cross-site POST. If it is there and is
// not our own host, refuse. (A missing Origin comes from tools like curl, which
// the rate limit covers anyway.)
function isSameSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleChat(
  request: Request,
  deps: ChatDeps,
): Promise<Response> {
  if (!deps.available) return reply(503, { error: "unavailable" });
  if (!isSameSite(request)) return reply(403, { error: "forbidden" });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > AI_LIMITS.maxRequestBodyChars) {
    return reply(413, { error: "too_large" });
  }
  const text = await request.text();
  if (text.length > AI_LIMITS.maxRequestBodyChars) {
    return reply(413, { error: "too_large" });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400, { error: "invalid" });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) return reply(400, { error: parsed.reason });

  const key = visitorKey(clientIp(request.headers), deps.gateSecret);
  let verdict: RateLimitVerdict;
  try {
    verdict = await deps.checkRateLimit(key);
  } catch {
    deps.log("rate_limit_error");
    return reply(503, { error: "unavailable" });
  }
  if (verdict === "global_day") {
    deps.log("rate_limited", { verdict });
    return reply(429, { error: "busy" });
  }
  if (verdict !== "ok") {
    deps.log("rate_limited", { verdict });
    return reply(429, { error: "slow_down" });
  }

  try {
    const result = await deps.runAssistant(parsed.messages);
    deps.log("answered", {
      modelCalls: result.modelCalls,
      flags: result.flags,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cachedInputTokens: result.usage.cachedInputTokens,
    });
    return reply(200, {
      reply: result.reply,
      products: result.products,
      whatsappUrl: result.whatsappUrl,
    });
  } catch (error) {
    deps.log("assistant_failed", {
      kind: error instanceof AiProviderError ? error.kind : "unexpected",
    });
    return reply(503, { error: "unavailable" });
  }
}
