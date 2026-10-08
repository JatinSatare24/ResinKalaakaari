import { describe, expect, it } from "vitest";
import { AI_LIMITS } from "@/lib/ai/config";
import { buildEmbeddingText, contentHash } from "@/lib/ai/embeddings";

describe("buildEmbeddingText", () => {
  it("joins name, category and description", () => {
    expect(
      buildEmbeddingText({
        name: "Resin Clock",
        categoryName: "Clocks",
        description: "A handmade clock.",
      }),
    ).toBe("Resin Clock\nClocks\nA handmade clock.");
  });

  it("skips missing parts", () => {
    expect(
      buildEmbeddingText({
        name: "Plate",
        categoryName: null,
        description: null,
      }),
    ).toBe("Plate");
  });

  it("strips hidden characters and caps the length", () => {
    const text = buildEmbeddingText({
      name: "Pla​te",
      categoryName: null,
      description: "word ".repeat(2000),
    });
    expect(text).not.toContain("​");
    expect(text.length).toBeLessThanOrEqual(AI_LIMITS.maxEmbeddingTextChars);
  });
});

describe("contentHash", () => {
  it("is 64 lowercase hex characters, stable, and changes with the text", () => {
    const a = contentHash("hello");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(contentHash("hello")).toBe(a);
    expect(contentHash("hello!")).not.toBe(a);
  });

  it("matches the known SHA-256 of 'abc'", () => {
    expect(contentHash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
