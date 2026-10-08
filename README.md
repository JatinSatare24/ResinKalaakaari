# Resin Kalaakaari

An online shop for handcrafted resin art: varmala preservation, custom nameplates, jewelry and more. Customers browse products, fill a cart, place an order and pay by UPI; the shop owner verifies each payment and manages orders from an admin page.

Built as a full-stack Next.js app on Supabase (Postgres, Auth and Edge Functions), deployed on Vercel.

## Features

**Customers**

- Browse products with category filter, search, sorting and pagination (the URL holds the state, so every view is shareable).
- Product page with a photo gallery (swipe on a phone, thumbnails, a "2 / 5" counter) when a product has more than one photo.
- Cart that works for guests (saved in the browser) and merges into a saved cart on sign-in.
- Sign in with email and password or Google, plus signup confirmation and password reset.
- Checkout with address pre-filled from the profile, priced on the server.
- Pay by UPI, then submit the transaction ID (UTR) as payment proof.
- My Orders and order detail pages with colour-coded status.
- Profile page for saved contact and shipping details.
- Invoice PDF emailed when payment proof is submitted.
- AI shop assistant (a chat bubble in the corner, when switched on): finds products by words, budget or meaning and answers questions about delivery, payment and refunds. It cannot place orders or take payments, and every price it shows comes from the database.

**Admin** (the shop owner manages everything herself)

- Dashboard with a card each for Orders, Products and Categories, and a tab strip on every admin page.
- Orders list (newest first, 20 per page) with customer, total, UTR and status. Change a status from a dropdown (pending, in-process, confirmed, shipped, delivered).
- Products list (A to Z, search by name, 20 per page). Add or edit a product: name, price, description, category, up to 5 photos (add several at once, move them up or down, choose the main one) and "featured" and "gallery" switches. Photos are shrunk in the browser and uploaded straight to storage.
- Categories: add a category or rename one.
- Admin link in the navbar, shown to admins only.
- "Rebuild search index" button on the Products page (only while the AI assistant is on): refreshes the product search the assistant uses.

## Tech stack

| Area        | Choice                                                           |
| ----------- | ---------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Components, Server Actions)       |
| UI          | React 19, TypeScript, CSS Modules                                |
| Backend     | Supabase: Postgres + Row Level Security, Auth, Edge Functions    |
| Data access | `@supabase/ssr` and `supabase-js`, wrapped in `src/lib/data/*`   |
| Email / PDF | Resend and jsPDF, inside the `send-order-email` edge function    |
| AI          | OpenAI Responses and Embeddings (plain `fetch`), pgvector        |
| Tooling     | ESLint, Prettier, `tsc --noEmit`, Vitest, GitHub Actions, Vercel |

## How it is built

- **Server first.** Pages are Server Components that load data on the server. Only interactive parts (cart, forms, status dropdown) are Client Components.
- **One data layer.** Every Supabase call lives in `src/lib/data/<entity>.ts`, typed, and throws on error. Components never call Supabase directly.
- **Never trust the browser.** Server Actions re-validate everything they receive. Orders are created and priced by Postgres functions (`create_order`, `submit_payment_proof`), so a customer cannot set their own price or status.
- **Layered access control.** `proxy.ts` is a fast first gate (guests go to login). Pages then check the user on the server (`requireUser`, `requireAdmin`), and Row Level Security protects the data itself.
- **Admin role.** Admins are rows in an `admin_users` table that no API role can read or write. A `SECURITY DEFINER` function, `is_admin()`, answers "is the caller an admin?". Every admin write (order status, products, categories) goes through a Postgres function that re-checks the role, so the admin has no direct write access to the tables.

- **AI behind a wall of code.** The model can only read (three product lookups). Everything it says is checked before a customer sees it: unknown product ids are dropped, a rupee amount must come from the database or the shop's own text, and links, emails and phone numbers are refused. See "AI shop assistant" below.

## Project structure

```text
src/
  app/          routes, layouts, loading / error / not-found files, Server Actions
  components/   UI components, each with its own CSS Module
  context/      CartContext (cart state: guest and signed-in)
  lib/          pure helpers (cart, checkout, orders, auth, search params, product admin rules, photo resizing)
  lib/data/     the only code that talks to Supabase
  lib/ai/       the AI assistant: provider, tools, answer loop, checks, evaluation
  app/api/assistant/  the chat endpoint (a thin wrapper around lib/ai)
  components/Assistant/  the chat bubble and panel
  proxy.ts      first auth gate for protected routes
supabase/
  functions/    send-order-email edge function (invoice PDF + email)
docs/
  ARCHITECTURE.md
```

## Getting started

**Requirements:** Node.js 24 (what CI uses) and a Supabase project.

```bash
git clone https://github.com/JatinSatare24/ResinKalaakaari.git
cd ResinKalaakaari
npm ci
```

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AI assistant settings (optional)

The assistant is off unless all three required settings are present. None of them start with `NEXT_PUBLIC_`, so they never reach the browser, and none are needed for `next build` or CI.

| Variable                  | Needed? | What it does                                                          |
| ------------------------- | ------- | --------------------------------------------------------------------- |
| `AI_ASSISTANT_ENABLED`    | Yes     | The switch. Only the exact text `true` turns the assistant on.        |
| `OPENAI_API_KEY`          | Yes\*   | Server only. \*Not needed with `AI_PROVIDER=mock`.                    |
| `AI_GATE_SECRET`          | Yes     | Shared secret for the database rate limiter (see below).              |
| `AI_PROVIDER`             | No      | `mock` answers from a built-in fake (no key, no cost) for local work. |
| `OPENAI_MODEL`            | No      | Defaults to `gpt-5.6-luna`.                                           |
| `OPENAI_EMBEDDING_MODEL`  | No      | Defaults to `text-embedding-3-small` (1536 numbers per product).      |
| `OPENAI_REASONING_EFFORT` | No      | Defaults to `low`.                                                    |

Put them in `.env.local` for local work and in Vercel (Production and Preview) for the live site. Shop pages are built ahead of time, so after changing `AI_ASSISTANT_ENABLED` you must redeploy. Never commit a key or the secret.

### Edge function secrets

The `send-order-email` function reads `SUPABASE_URL`, `RESEND_API_KEY` and the project's admin key from the Supabase function environment (`SUPABASE_SECRET_KEYS`, with `SUPABASE_SERVICE_ROLE_KEY` as the fallback on older projects). Never put an admin key in `.env.local`, in client code or in the repo. The website itself only uses the project URL and the publishable key.

## AI shop assistant

A floating chat bubble answers questions about products and policies. How it works, in short: the browser sends the last few messages to `/api/assistant`; the server checks the switch, the origin, the size and a database rate limit; the model may call three read-only tools (word search, find by meaning, get one product); the answer is checked by code; the product list is drawn from database rows.

**Set up once** (run in the Supabase SQL Editor, in this order; the files are kept outside the repo like earlier phases):

1. `phase-11-part-a.sql`: pgvector, the `product_embeddings` table and its admin-only functions, and `match_products`.
2. `phase-11-part-b.sql`: the rate limiter tables and `ai_check_rate_limit`.
3. `phase-11-part-c-set-gate-secret.sql`: stores the fingerprint of `AI_GATE_SECRET`. Make the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, use the same text in `.env.local` and Vercel, and never commit it.

Then set the environment variables above, sign in as admin, open Admin, Products and press **Rebuild search index** once to embed the existing products. After that every product save refreshes its own entry. The button only re-embeds products whose text changed, so pressing it again costs nothing; use it after renaming a category or editing products outside the admin.

**Limits** (all in `src/lib/ai/config.ts`): messages up to 500 characters, the last 6 kept, at most 3 model calls per question, a 25 second budget, replies capped at 600 characters, and 15 questions per hour and 40 per day per visitor with 150 per day for the whole shop. Visitors are counted by a keyed hash of their IP address, never the address.

**Keep in step:** `src/lib/ai/knowledge.ts` is a hand-kept copy of the Shipping, Terms, Privacy, About and Contact pages. When one of those pages changes, change the matching sentence there too.

**Local work with no key:** set `AI_PROVIDER=mock`. Do not press Rebuild search index in mock mode against a real project: it would store fake vectors that a later real rebuild skips as "unchanged".

**Evaluation:** `npm test` checks the code and the 20-case rubric offline. `npm run eval` runs the 20 cases against the real model (set `OPENAI_API_KEY` first; it makes a few dozen calls) and prints a score per group, how often a safety check replaced a reply, and the token totals.

## Scripts

| Command                | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Start the dev server                                          |
| `npm run build`        | Production build                                              |
| `npm run start`        | Run the production build                                      |
| `npm run lint`         | ESLint                                                        |
| `npm run lint:fix`     | ESLint, fixing what it can                                    |
| `npm run format`       | Prettier, rewriting files                                     |
| `npm run format:check` | Prettier check (markdown included)                            |
| `npm run type-check`   | TypeScript check, no output                                   |
| `npm test`             | Unit tests (Vitest), no network                               |
| `npm run eval`         | AI evaluation against the real model (needs `OPENAI_API_KEY`) |

## Continuous integration

GitHub Actions runs on every pull request and push to `main`: lint (does not block), `prettier --check .`, `tsc --noEmit` and `next build`. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository secrets so the build step can run. The AI settings are not needed for the build. CI does not run `npm test` yet.

## License

All rights reserved. This is a personal portfolio project; please ask before reusing the code or images.
