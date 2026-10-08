import { describe, expect, it } from "vitest";
import { AI_LIMITS, EMBEDDING_DIMENSIONS, readAiConfig } from "@/lib/ai/config";
import { createOpenAiProvider, getAiProvider } from "@/lib/ai/provider";
import { ASSISTANT_OUTPUT_FORMAT, TOOL_DEFINITIONS } from "@/lib/ai/schemas";
import { AiProviderError, type AiErrorKind } from "@/lib/ai/types";

const KEY = "sk-test-SECRET-1234567890";

// A fake fetch: records every request and answers with whatever `handler` says.
function fakeFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; init: RequestInit; body: unknown }[] = [];
  const fetchImpl = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const request = init ?? {};
    const body =
      typeof request.body === "string" ? JSON.parse(request.body) : null;
    calls.push({ url: String(url), init: request, body });
    return handler(String(url), request);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function provider(fetchImpl: typeof fetch) {
  return createOpenAiProvider({
    apiKey: KEY,
    model: "test-model",
    embeddingModel: "test-embedder",
    reasoningEffort: "low",
    fetchImpl,
  });
}

const input = {
  instructions: "You are a shop assistant.",
  items: [{ type: "message" as const, role: "user" as const, text: "hi" }],
  tools: TOOL_DEFINITIONS,
  outputFormat: ASSISTANT_OUTPUT_FORMAT as never,
};

const textAnswer = (text: string) => ({
  status: "completed",
  output: [
    { type: "reasoning", id: "rs_1", summary: [] },
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text }],
    },
  ],
  usage: {
    input_tokens: 1000,
    output_tokens: 50,
    input_tokens_details: { cached_tokens: 800 },
  },
});

async function kindOf(
  promise: Promise<unknown>,
): Promise<AiErrorKind | "no error"> {
  try {
    await promise;
    return "no error";
  } catch (error) {
    if (error instanceof AiProviderError) return error.kind;
    throw error;
  }
}

describe("respond: the request we send", () => {
  it("sends the model, limits, strict tools and answer format", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(textAnswer("{}")));
    await provider(fetchImpl).respond(input);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0].init.method).toBe("POST");

    const body = calls[0].body as Record<string, unknown>;
    expect(body.model).toBe("test-model");
    expect(body.instructions).toBe("You are a shop assistant.");
    expect(body.store).toBe(false);
    expect(body.max_output_tokens).toBe(AI_LIMITS.maxOutputTokens);
    expect(body.reasoning).toEqual({ effort: "low" });

    const tools = body.tools as {
      type: string;
      strict: boolean;
      name: string;
    }[];
    expect(tools.map((t) => t.name)).toEqual(
      TOOL_DEFINITIONS.map((t) => t.name),
    );
    expect(tools.every((t) => t.type === "function" && t.strict === true)).toBe(
      true,
    );

    expect(body.text).toEqual({
      format: {
        type: "json_schema",
        name: ASSISTANT_OUTPUT_FORMAT.name,
        schema: ASSISTANT_OUTPUT_FORMAT.schema,
        strict: true,
      },
    });
  });

  it("keeps the key in the header only, never in the body", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(textAnswer("{}")));
    await provider(fetchImpl).respond(input);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.stringify(calls[0].body)).not.toContain(KEY);
  });

  it("omits tools and format when none are given", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(textAnswer("hi")));
    await provider(fetchImpl).respond({
      instructions: "x",
      items: input.items,
      tools: [],
    });
    const body = calls[0].body as Record<string, unknown>;
    expect("tools" in body).toBe(false);
    expect("text" in body).toBe(false);
  });

  it("maps the conversation: messages, passed-back output, tool results", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(textAnswer("{}")));
    const earlier = [
      {
        type: "function_call",
        call_id: "c1",
        name: "get_product",
        arguments: "{}",
      },
    ];
    await provider(fetchImpl).respond({
      instructions: "x",
      tools: [],
      items: [
        { type: "message", role: "user", text: "q" },
        { type: "provider_output", items: earlier },
        { type: "tool_result", callId: "c1", output: '{"products":[]}' },
      ],
    });
    expect((calls[0].body as { input: unknown[] }).input).toEqual([
      { role: "user", content: "q" },
      ...earlier,
      {
        type: "function_call_output",
        call_id: "c1",
        output: '{"products":[]}',
      },
    ]);
  });
});

describe("respond: reading the answer", () => {
  it("reads text and usage", async () => {
    const { fetchImpl } = fakeFetch(() => json(textAnswer('{"a":1}')));
    const turn = await provider(fetchImpl).respond(input);
    expect(turn.text).toBe('{"a":1}');
    expect(turn.toolCalls).toEqual([]);
    expect(turn.usage).toEqual({
      inputTokens: 1000,
      outputTokens: 50,
      cachedInputTokens: 800,
    });
    // Everything the model produced (even hidden reasoning) is kept to pass back.
    expect(turn.outputItems).toHaveLength(2);
  });

  it("reads tool calls", async () => {
    const { fetchImpl } = fakeFetch(() =>
      json({
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: "c1",
            name: "search_products",
            arguments: '{"query":"x"}',
          },
          {
            type: "function_call",
            call_id: "c2",
            name: "get_product",
            arguments: "{}",
          },
        ],
      }),
    );
    const turn = await provider(fetchImpl).respond(input);
    expect(turn.text).toBeNull();
    expect(turn.toolCalls).toEqual([
      { callId: "c1", name: "search_products", argumentsJson: '{"query":"x"}' },
      { callId: "c2", name: "get_product", argumentsJson: "{}" },
    ]);
    expect(turn.usage.inputTokens).toBe(0); // no usage block: zeros, not a crash
  });

  it("skips malformed output items instead of crashing", async () => {
    const { fetchImpl } = fakeFetch(() =>
      json({
        status: "completed",
        output: [
          null,
          5,
          "x",
          { type: "function_call", call_id: 7, name: "a", arguments: "{}" },
          { type: "message", content: "not an array" },
          { type: "message", content: [{ type: "output_text", text: "ok" }] },
        ],
      }),
    );
    const turn = await provider(fetchImpl).respond(input);
    expect(turn.text).toBe("ok");
    expect(turn.toolCalls).toEqual([]);
  });

  it.each([
    [
      "cut short (incomplete)",
      { status: "incomplete", output: [] },
      "bad_response",
    ],
    ["failed", { status: "failed", output: [] }, "bad_response"],
    ["empty", { status: "completed", output: [] }, "bad_response"],
    ["no output", { status: "completed" }, "bad_response"],
    ["an array", [], "bad_response"],
    ["null", null, "bad_response"],
    [
      "a refusal",
      {
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "I cannot help" }],
          },
        ],
      },
      "refused",
    ],
  ])("fails clearly when the answer is %s", async (_name, body, kind) => {
    const { fetchImpl } = fakeFetch(() => json(body));
    expect(await kindOf(provider(fetchImpl).respond(input))).toBe(kind);
  });

  it("fails clearly on an unreadable body", async () => {
    const { fetchImpl } = fakeFetch(
      () => new Response("<html>oops</html>", { status: 200 }),
    );
    expect(await kindOf(provider(fetchImpl).respond(input))).toBe(
      "bad_response",
    );
  });
});

describe("respond: failures from the provider", () => {
  it.each([
    [401, { error: { code: "invalid_api_key" } }, "auth"],
    [403, {}, "auth"],
    [429, { error: { code: "insufficient_quota" } }, "quota"],
    [429, { error: { code: "rate_limit_exceeded" } }, "rate_limited"],
    [429, "not json", "rate_limited"],
    [500, {}, "unavailable"],
    [503, { error: { message: "overloaded" } }, "unavailable"],
    [400, { error: { code: "invalid_request" } }, "bad_response"],
  ])("maps HTTP %s %j to %s", async (status, body, kind) => {
    const { fetchImpl } = fakeFetch(() =>
      typeof body === "string"
        ? new Response(body, { status })
        : json(body, status),
    );
    expect(await kindOf(provider(fetchImpl).respond(input))).toBe(kind);
  });

  it("never puts the key or the provider's message into the error", async () => {
    const { fetchImpl } = fakeFetch(() =>
      json(
        {
          error: {
            code: "invalid_api_key",
            message: `Incorrect API key: ${KEY}`,
          },
        },
        401,
      ),
    );
    try {
      await provider(fetchImpl).respond(input);
      throw new Error("should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(AiProviderError);
      const text = `${(error as Error).message} ${JSON.stringify(error)}`;
      expect(text).not.toContain(KEY);
      expect(text).not.toContain("Incorrect API key");
    }
  });

  it("reports a network failure as unavailable", async () => {
    const { fetchImpl } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    expect(await kindOf(provider(fetchImpl).respond(input))).toBe(
      "unavailable",
    );
  });

  it("reports a slow provider as a timeout", async () => {
    const { fetchImpl } = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    expect(
      await kindOf(provider(fetchImpl).respond(input, { timeoutMs: 20 })),
    ).toBe("timeout");
  });

  it("stops when the caller cancels", async () => {
    const controller = new AbortController();
    const { fetchImpl } = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const pending = kindOf(
      provider(fetchImpl).respond(input, { signal: controller.signal }),
    );
    controller.abort();
    expect(await pending).toBe("timeout");
  });
});

// A valid vector of the right size.
const vector = (first: number) => {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  v[0] = first;
  return v;
};

const embeddingsAnswer = (
  count: number,
  order: "forward" | "reversed" = "forward",
) => {
  const rows = Array.from({ length: count }, (_, i) => ({
    object: "embedding",
    index: i,
    embedding: vector(i + 1),
  }));
  return { object: "list", data: order === "reversed" ? rows.reverse() : rows };
};

describe("embed", () => {
  it("sends the model and the texts", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(embeddingsAnswer(2)));
    const vectors = await provider(fetchImpl).embed(["a", "b"]);
    expect(calls[0].url).toBe("https://api.openai.com/v1/embeddings");
    expect(calls[0].body).toEqual({
      model: "test-embedder",
      input: ["a", "b"],
      encoding_format: "float",
    });
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("returns vectors in input order even if the API does not", async () => {
    const { fetchImpl } = fakeFetch(() =>
      json(embeddingsAnswer(3, "reversed")),
    );
    const vectors = await provider(fetchImpl).embed(["a", "b", "c"]);
    expect(vectors.map((v) => v[0])).toEqual([1, 2, 3]);
  });

  it("splits a long list into batches and keeps the order", async () => {
    const { fetchImpl, calls } = fakeFetch((_url, init) => {
      const sent = (JSON.parse(init.body as string) as { input: string[] })
        .input;
      return json(embeddingsAnswer(sent.length));
    });
    const texts = Array.from({ length: 45 }, (_, i) => `text ${i}`);
    const vectors = await provider(fetchImpl).embed(texts);
    expect(
      calls.map((c) => (c.body as { input: string[] }).input.length),
    ).toEqual([
      AI_LIMITS.embedBatchSize,
      AI_LIMITS.embedBatchSize,
      45 - 2 * AI_LIMITS.embedBatchSize,
    ]);
    expect(vectors).toHaveLength(45);
  });

  it("does nothing for an empty list", async () => {
    const { fetchImpl, calls } = fakeFetch(() => json(embeddingsAnswer(0)));
    expect(await provider(fetchImpl).embed([])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  const dup = embeddingsAnswer(2);
  dup.data[1].index = 0;
  const short = embeddingsAnswer(2);
  short.data[1].embedding = [1, 2, 3];
  const nan = embeddingsAnswer(1);
  (nan.data[0].embedding as unknown[])[5] = "x";
  it.each([
    ["the wrong number of rows", embeddingsAnswer(1)],
    ["a repeated index", dup],
    ["a vector of the wrong size", short],
    ["a non-number in a vector", nan],
    ["no data", { object: "list" }],
    ["a row that is not an object", { data: [5] }],
  ])("refuses an answer with %s", async (_name, body) => {
    const { fetchImpl } = fakeFetch(() => json(body));
    expect(await kindOf(provider(fetchImpl).embed(["a", "b"]))).toBe(
      "bad_response",
    );
  });

  it("maps provider failures the same way as respond", async () => {
    const { fetchImpl } = fakeFetch(() =>
      json({ error: { code: "insufficient_quota" } }, 429),
    );
    expect(await kindOf(provider(fetchImpl).embed(["a"]))).toBe("quota");
  });
});

describe("getAiProvider", () => {
  it("refuses to run without a key", () => {
    const config = readAiConfig({ AI_ASSISTANT_ENABLED: "true" });
    expect(() => getAiProvider(config)).toThrowError(AiProviderError);
  });

  it("returns the built-in fake for AI_PROVIDER=mock, with no key needed", async () => {
    const mock = getAiProvider(readAiConfig({ AI_PROVIDER: "mock" }));
    const [vector] = await mock.embed(["hello"]);
    expect(vector).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("returns a working provider when a key is set", () => {
    const real = getAiProvider(readAiConfig({ OPENAI_API_KEY: KEY }));
    expect(typeof real.respond).toBe("function");
    expect(typeof real.embed).toBe("function");
  });
});
