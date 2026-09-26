# Resin Kalaakari — Architecture

This document tracks the app's architecture as it's reviewed and refactored,
phase by phase (see project review plan). Each phase extends the diagram
below rather than replacing it, so by the final phase it reflects the full
end-to-end flow of the app.

## Diagram

\`\`\`mermaid
flowchart LR
Browser[Browser] -->|"1: request + cookies"| Proxy["proxy.ts (auth gate)"]
Proxy -->|"2: verify session"| Supabase[(Supabase)]
Supabase -->|"3: user + refreshed token, if needed"| Proxy
Proxy -->|"4a: unauthenticated + protected route"| Redirect["/login"]
Proxy -->|"4b: authorized or public route"| Vercel["Vercel (Next.js Server)"]
Vercel -->|"Server Components: createServerSupabaseClient()"| Supabase
Vercel -->|"Client Components (e.g. Navbar): client()"| Supabase
Vercel -->|"unmatched route"| NotFound["not-found.tsx"]
Vercel -->|"HTML + Set-Cookie"| Browser
Redirect -.->|"redirect response"| Browser
\`\`\`

## Phase log

| Phase              | Status      | Notes                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo setup (CI/CD) | Done        | CI workflow (lint/format/type-check/build), branch protection on `main`, Vercel previews confirmed on PRs                                                                                                                                                                                                                      |
| 1 — Foundation     | Done        | Two Supabase clients (browser/server), proxy.ts (renamed from middleware.ts per Next 16) with route guards for /checkout, /my-orders, /admin (role check deferred to Phase 7), root layout + metadata/fonts, added not-found.tsx + NotFoundUI, fixed Navbar client()-in-render bug (build crash risk + resubscribe/logout bug) |
| 2 — Auth           | Not started |                                                                                                                                                                                                                                                                                                                                |
| 3 — Products       | Not started |                                                                                                                                                                                                                                                                                                                                |
| 4 — Home           | Not started |                                                                                                                                                                                                                                                                                                                                |
| 5 — Cart           | Not started |                                                                                                                                                                                                                                                                                                                                |
| 6 — Orders         | Not started |                                                                                                                                                                                                                                                                                                                                |
| 7 — Admin          | Not started |                                                                                                                                                                                                                                                                                                                                |
| 8 — Edge function  | Not started |                                                                                                                                                                                                                                                                                                                                |
