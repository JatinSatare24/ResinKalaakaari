import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai/config";
import {
  answerJson,
  cosine,
  createDemoProvider,
  createScriptedProvider,
  fakeEmbedding,
  textTurn,
  toolTurn,
} from "@/lib/ai/mock-provider";
import { parseAssistantOutput, parseToolArguments } from "@/lib/ai/schemas";
import { AiProviderError, type RespondInput } from "@/lib/ai/types";

const ID_A = "11111111-1111-4111-8111-111111111111";

const ask = (text: string): RespondInput => ({
  instructions: "x",
  tools: [],
  items: [{ type: "message", role: "user", text }],
});

describe("fakeEmbedding", () => {
  it("returns a unit vector of the right size, for any text", () => {
    for (const text of ["wedding gift", "", "   ", "₹₹₹", "a".repeat(10_000)]) {
      const v = fakeEmbedding(text);
      expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(Math.sqrt(v.reduce((s, n) => s + n * n, 0))).toBeCloseTo(1, 6);
    }
  });

  it("puts texts that share words closer together", () => {
    const query = fakeEmbedding("a gift for a wedding");
    const wedding = fakeEmbedding(
      "Varmala frame, a keepsake for your wedding gift",
    );
    const keychain = fakeEmbedding("Small resin keychain with initials");
    expect(cosine(query, wedding)).toBeGreaterThan(cosine(query, keychain));
  });

  it("gives the same vector for the same text", () => {
    expect(fakeEmbedding("same")).toEqual(fakeEmbedding("same"));
  });
});

describe("createScriptedProvider", () => {
  it("plays the script in order and records what it was sent", async () => {
    const { provider, respondCalls } = createScriptedProvider([
      toolTurn([{ name: "search_products", args: { query: "x" } }]),
      textTurn(answerJson("done", [ID_A])),
    ]);
    const first = await provider.respond(ask("one"));
    expect(first.toolCalls[0].name).toBe("search_products");
    expect(JSON.parse(first.toolCalls[0].argumentsJson)).toEqual({
      query: "x",
    });

    const second = await provider.respond(ask("two"));
    expect(parseAssistantOutput(second.text ?? "").ok).toBe(true);

    expect(
      respondCalls.map((c) => (c.items[0] as { text: string }).text),
    ).toEqual(["one", "two"]);
  });

  it("throws a scripted provider error", async () => {
    const { provider } = createScriptedProvider([
      new AiProviderError("quota", "balance used up"),
    ]);
    await expect(provider.respond(ask("hi"))).rejects.toMatchObject({
      kind: "quota",
    });
  });

  it("lets a step look at the request", async () => {
    const { provider } = createScriptedProvider([
      (input) => textTurn(`${input.items.length} items`),
    ]);
    expect((await provider.respond(ask("hi"))).text).toBe("1 items");
  });

  it("fails loudly when the script runs out", async () => {
    const { provider } = createScriptedProvider([]);
    await expect(provider.respond(ask("hi"))).rejects.toThrow("ran out");
  });

  it("records embedding calls and returns valid vectors", async () => {
    const { provider, embedCalls } = createScriptedProvider([]);
    const vectors = await provider.embed(["a", "b"]);
    expect(embedCalls).toEqual([["a", "b"]]);
    expect(vectors).toHaveLength(2);
  });
});

describe("createDemoProvider", () => {
  it("turns a budget question into a search with that max price", async () => {
    const turn = await createDemoProvider().respond(
      ask("nameplates under ₹1,500"),
    );
    expect(turn.toolCalls).toHaveLength(1);
    const parsed = parseToolArguments(
      turn.toolCalls[0].name,
      turn.toolCalls[0].argumentsJson,
    );
    expect(parsed).toEqual({
      ok: true,
      call: {
        name: "search_products",
        args: { query: null, categorySlug: null, maxPrice: 1500 },
      },
    });
  });

  it("turns an open gift question into a meaning search", async () => {
    const turn = await createDemoProvider().respond(
      ask("a gift for my sister's wedding"),
    );
    expect(turn.toolCalls[0].name).toBe("find_similar_products");
    expect(
      parseToolArguments(
        turn.toolCalls[0].name,
        turn.toolCalls[0].argumentsJson,
      ).ok,
    ).toBe(true);
  });

  it("falls back to a word search", async () => {
    const turn = await createDemoProvider().respond(ask("clock"));
    expect(turn.toolCalls[0].name).toBe("search_products");
    expect(
      parseToolArguments(
        turn.toolCalls[0].name,
        turn.toolCalls[0].argumentsJson,
      ).ok,
    ).toBe(true);
  });

  it("answers from the rows once a tool has run", async () => {
    const input: RespondInput = {
      ...ask("under 1000"),
      items: [
        { type: "message", role: "user", text: "under 1000" },
        {
          type: "tool_result",
          callId: "demo-1",
          output: JSON.stringify({ products: [{ id: ID_A }] }),
        },
      ],
    };
    const turn = await createDemoProvider().respond(input);
    expect(turn.toolCalls).toEqual([]);
    const parsed = parseAssistantOutput(turn.text ?? "");
    expect(parsed.ok && parsed.value.productIds).toEqual([ID_A]);
  });

  it("says so when the tool found nothing, and survives garbage tool output", async () => {
    const input: RespondInput = {
      ...ask("x"),
      items: [
        { type: "message", role: "user", text: "x" },
        { type: "tool_result", callId: "demo-1", output: "not json" },
        {
          type: "tool_result",
          callId: "demo-2",
          output: JSON.stringify({ error: "bad" }),
        },
      ],
    };
    const turn = await createDemoProvider().respond(input);
    const parsed = parseAssistantOutput(turn.text ?? "");
    expect(parsed.ok && parsed.value.productIds).toEqual([]);
  });

  it("answers policy questions with no tool", async () => {
    const turn = await createDemoProvider().respond(
      ask("how long is shipping?"),
    );
    expect(turn.toolCalls).toEqual([]);
    expect(parseAssistantOutput(turn.text ?? "").ok).toBe(true);
  });

  it("turns a custom request into an owner hand-off", async () => {
    const turn = await createDemoProvider().respond(
      ask("I want a custom nameplate for my dad"),
    );
    const parsed = parseAssistantOutput(turn.text ?? "");
    expect(parsed.ok && parsed.value.handoffSummary).toContain(
      "custom nameplate",
    );
  });
});
