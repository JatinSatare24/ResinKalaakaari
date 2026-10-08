// Runs the model's tool requests. The model can only READ: three lookups, all
// through typed functions with validated arguments. There is no tool that
// writes, sends or pays, so a confused or tricked model has nothing dangerous
// to reach for.
//
// The database functions arrive as `deps`, so tests run this with fakes and
// the live wiring (live-deps.ts) passes the real ones.
import type { AiProductRow } from "@/lib/data/ai-products";
import { parseToolArguments, type ToolResult } from "@/lib/ai/schemas";
import type { ToolCall } from "@/lib/ai/types";

export type ToolDeps = {
  searchProducts(args: {
    query: string | null;
    categorySlug: string | null;
    maxPrice: number | null;
  }): Promise<AiProductRow[]>;
  matchProducts(embedding: number[]): Promise<AiProductRow[]>;
  getProductById(id: string): Promise<AiProductRow | null>;
  embed(text: string, signal?: AbortSignal): Promise<number[]>;
};

export type ToolRun = {
  output: string; // JSON text handed back to the model
  products: AiProductRow[]; // the full rows, kept by our code (never the model)
};

// What the model sees: no slug (it has no use for it) and a trimmed
// description. Our code keeps the full rows to draw the product list.
function forModel(rows: AiProductRow[]): ToolResult {
  return {
    products: rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      description: row.description,
    })),
  };
}

function failure(message: string): ToolRun {
  const result: ToolResult = { error: message };
  return { output: JSON.stringify(result), products: [] };
}

export async function runTool(
  call: ToolCall,
  deps: ToolDeps,
  signal?: AbortSignal,
): Promise<ToolRun> {
  const parsed = parseToolArguments(call.name, call.argumentsJson);
  if (!parsed.ok) return failure(parsed.reason);

  try {
    let rows: AiProductRow[];
    const request = parsed.call;
    if (request.name === "search_products") {
      rows = await deps.searchProducts(request.args);
    } else if (request.name === "find_similar_products") {
      const embedding = await deps.embed(request.args.description, signal);
      rows = await deps.matchProducts(embedding);
    } else {
      const row = await deps.getProductById(request.args.productId);
      rows = row ? [row] : [];
    }
    return { output: JSON.stringify(forModel(rows)), products: rows };
  } catch {
    // Details stay on the server. The model just learns this lookup failed.
    return failure("this lookup is not available right now");
  }
}
