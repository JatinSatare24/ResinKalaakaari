import { describe, expect, it, vi } from "vitest";
import { AI_LIMITS } from "@/lib/ai/config";
import { handleChat, type ChatDeps } from "@/lib/ai/handle-chat";
import { AiProviderError } from "@/lib/ai/types";

const GOOD_REPLY = {
  reply: "Hello!",
  products: [],
  whatsappUrl: null,
  flags: [],
  modelCalls: 1,
  usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
};

function makeDeps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    available: true,
    gateSecret: "test-secret",
    checkRateLimit: vi.fn(async () => "ok" as const),
    runAssistant: vi.fn(async () => GOOD_REPLY),
    log: vi.fn(),
    ...overrides,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://shop.example/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const hello = { messages: [{ role: "user", content: "hi" }] };

async function status(request: Request, deps: ChatDeps) {
  const response = await handleChat(request, deps);
  return { status: response.status, body: await response.json() };
}

describe("handleChat", () => {
  it("answers a good request and never caches it", async () => {
    const deps = makeDeps();
    const response = await handleChat(post(hello), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      reply: "Hello!",
      products: [],
      whatsappUrl: null,
    });
  });

  it("is a 503 when the assistant is off, and does no work", async () => {
    const deps = makeDeps({ available: false });
    expect((await status(post(hello), deps)).status).toBe(503);
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
    expect(deps.runAssistant).not.toHaveBeenCalled();
  });

  it("refuses a request from another site", async () => {
    const deps = makeDeps();
    const result = await status(
      post(hello, { origin: "https://evil.example", host: "shop.example" }),
      deps,
    );
    expect(result.status).toBe(403);
    expect(deps.runAssistant).not.toHaveBeenCalled();
  });

  it("accepts the shop's own origin, and refuses a malformed one", async () => {
    const same = post(hello, {
      origin: "https://shop.example",
      host: "shop.example",
    });
    expect((await status(same, makeDeps())).status).toBe(200);
    const junk = post(hello, { origin: "not a url" });
    expect((await status(junk, makeDeps())).status).toBe(403);
  });

  it("refuses an oversized body before parsing or counting it", async () => {
    const deps = makeDeps();
    const big = JSON.stringify({
      messages: [
        { role: "user", content: "x".repeat(AI_LIMITS.maxRequestBodyChars) },
      ],
    });
    expect((await status(post(big), deps)).status).toBe(413);
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
  });

  it("refuses a declared-too-large body without reading it", async () => {
    const deps = makeDeps();
    const request = post(hello, {
      "content-length": String(AI_LIMITS.maxRequestBodyChars + 1),
    });
    expect((await status(request, deps)).status).toBe(413);
  });

  it("returns 400 for bad JSON and for invalid chat shapes", async () => {
    const deps = makeDeps();
    expect((await status(post("{nope"), deps)).status).toBe(400);
    expect(
      (
        await status(
          post({ messages: [{ role: "system", content: "x" }] }),
          deps,
        )
      ).status,
    ).toBe(400);
    expect((await status(post({ messages: [] }), deps)).body.error).toBe(
      "empty",
    );
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
  });

  it("answers 429 slow_down for one visitor and 429 busy for the whole shop", async () => {
    const hour = makeDeps({
      checkRateLimit: vi.fn(async () => "ip_hour" as const),
    });
    expect((await status(post(hello), hour)).body.error).toBe("slow_down");
    const day = makeDeps({
      checkRateLimit: vi.fn(async () => "ip_day" as const),
    });
    expect((await status(post(hello), day)).body.error).toBe("slow_down");
    const all = makeDeps({
      checkRateLimit: vi.fn(async () => "global_day" as const),
    });
    const result = await status(post(hello), all);
    expect(result.status).toBe(429);
    expect(result.body.error).toBe("busy");
    expect(all.runAssistant).not.toHaveBeenCalled();
  });

  it("fails closed when the rate limiter breaks", async () => {
    const deps = makeDeps({
      checkRateLimit: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    expect((await status(post(hello), deps)).status).toBe(503);
    expect(deps.runAssistant).not.toHaveBeenCalled();
  });

  it("hashes the visitor's address before it reaches the limiter", async () => {
    const deps = makeDeps();
    await handleChat(
      post(hello, { "x-vercel-forwarded-for": "203.0.113.5" }),
      deps,
    );
    const key = vi.mocked(deps.checkRateLimit).mock.calls[0][0];
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.5");
  });

  it("turns any assistant failure into a plain 503 with no details", async () => {
    for (const error of [
      new AiProviderError(
        "quota",
        "OpenAI request failed (429 insufficient_quota)",
      ),
      new Error("secret internal detail sk-abc"),
    ]) {
      const deps = makeDeps({
        runAssistant: vi.fn(async () => {
          throw error;
        }),
      });
      const response = await handleChat(post(hello), deps);
      const text = await response.text();
      expect(response.status).toBe(503);
      expect(text).toBe('{"error":"unavailable"}');
    }
  });

  it("logs counts and flags but never the question or the answer", async () => {
    const deps = makeDeps();
    await handleChat(
      post({ messages: [{ role: "user", content: "my secret question" }] }),
      deps,
    );
    const logged = JSON.stringify(vi.mocked(deps.log).mock.calls);
    expect(logged).not.toContain("secret question");
    expect(logged).not.toContain("Hello!");
  });
});
