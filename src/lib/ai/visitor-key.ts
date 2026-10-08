// Who is asking, for the rate limiter, without storing who they are.
//
// The IP address is turned into a keyed hash (HMAC-SHA256 with the server-only
// AI_GATE_SECRET). The database only ever sees the hash: it cannot be turned
// back into an address, and without the secret nobody can compute the key for
// a given address either.
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

function firstValid(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim() ?? "";
  return isIP(first) ? first : null;
}

// On Vercel, x-vercel-forwarded-for is set by the platform and cannot be
// spoofed by the client, and x-forwarded-for is overwritten. The others are
// fallbacks for running anywhere else (local dev). A value that is not a real
// IP address is ignored.
export function clientIp(headers: Headers): string | null {
  return (
    firstValid(headers.get("x-vercel-forwarded-for")) ??
    firstValid(headers.get("x-forwarded-for")) ??
    firstValid(headers.get("x-real-ip"))
  );
}

// 64 hex characters. An unknown address shares one bucket ("unknown"): the
// strict choice, since it can only block more, never less.
export function visitorKey(ip: string | null, secret: string): string {
  return createHmac("sha256", secret)
    .update(ip ?? "unknown")
    .digest("hex");
}
