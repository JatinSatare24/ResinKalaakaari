import { describe, expect, it, vi } from "vitest";
import { runTool, type ToolDeps } from "@/lib/ai/tools";
import type { AiProductRow } from "@/lib/data/ai-products";

const ROW: AiProductRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Resin Clock",
  slug: "resin-clock",
  price: 1200,
  category: "Clocks",
  description: "A handmade clock.",
};

function makeDeps(overrides: Partial<ToolDeps> = {}): ToolDeps {
  return {
    searchProducts: vi.fn(async () => [ROW]),
    matchProducts: vi.fn(async () => [ROW]),
    getProductById: vi.fn(async () => ROW),
    embed: vi.fn(async () => [0.1, 0.2]),
    ...overrides,
  };
}

const call = (name: string, args: unknown) => ({
  callId: "c1",
  name,
  argumentsJson: JSON.stringify(args),
});

describe("runTool", () => {
  it("search_products passes validated arguments and hides the slug from the model", async () => {
    const deps = makeDeps();
    const run = await runTool(
      call("search_products", {
        query: "clock",
        category_slug: null,
        max_price: 2000,
      }),
      deps,
    );
    expect(deps.searchProducts).toHaveBeenCalledWith({
      query: "clock",
      categorySlug: null,
      maxPrice: 2000,
    });
    const seen = JSON.parse(run.output);
    expect(seen.products[0]).toEqual({
      id: ROW.id,
      name: ROW.name,
      price: 1200,
      category: "Clocks",
      description: ROW.description,
    });
    expect(run.output).not.toContain("slug");
    expect(run.products).toEqual([ROW]); // our code keeps the full row
  });

  it("find_similar_products embeds the description, then matches", async () => {
    const deps = makeDeps();
    await runTool(
      call("find_similar_products", { description: "a wedding gift" }),
      deps,
    );
    expect(deps.embed).toHaveBeenCalledWith("a wedding gift", undefined);
    expect(deps.matchProducts).toHaveBeenCalledWith([0.1, 0.2]);
  });

  it("get_product returns an empty list for an unknown id", async () => {
    const deps = makeDeps({ getProductById: vi.fn(async () => null) });
    const run = await runTool(
      call("get_product", { product_id: ROW.id }),
      deps,
    );
    expect(JSON.parse(run.output)).toEqual({ products: [] });
  });

  it("refuses bad arguments without touching the database", async () => {
    const deps = makeDeps();
    for (const bad of [
      call("search_products", {
        query: 5,
        category_slug: null,
        max_price: null,
      }),
      call("get_product", { product_id: "'; drop table products;--" }),
      call("delete_everything", {}),
      { callId: "c", name: "search_products", argumentsJson: "{not json" },
    ]) {
      const run = await runTool(bad, deps);
      expect(JSON.parse(run.output)).toHaveProperty("error");
      expect(run.products).toEqual([]);
    }
    expect(deps.searchProducts).not.toHaveBeenCalled();
    expect(deps.getProductById).not.toHaveBeenCalled();
  });

  it("tells the model why a call was refused, so it can fix it", async () => {
    const run = await runTool(
      { callId: "c", name: "search_products", argumentsJson: "{not json" },
      makeDeps(),
    );
    expect(JSON.parse(run.output)).toEqual({
      error: "arguments are not valid JSON",
    });
  });

  it("turns a database failure into a generic tool error (no details leak)", async () => {
    const deps = makeDeps({
      searchProducts: vi.fn(async () => {
        throw new Error("connection to db.secret-host.supabase.co refused");
      }),
    });
    const run = await runTool(
      call("search_products", {
        query: "x1",
        category_slug: null,
        max_price: null,
      }),
      deps,
    );
    expect(JSON.parse(run.output)).toEqual({
      error: "this lookup is not available right now",
    });
    expect(run.output).not.toContain("secret-host");
  });
});
