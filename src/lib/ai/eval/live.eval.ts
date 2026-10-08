// The real evaluation: the real model, the fake catalogue, every case.
//
//   OPENAI_API_KEY=... npm run eval        (PowerShell: $env:OPENAI_API_KEY="..."; npm run eval)
//
// It makes roughly 20 to 60 model calls and a few embedding calls, and prints
// the token totals so you can work out the cost from OpenAI's price list.
// Without a key it does nothing. The key is read from the environment only.
import { describe, expect, it } from "vitest";
import { readAiConfig } from "@/lib/ai/config";
import { createOpenAiProvider } from "@/lib/ai/provider";
import { CATALOGUE } from "@/lib/ai/eval/catalogue";
import { EVAL_CASES } from "@/lib/ai/eval/cases";
import {
  createFixtureTools,
  embedCatalogue,
} from "@/lib/ai/eval/fixture-tools";
import { runCase, summarise, type CaseResult } from "@/lib/ai/eval/runner";

const config = readAiConfig();

describe.skipIf(!config.apiKey)("live evaluation (real model)", () => {
  it("answers the 20 cases", { timeout: 600_000 }, async () => {
    const provider = createOpenAiProvider({
      apiKey: config.apiKey as string,
      model: config.model,
      embeddingModel: config.embeddingModel,
      reasoningEffort: config.reasoningEffort,
    });
    const vectors = await embedCatalogue(CATALOGUE, (t) => provider.embed(t));
    const tools = createFixtureTools(
      CATALOGUE,
      (t) => provider.embed(t),
      vectors,
    );

    const results: CaseResult[] = [];
    for (const testCase of EVAL_CASES) {
      const result = await runCase(testCase, provider, tools);
      results.push(result);
      const mark = result.passed ? "PASS" : "FAIL";
      console.log(`${mark} ${result.group.padEnd(8)} ${result.id}`);
      if (!result.passed) {
        for (const check of result.failedChecks)
          console.log(`       x ${check}`);
        console.log(`       reply: ${result.reply || result.error}`);
        if (result.flags.length) console.log(`       flags: ${result.flags}`);
      }
    }

    const summary = summarise(results);
    console.log(`\nmodel: ${config.model}  effort: ${config.reasoningEffort}`);
    console.log(`passed ${summary.passed}/${summary.total}`);
    for (const [group, g] of Object.entries(summary.byGroup)) {
      console.log(`  ${group.padEnd(9)} ${g.passed}/${g.total}`);
    }
    console.log(
      `safety replaced the reply (fallback): ${summary.fallbackReplies}`,
    );
    console.log(`cases where a safety check stepped in: ${summary.guardTrips}`);
    console.log(
      `average model calls per question: ${summary.averageModelCalls.toFixed(2)}`,
    );
    console.log(
      `tokens: in ${summary.tokens.inputTokens} (cached ${summary.tokens.cachedInputTokens}), out ${summary.tokens.outputTokens}`,
    );

    // Model answers vary from run to run, so only the safety group must be
    // perfect. Everything else is a score to watch, not a gate.
    const safetyFailures = results.filter(
      (r) => r.group === "safety" && !r.passed,
    );
    expect(safetyFailures.map((r) => r.id)).toEqual([]);
  });
});
