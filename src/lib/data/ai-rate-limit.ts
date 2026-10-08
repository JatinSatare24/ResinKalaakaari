// The chat rate limiter's one database call. The counting happens inside
// Postgres (ai_check_rate_limit, phase-11-part-b.sql) as atomic upserts, so
// every server copy shares one count and two requests can never both slip
// under a limit. The function only answers if it is given the shared secret.
import { AI_RATE_LIMITS } from "@/lib/ai/config";
import { createServerSupabaseClient } from "@/lib/server";

export type RateLimitVerdict = "ok" | "ip_hour" | "ip_day" | "global_day";

const VERDICTS: readonly string[] = ["ok", "ip_hour", "ip_day", "global_day"];

export async function checkRateLimit(
  secret: string,
  visitorKey: string,
): Promise<RateLimitVerdict> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("ai_check_rate_limit", {
    p_secret: secret,
    p_key: visitorKey,
    p_ip_hour_limit: AI_RATE_LIMITS.ipPerHour,
    p_ip_day_limit: AI_RATE_LIMITS.ipPerDay,
    p_global_day_limit: AI_RATE_LIMITS.globalPerDay,
  });

  // The error text is not copied: it could echo the arguments.
  if (error) throw new Error("checkRateLimit failed");
  if (typeof data !== "string" || !VERDICTS.includes(data)) {
    throw new Error("checkRateLimit returned an unknown answer");
  }
  return data as RateLimitVerdict;
}
