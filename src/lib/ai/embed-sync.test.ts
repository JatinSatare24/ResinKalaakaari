import { describe, expect, it, vi } from "vitest";
import { contentHash, buildEmbeddingText } from "@/lib/ai/embeddings";
import {
  rebuildSearchIndex,
  syncProductEmbedding,
  type EmbedSyncDeps,
} from "@/lib/ai/embed-sync";
import type { EmbedProduct } from "@/lib/data/admin-embeddings";

const A: EmbedProduct = {
  id: "a",
  name: "Clock",
  categoryName: "Clocks",
  description: "Round clock",
};
const B: EmbedProduct = {
  id: "b",
  name: "Plate",
  categoryName: "Plates",
  description: "Name plate",
};
const hashOf = (p: EmbedProduct) =>
  contentHash(
    buildEmbeddingText({
      name: p.name,
      categoryName: p.categoryName,
      description: p.description,
    }),
  );

function makeDeps(overrides: Partial<EmbedSyncDeps> = {}): EmbedSyncDeps {
  return {
    getProduct: vi.fn(async (id: string) =>
      id === "a" ? A : id === "b" ? B : null,
    ),
    listProducts: vi.fn(async () => [A, B]),
    listHashes: vi.fn(async () => new Map<string, string>()),
    setEmbedding: vi.fn(async () => {}),
    embed: vi.fn(async (texts: string[]) => texts.map(() => [1, 2, 3])),
    log: vi.fn(),
    ...overrides,
  };
}

describe("syncProductEmbedding", () => {
  it("embeds the product's text and stores it with that text's hash", async () => {
    const deps = makeDeps();
    expect(await syncProductEmbedding("a", deps)).toBe("updated");
    expect(deps.embed).toHaveBeenCalledWith(["Clock\nClocks\nRound clock"], {
      timeoutMs: 4000,
    });
    expect(deps.setEmbedding).toHaveBeenCalledWith("a", [1, 2, 3], hashOf(A));
  });

  it("never throws: a provider failure is reported as 'failed'", async () => {
    const deps = makeDeps({
      embed: vi.fn(async () => {
        throw new Error("quota sk-secret");
      }),
    });
    expect(await syncProductEmbedding("a", deps)).toBe("failed");
    expect(JSON.stringify(vi.mocked(deps.log).mock.calls)).not.toContain(
      "sk-secret",
    );
    expect(deps.setEmbedding).not.toHaveBeenCalled();
  });

  it("reports a missing product or a failed store as 'failed'", async () => {
    expect(await syncProductEmbedding("zzz", makeDeps())).toBe("failed");
    const deps = makeDeps({
      setEmbedding: vi.fn(async () => {
        throw new Error("db");
      }),
    });
    expect(await syncProductEmbedding("a", deps)).toBe("failed");
  });
});

describe("rebuildSearchIndex", () => {
  it("embeds everything on a first run, in one provider call", async () => {
    const deps = makeDeps();
    expect(await rebuildSearchIndex(deps)).toEqual({
      total: 2,
      updated: 2,
      unchanged: 0,
      failed: 0,
    });
    expect(deps.embed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.embed).mock.calls[0][0]).toHaveLength(2);
  });

  it("skips products whose stored hash still matches (a second press is free)", async () => {
    const deps = makeDeps({
      listHashes: vi.fn(
        async () =>
          new Map([
            ["a", hashOf(A)],
            ["b", hashOf(B)],
          ]),
      ),
    });
    expect(await rebuildSearchIndex(deps)).toEqual({
      total: 2,
      updated: 0,
      unchanged: 2,
      failed: 0,
    });
    expect(deps.embed).not.toHaveBeenCalled();
  });

  it("re-embeds only the product whose text changed", async () => {
    const deps = makeDeps({
      listHashes: vi.fn(
        async () =>
          new Map([
            ["a", "old-hash"],
            ["b", hashOf(B)],
          ]),
      ),
    });
    const result = await rebuildSearchIndex(deps);
    expect(result).toEqual({ total: 2, updated: 1, unchanged: 1, failed: 0 });
    expect(deps.setEmbedding).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.setEmbedding).mock.calls[0][0]).toBe("a");
  });

  it("counts a provider failure for every stale product, without throwing", async () => {
    const deps = makeDeps({
      embed: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    expect(await rebuildSearchIndex(deps)).toEqual({
      total: 2,
      updated: 0,
      unchanged: 0,
      failed: 2,
    });
  });

  it("keeps going when one store fails", async () => {
    let n = 0;
    const deps = makeDeps({
      setEmbedding: vi.fn(async () => {
        if (n++ === 0) throw new Error("db");
      }),
    });
    expect(await rebuildSearchIndex(deps)).toEqual({
      total: 2,
      updated: 1,
      unchanged: 0,
      failed: 1,
    });
  });
});
