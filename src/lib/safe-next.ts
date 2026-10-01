// "Return to where you were" after login. The ?next= value comes from the
// URL, so anyone can put anything in it. Only a path on OUR site is allowed;
// everything else becomes the fallback (this blocks open redirects such as
// //evil.com or /\evil.com).
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;

  try {
    // Resolve against a dummy origin and check we are still on it.
    const base = "http://local.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    // Never send someone back to the login page they just left (a loop).
    if (url.pathname.startsWith("/login")) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
