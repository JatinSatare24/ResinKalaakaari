import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_REASONING_EFFORT,
  isAiAvailable,
  readAiConfig,
} from "@/lib/ai/config";

describe("readAiConfig", () => {
  it("is off when nothing is set", () => {
    const config = readAiConfig({});
    expect(config.enabled).toBe(false);
    expect(config.apiKey).toBeNull();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe(DEFAULT_CHAT_MODEL);
    expect(config.embeddingModel).toBe(DEFAULT_EMBEDDING_MODEL);
    expect(config.reasoningEffort).toBe(DEFAULT_REASONING_EFFORT);
  });

  it("turns on only for the exact text 'true'", () => {
    expect(readAiConfig({ AI_ASSISTANT_ENABLED: "true" }).enabled).toBe(true);
    for (const value of ["TRUE", "1", "yes", " true", "false", ""]) {
      expect(readAiConfig({ AI_ASSISTANT_ENABLED: value }).enabled).toBe(false);
    }
  });

  it("treats a blank key or model as missing", () => {
    const config = readAiConfig({ OPENAI_API_KEY: "   ", OPENAI_MODEL: " " });
    expect(config.apiKey).toBeNull();
    expect(config.model).toBe(DEFAULT_CHAT_MODEL);
  });

  it("reads overrides", () => {
    const config = readAiConfig({
      OPENAI_API_KEY: "k",
      OPENAI_MODEL: "some-model",
      OPENAI_EMBEDDING_MODEL: "some-embedder",
      OPENAI_REASONING_EFFORT: "none",
      AI_PROVIDER: "mock",
    });
    expect(config.model).toBe("some-model");
    expect(config.embeddingModel).toBe("some-embedder");
    expect(config.reasoningEffort).toBe("none");
    expect(config.provider).toBe("mock");
  });
});

describe("isAiAvailable", () => {
  it("needs the flag, the rate-limit secret AND a key (or the mock)", () => {
    const on = { AI_ASSISTANT_ENABLED: "true", AI_GATE_SECRET: "s" };
    expect(isAiAvailable(readAiConfig({ OPENAI_API_KEY: "k" }))).toBe(false);
    expect(isAiAvailable(readAiConfig({ AI_ASSISTANT_ENABLED: "true" }))).toBe(
      false,
    );
    expect(isAiAvailable(readAiConfig(on))).toBe(false); // no key
    expect(isAiAvailable(readAiConfig({ ...on, OPENAI_API_KEY: "k" }))).toBe(
      true,
    );
    expect(isAiAvailable(readAiConfig({ ...on, AI_PROVIDER: "mock" }))).toBe(
      true,
    );
  });

  it("stays off without the rate-limit secret, so it never runs unlimited", () => {
    expect(
      isAiAvailable(
        readAiConfig({ AI_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "k" }),
      ),
    ).toBe(false);
    expect(
      isAiAvailable(
        readAiConfig({
          AI_ASSISTANT_ENABLED: "true",
          AI_PROVIDER: "mock",
          AI_GATE_SECRET: "  ",
        }),
      ),
    ).toBe(false);
  });

  it("is off when the flag is off, even with a key", () => {
    expect(
      isAiAvailable(
        readAiConfig({
          AI_ASSISTANT_ENABLED: "false",
          OPENAI_API_KEY: "k",
          AI_GATE_SECRET: "s",
        }),
      ),
    ).toBe(false);
  });
});
