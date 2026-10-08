// The small pure rules behind the chat widget, kept out of the component so
// they can be tested without a browser.

// Pages where the bubble would get in the way (paying, running the shop).
const HIDDEN_ON = ["/checkout", "/admin"];

export function isHiddenPath(pathname: string): boolean {
  return HIDDEN_ON.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// What to tell the customer when the server could not answer. Never shows a
// status code or any server text.
export function errorText(status: number, code: string | undefined): string {
  if (status === 429 && code === "busy") {
    return "The assistant has reached its limit for today. Please message the shop on WhatsApp.";
  }
  if (status === 429) {
    return "You're sending messages quickly. Please wait a little and try again.";
  }
  if (status === 400 && code === "too_long") {
    return "That message is too long. Please shorten it.";
  }
  return "The assistant isn't available right now. Please try again, or message the shop on WhatsApp.";
}

type Turn = { id: number; role: "user" | "assistant"; content: string };

// The messages sent to the server: real conversation only (no greeting, no
// error notices), then the new message, trimmed to the most recent `limit`.
export function buildHistory(
  messages: (Turn & { isError?: boolean })[],
  newText: string,
  limit: number,
  greetingId = 0,
): { role: "user" | "assistant"; content: string }[] {
  return [
    ...messages.filter((m) => !m.isError && m.id !== greetingId),
    { role: "user" as const, content: newText },
  ]
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.content }));
}
