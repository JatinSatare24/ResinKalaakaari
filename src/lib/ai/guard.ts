// The checks that run AFTER the model has answered and BEFORE a customer sees
// anything. The model is untrusted: it can be confused, or steered by text
// hidden in a product description or a customer message. These checks do not
// try to understand what the model meant. They only remove things it has no
// business saying, whatever the reason it said them:
//   - a product id no tool returned          (so no invented products)
//   - a rupee amount nobody gave it          (so no invented prices)
//   - a link, email address or phone number  (so no redirecting payments)
// Pure: no React, no Supabase, no network.
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { AI_LIMITS } from "@/lib/ai/config";
import type { AssistantOutput } from "@/lib/ai/schemas";

// Shown instead of a reply the checks refused. Plain and honest, and it points
// at the two things that always work: the shop itself and the owner.
export const FALLBACK_REPLY =
  "Sorry, I could not put together a reliable answer to that. Please browse the shop, or message us on WhatsApp and we will help.";

// --- Rupee amounts ---

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

// Amounts written with a currency marker: "₹1,200", "Rs. 500", "INR 99",
// "1500 rupees", "800/-". A bare number ("12 days") is not an amount.
export function extractAmounts(text: string): number[] {
  const found: number[] = [];
  const before = /(?:₹|\bRs\.?|\bINR)\s*(\d[\d,]*(?:\.\d+)?)/gi;
  const after = /(\d[\d,]*(?:\.\d+)?)\s*(?:rupees?\b|\bRs\b\.?|\bINR\b|\/-)/gi;
  for (const pattern of [before, after]) {
    for (const match of text.matchAll(pattern)) {
      const value = toNumber(match[1]);
      if (Number.isFinite(value)) found.push(value);
    }
  }
  return found;
}

// Every number in a text, marker or not. Used on the customer's own words, so
// "under 1000" lets the model say "under ₹1000" back.
export function extractAllNumbers(text: string): number[] {
  const numbers: number[] = [];
  for (const match of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const value = toNumber(match[0]);
    if (Number.isFinite(value)) numbers.push(value);
  }
  return numbers;
}

// The amounts the model is allowed to mention: the prices the tools returned,
// every amount in the shop's own fixed text (shipping fee and so on), and any
// number the customer typed themselves.
export function buildAllowedAmounts(sources: {
  toolPrices: number[];
  knowledgeText: string;
  userMessages: string[];
}): Set<number> {
  const allowed = new Set<number>(sources.toolPrices);
  for (const amount of extractAmounts(sources.knowledgeText)) {
    allowed.add(amount);
  }
  for (const message of sources.userMessages) {
    for (const number of extractAllNumbers(message)) allowed.add(number);
  }
  return allowed;
}

// The first amount in `text` that is not allowed, or null.
export function findUnapprovedAmount(
  text: string,
  allowed: Set<number>,
): number | null {
  for (const amount of extractAmounts(text)) {
    if (!allowed.has(amount)) return amount;
  }
  return null;
}

// --- Links, emails, phone numbers ---

export type UnsafeReason = "link" | "contact";

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

// Looks for a web address, an email address or a UPI-style id (name@bank), or
// a run of 7 or more digits (a phone, bank or reference number). The shop's
// own contact details (`allowedContacts`) are taken out of the text first, so
// the assistant can still say the real WhatsApp number or email.
export function findUnsafeContent(
  text: string,
  allowedContacts: string[],
): UnsafeReason | null {
  let rest = text;
  for (const contact of allowedContacts) {
    if (!contact) continue;
    rest = rest.split(contact).join(" ");
  }

  if (/\bhttps?:\/\//i.test(rest) || /\bwww\./i.test(rest)) return "link";
  // "name.com", "wa.me" and friends, written without http.
  if (
    /\b[a-z0-9-]+\.(?:com|in|net|org|io|co|me|app|xyz|link|info|shop|store)\b/i.test(
      rest,
    )
  ) {
    return "link";
  }
  if (/[\w.+-]+@[\w-]+/.test(rest)) return "contact";

  const allowedDigits = allowedContacts.map(digitsOf).filter(Boolean);
  for (const match of rest.matchAll(/\+?\d[\d\s().-]{5,}\d/g)) {
    const digits = digitsOf(match[0]);
    if (digits.length < 7) continue;
    if (allowedDigits.some((allowed) => allowed.includes(digits))) continue;
    return "contact";
  }
  return null;
}

// --- Putting it together ---

export type GuardContext = {
  allowedIds: Set<string>; // product ids the tools returned this turn
  allowedAmounts: Set<number>;
  allowedContacts: string[]; // the shop's real phone, email and so on
};

export type GuardResult = {
  output: AssistantOutput; // always safe to show
  flags: string[]; // what was changed, for logs and the evals
};

// Ids: keep only ones a tool returned, no repeats, the model's order, at most
// maxProductsPerReply.
export function filterProductIds(
  ids: string[],
  allowed: Set<string>,
): string[] {
  const kept: string[] = [];
  for (const id of ids) {
    const key = id.toLowerCase();
    if (!allowed.has(key) || kept.includes(key)) continue;
    kept.push(key);
    if (kept.length === AI_LIMITS.maxProductsPerReply) break;
  }
  return kept;
}

export function applyGuards(
  output: AssistantOutput,
  context: GuardContext,
): GuardResult {
  const flags: string[] = [];

  const productIds = filterProductIds(output.productIds, context.allowedIds);
  if (productIds.length !== output.productIds.length) flags.push("ids_dropped");

  let reply = output.reply;
  const badAmount = findUnapprovedAmount(reply, context.allowedAmounts);
  if (badAmount !== null) {
    flags.push("amount_not_allowed");
    reply = FALLBACK_REPLY;
  }
  const badReply = findUnsafeContent(reply, context.allowedContacts);
  if (badReply) {
    flags.push(`reply_${badReply}`);
    reply = FALLBACK_REPLY;
  }

  // The owner brief goes into a WhatsApp link a customer will tap. It gets the
  // same link and contact checks (an amount is fine there, the customer may
  // be quoting their own budget).
  let handoffSummary = output.handoffSummary;
  if (handoffSummary && findUnsafeContent(handoffSummary, [])) {
    flags.push("handoff_dropped");
    handoffSummary = null;
  }

  return { output: { reply, productIds, handoffSummary }, flags };
}

// --- The WhatsApp hand-off ---

// A wa.me link with the message already typed. Nothing is sent: the customer
// opens WhatsApp and presses send themselves. encodeURIComponent makes any
// character in the brief safe inside the link.
export function buildWhatsAppUrl(summary: string | null): string {
  const text = summary
    ? `Hi! I was on your website. ${summary}`
    : "Hi! I was on your website and have a question.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
