import { describe, expect, it } from "vitest";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import {
  FALLBACK_REPLY,
  applyGuards,
  buildAllowedAmounts,
  buildWhatsAppUrl,
  extractAllNumbers,
  extractAmounts,
  filterProductIds,
  findUnapprovedAmount,
  findUnsafeContent,
} from "@/lib/ai/guard";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

describe("extractAmounts", () => {
  it.each([
    ["it costs ₹1,200", [1200]],
    ["₹ 500 and ₹750", [500, 750]],
    ["Rs. 99", [99]],
    ["rs 99", [99]],
    ["INR 2500", [2500]],
    ["1500 rupees", [1500]],
    ["1 rupee", [1]],
    ["800/-", [800]],
    ["₹1,299.50", [1299.5]],
  ])("finds the amounts in %j", (text, expected) => {
    expect(extractAmounts(text).sort((a, b) => a - b)).toEqual(
      [...expected].sort((a, b) => a - b),
    );
  });

  it("does not treat plain numbers as amounts", () => {
    expect(extractAmounts("delivery in 5 to 7 days, 3 pieces")).toEqual([]);
  });
});

describe("extractAllNumbers", () => {
  it("finds every number", () => {
    expect(extractAllNumbers("under 1,000 or 500.5, size 12")).toEqual([
      1000, 500.5, 12,
    ]);
  });
});

describe("amount check", () => {
  const allowed = buildAllowedAmounts({
    toolPrices: [999, 1450],
    knowledgeText: "Flat shipping fee is ₹100 per order.",
    userMessages: ["something under 2000 please"],
  });

  it("allows tool prices, shop text amounts and the customer's own numbers", () => {
    expect(findUnapprovedAmount("The clock is ₹999.", allowed)).toBeNull();
    expect(findUnapprovedAmount("Shipping is Rs 100.", allowed)).toBeNull();
    expect(
      findUnapprovedAmount("Here is what fits under ₹2000.", allowed),
    ).toBeNull();
  });

  it("returns the first invented amount", () => {
    expect(findUnapprovedAmount("It is only ₹199 today!", allowed)).toBe(199);
    expect(findUnapprovedAmount("₹999 or maybe 1200 rupees", allowed)).toBe(
      1200,
    );
  });

  it("does not care about plain numbers", () => {
    expect(findUnapprovedAmount("Arrives in 5 days.", allowed)).toBeNull();
  });
});

describe("findUnsafeContent", () => {
  const contacts = [WHATSAPP_NUMBER, "owner@example.com"];

  it.each([
    "Pay at https://evil.example/pay",
    "Go to HTTP://evil.example",
    "see www.evil.example",
    "visit resinkalaakaari.in/offers",
    "chat on wa.me/919999999999",
  ])("flags a link in %j", (text) => {
    expect(findUnsafeContent(text, contacts)).toBe("link");
  });

  it.each([
    "Send the money to 9999999999@ybl",
    "write to someone@evil.example",
    "pay to 9876543210",
    "call +91 98765 43210",
    "account 1234-5678-9012",
  ])("flags a contact or payment detail in %j", (text) => {
    expect(findUnsafeContent(text, contacts)).not.toBeNull();
  });

  it("allows the shop's own contact details", () => {
    expect(
      findUnsafeContent(`Message us on ${WHATSAPP_NUMBER}.`, contacts),
    ).toBeNull();
    expect(
      findUnsafeContent("Mail owner@example.com for help.", contacts),
    ).toBeNull();
    expect(
      findUnsafeContent("WhatsApp +91 90222 23759.", [
        "+91 90222 23759",
        WHATSAPP_NUMBER,
      ]),
    ).toBeNull();
  });

  it("allows ordinary text with small numbers", () => {
    expect(
      findUnsafeContent(
        "It is 12 by 18 inches and ships in 5 to 7 days. Good for a 25th anniversary!",
        contacts,
      ),
    ).toBeNull();
  });
});

describe("filterProductIds", () => {
  const allowed = new Set([ID_A, ID_B, ID_C]);

  it("keeps only ids a tool returned, once each, in order", () => {
    expect(
      filterProductIds(
        [ID_C, "99999999-9999-4999-8999-999999999999", ID_A, ID_C, ID_B],
        allowed,
      ),
    ).toEqual([ID_C, ID_A, ID_B]);
  });

  it("compares ids without regard to case", () => {
    expect(filterProductIds([ID_A.toUpperCase()], allowed)).toEqual([ID_A]);
  });

  it("returns nothing when no tool returned any product", () => {
    expect(filterProductIds([ID_A], new Set())).toEqual([]);
  });

  it("caps the list", () => {
    const many = new Set<string>();
    for (let i = 0; i < 9; i++)
      many.add(`00000000-0000-4000-8000-00000000000${i}`);
    expect(filterProductIds([...many], many)).toHaveLength(5);
  });
});

describe("applyGuards", () => {
  const context = {
    allowedIds: new Set([ID_A]),
    allowedAmounts: new Set([999, 100]),
    allowedContacts: [WHATSAPP_NUMBER],
  };

  it("passes a clean answer through untouched", () => {
    const output = {
      reply: "These two fit. The cards show the prices.",
      productIds: [ID_A],
      handoffSummary: null,
    };
    expect(applyGuards(output, context)).toEqual({ output, flags: [] });
  });

  it("drops unknown ids and says so", () => {
    const result = applyGuards(
      { reply: "ok", productIds: [ID_A, ID_B], handoffSummary: null },
      context,
    );
    expect(result.output.productIds).toEqual([ID_A]);
    expect(result.flags).toEqual(["ids_dropped"]);
  });

  it("replaces a reply with an invented price", () => {
    const result = applyGuards(
      { reply: "Only ₹49!", productIds: [], handoffSummary: null },
      context,
    );
    expect(result.output.reply).toBe(FALLBACK_REPLY);
    expect(result.flags).toContain("amount_not_allowed");
  });

  it("replaces a reply with a link or a payment number", () => {
    for (const reply of ["Pay at https://evil.example", "UPI 9999999999@ybl"]) {
      const result = applyGuards(
        { reply, productIds: [], handoffSummary: null },
        context,
      );
      expect(result.output.reply).toBe(FALLBACK_REPLY);
    }
  });

  it("drops an owner brief that contains a link", () => {
    const result = applyGuards(
      {
        reply: "ok",
        productIds: [],
        handoffSummary: "I want a clock, see https://evil.example",
      },
      context,
    );
    expect(result.output.handoffSummary).toBeNull();
    expect(result.flags).toContain("handoff_dropped");
  });

  it("allows a plain owner brief, including a budget amount", () => {
    const brief = "Custom nameplate, 12 inches, budget around 2500.";
    const result = applyGuards(
      { reply: "ok", productIds: [], handoffSummary: brief },
      context,
    );
    expect(result.output.handoffSummary).toBe(brief);
  });
});

describe("buildWhatsAppUrl", () => {
  it("points at the shop's number and encodes the message", () => {
    const url = buildWhatsAppUrl("Need 2 frames & a clock #1");
    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toBe("Hi! I was on your website. Need 2 frames & a clock #1");
    // The raw & and # must not appear unencoded after the "?text=".
    expect(url.split("?text=")[1]).not.toMatch(/[&# ]/);
  });

  it("has a plain greeting when there is no brief", () => {
    const url = buildWhatsAppUrl(null);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(
      "Hi! I was on your website and have a question.",
    );
  });
});
