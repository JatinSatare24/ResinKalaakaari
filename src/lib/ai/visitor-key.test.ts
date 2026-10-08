import { describe, expect, it } from "vitest";
import { clientIp, visitorKey } from "@/lib/ai/visitor-key";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("prefers the platform header over the others", () => {
    expect(
      clientIp(
        headers({
          "x-vercel-forwarded-for": "203.0.113.5",
          "x-forwarded-for": "198.51.100.9",
          "x-real-ip": "192.0.2.1",
        }),
      ),
    ).toBe("203.0.113.5");
  });

  it("takes the first address of a list", () => {
    expect(
      clientIp(headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" })),
    ).toBe("198.51.100.9");
  });

  it("falls back in order, and reads IPv6", () => {
    expect(clientIp(headers({ "x-real-ip": "2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("ignores values that are not IP addresses", () => {
    expect(
      clientIp(headers({ "x-vercel-forwarded-for": "not-an-ip" })),
    ).toBeNull();
    expect(
      clientIp(
        headers({
          "x-vercel-forwarded-for": "<script>",
          "x-forwarded-for": "198.51.100.9",
        }),
      ),
    ).toBe("198.51.100.9");
    expect(clientIp(headers({}))).toBeNull();
  });
});

describe("visitorKey", () => {
  it("is 64 hex characters and never contains the address", () => {
    const key = visitorKey("203.0.113.5", "secret-1");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203");
  });

  it("is stable for the same address and secret", () => {
    expect(visitorKey("203.0.113.5", "s")).toBe(visitorKey("203.0.113.5", "s"));
  });

  it("differs by address and by secret", () => {
    expect(visitorKey("203.0.113.5", "s")).not.toBe(
      visitorKey("203.0.113.6", "s"),
    );
    expect(visitorKey("203.0.113.5", "s")).not.toBe(
      visitorKey("203.0.113.5", "t"),
    );
  });

  it("gives unknown addresses one shared bucket", () => {
    expect(visitorKey(null, "s")).toBe(visitorKey(null, "s"));
    expect(visitorKey(null, "s")).not.toBe(visitorKey("203.0.113.5", "s"));
  });
});
