import { describe, expect, it, vi } from "vitest";

// A fake query builder that records what was asked and returns canned rows.
const calls: [string, ...unknown[]][] = [];
let result: { data: unknown; error: { message: string } | null } = {
  data: [],
  error: null,
};
const builder: Record<string, unknown> = {};
for (const name of ["select", "eq", "lte", "or", "order", "limit"]) {
  builder[name] = (...args: unknown[]) => {
    calls.push([name, ...args]);
    return builder;
  };
}
builder.maybeSingle = async () => result;
builder.then = (resolve: (value: unknown) => unknown) => resolve(result);

vi.mock("@/lib/server", () => ({
  createServerSupabaseClient: async () => ({
    from: () => builder,
    rpc: async (name: string, args: unknown) => {
      calls.push(["rpc", name, args]);
      return result;
    },
  }),
}));

import {
  getProductById,
  matchProducts,
  searchProducts,
  searchWords,
} from "@/lib/data/ai-products";

const RAW = {
  id: "1",
  name: "Clock",
  slug: "clock",
  price: "1200",
  description: "x".repeat(500),
  categories: { name: "Clocks", slug: "clocks" },
};

function reset(data: unknown, error: { message: string } | null = null) {
  calls.length = 0;
  result = { data, error };
}

describe("searchWords", () => {
  it("lowercases, drops filler and one-letter words, and caps the count", () => {
    expect(searchWords("The Resin Clock for a gift")).toEqual([
      "resin",
      "clock",
      "gift",
    ]);
    expect(searchWords("a b c")).toEqual([]);
    expect(searchWords("one two three four five six seven eight")).toHaveLength(
      6,
    );
  });

  it("removes characters that would break a PostgREST filter", () => {
    const words = searchWords('clock,description.ilike.%x%) or (name.eq."y"');
    for (const word of words) expect(word).not.toMatch(/[,()%"*]/);
  });
});

describe("searchProducts", () => {
  it("adds one name-or-description filter per word, a price cap and a limit of 5", async () => {
    reset([RAW]);
    const rows = await searchProducts({
      query: "resin clock",
      categorySlug: null,
      maxPrice: 2000,
    });
    expect(calls.filter(([n]) => n === "or").map((c) => c[1])).toEqual([
      "name.ilike.%resin%,description.ilike.%resin%",
      "name.ilike.%clock%,description.ilike.%clock%",
    ]);
    expect(calls).toContainEqual(["lte", "price", 2000]);
    expect(calls).toContainEqual(["limit", 5]);
    expect(rows[0]).toMatchObject({ price: 1200, category: "Clocks" });
    expect(rows[0].description.length).toBeLessThanOrEqual(200);
  });

  it("joins the category only when asked to filter by it", async () => {
    reset([]);
    await searchProducts({
      query: null,
      categorySlug: "clocks",
      maxPrice: null,
    });
    expect(String(calls[0][1])).toContain("categories!inner");
    expect(calls).toContainEqual(["eq", "categories.slug", "clocks"]);

    reset([]);
    await searchProducts({ query: null, categorySlug: null, maxPrice: null });
    expect(String(calls[0][1])).not.toContain("!inner");
  });

  it("throws on a database error", async () => {
    reset(null, { message: "boom" });
    await expect(
      searchProducts({ query: null, categorySlug: null, maxPrice: null }),
    ).rejects.toThrow("searchProducts failed");
  });
});

describe("matchProducts and getProductById", () => {
  it("calls the match function and maps its rows", async () => {
    reset([
      {
        id: "1",
        name: "Clock",
        slug: "clock",
        price: 1200,
        description: "d",
        category_name: "Clocks",
        similarity: 0.9,
      },
    ]);
    const rows = await matchProducts([0.1, 0.2]);
    expect(calls[0]).toEqual([
      "rpc",
      "match_products",
      { query_embedding: [0.1, 0.2], match_count: 5 },
    ]);
    expect(rows[0]).toEqual({
      id: "1",
      name: "Clock",
      slug: "clock",
      price: 1200,
      category: "Clocks",
      description: "d",
    });
  });

  it("returns null for an unknown id", async () => {
    reset(null);
    expect(await getProductById("x")).toBeNull();
  });

  it("accepts a category that arrives as a list", async () => {
    reset({ ...RAW, categories: [{ name: "Clocks", slug: "clocks" }] });
    expect((await getProductById("1"))?.category).toBe("Clocks");
  });
});
