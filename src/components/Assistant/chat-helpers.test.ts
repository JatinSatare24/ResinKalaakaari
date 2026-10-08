import { describe, expect, it } from "vitest";
import {
  buildHistory,
  errorText,
  isHiddenPath,
} from "@/components/Assistant/chat-helpers";

describe("isHiddenPath", () => {
  it("hides on checkout and admin, including sub pages", () => {
    for (const path of [
      "/checkout",
      "/checkout/success",
      "/admin",
      "/admin/products/new",
    ]) {
      expect(isHiddenPath(path)).toBe(true);
    }
  });

  it("shows everywhere else, and does not match look-alike paths", () => {
    for (const path of [
      "/",
      "/products",
      "/products/clock",
      "/cart",
      "/administrator",
      "/checkout-guide",
    ]) {
      expect(isHiddenPath(path)).toBe(false);
    }
  });
});

describe("errorText", () => {
  it("has a distinct message for busy, slow down, too long and everything else", () => {
    const texts = new Set([
      errorText(429, "busy"),
      errorText(429, "slow_down"),
      errorText(400, "too_long"),
      errorText(503, "unavailable"),
    ]);
    expect(texts.size).toBe(4);
  });

  it("never shows a status code or a server word", () => {
    for (const [status, code] of [
      [503, "unavailable"],
      [0, undefined],
      [500, "boom"],
    ] as const) {
      expect(errorText(status, code)).not.toMatch(
        /\d{3}|unavailable\b.*error|undefined/,
      );
    }
  });

  it("points at WhatsApp when the assistant cannot help", () => {
    expect(errorText(503, "unavailable")).toContain("WhatsApp");
    expect(errorText(429, "busy")).toContain("WhatsApp");
  });
});

describe("buildHistory", () => {
  const greeting = { id: 0, role: "assistant" as const, content: "Hi!" };

  it("leaves out the greeting and error notices, and ends with the new message", () => {
    const history = buildHistory(
      [
        greeting,
        { id: 1, role: "user", content: "clocks?" },
        { id: 2, role: "assistant", content: "Sorry", isError: true },
        { id: 3, role: "assistant", content: "Here you go" },
      ],
      "cheaper ones",
      6,
    );
    expect(history).toEqual([
      { role: "user", content: "clocks?" },
      { role: "assistant", content: "Here you go" },
      { role: "user", content: "cheaper ones" },
    ]);
  });

  it("keeps only the most recent messages", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `m${i}`,
    }));
    const history = buildHistory([greeting, ...many], "last", 6);
    expect(history).toHaveLength(6);
    expect(history[5]).toEqual({ role: "user", content: "last" });
  });
});
