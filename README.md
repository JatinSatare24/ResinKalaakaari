# Resin Kalaakaari

An online shop for handcrafted resin art: varmala preservation, custom nameplates, jewelry and more. Customers browse products, fill a cart, place an order and pay by UPI; the shop owner verifies each payment and manages orders from an admin page.

Built as a full-stack Next.js app on Supabase (Postgres, Auth and Edge Functions), deployed on Vercel.

## Features

**Customers**

- Browse products with category filter, search, sorting and pagination (the URL holds the state, so every view is shareable).
- Cart that works for guests (saved in the browser) and merges into a saved cart on sign-in.
- Sign in with email and password or Google, plus signup confirmation and password reset.
- Checkout with address pre-filled from the profile, priced on the server.
- Pay by UPI, then submit the transaction ID (UTR) as payment proof.
- My Orders and order detail pages with colour-coded status.
- Profile page for saved contact and shipping details.
- Invoice PDF emailed when payment proof is submitted.

**Admin**

- Orders list (newest first, 20 per page) with customer, total, UTR and status.
- Change an order's status from a dropdown (pending, in-process, confirmed, shipped, delivered).
- Admin link in the navbar, shown to admins only.

## Tech stack

| Area        | Choice                                                         |
| ----------- | -------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Components, Server Actions)     |
| UI          | React 19, TypeScript, CSS Modules                              |
| Backend     | Supabase: Postgres + Row Level Security, Auth, Edge Functions  |
| Data access | `@supabase/ssr` and `supabase-js`, wrapped in `src/lib/data/*` |
| Email / PDF | Resend and jsPDF, inside the `send-order-email` edge function  |
| Tooling     | ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI, Vercel    |

## How it is built

- **Server first.** Pages are Server Components that load data on the server. Only interactive parts (cart, forms, status dropdown) are Client Components.
- **One data layer.** Every Supabase call lives in `src/lib/data/<entity>.ts`, typed, and throws on error. Components never call Supabase directly.
- **Never trust the browser.** Server Actions re-validate everything they receive. Orders are created and priced by Postgres functions (`create_order`, `submit_payment_proof`), so a customer cannot set their own price or status.
- **Layered access control.** `proxy.ts` is a fast first gate (guests go to login). Pages then check the user on the server (`requireUser`, `requireAdmin`), and Row Level Security protects the data itself.
- **Admin role.** Admins are rows in an `admin_users` table that no API role can read or write. A `SECURITY DEFINER` function, `is_admin()`, answers "is the caller an admin?". Status changes go through `admin_set_order_status`, which re-checks the role.

## Project structure

```text
src/
  app/          routes, layouts, loading / error / not-found files, Server Actions
  components/   UI components, each with its own CSS Module
  context/      CartContext (cart state: guest and signed-in)
  lib/          pure helpers (cart, checkout, orders, auth, search params)
  lib/data/     the only code that talks to Supabase
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Edge function secrets

The `send-order-email` function reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` from the Supabase function environment. Never put the service role key in `.env.local`, in client code or in the repo.

## Scripts

| Command                | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the dev server               |
| `npm run build`        | Production build                   |
| `npm run start`        | Run the production build           |
| `npm run lint`         | ESLint                             |
| `npm run format:check` | Prettier check (markdown included) |
| `npm run type-check`   | TypeScript check, no output        |

## Continuous integration

GitHub Actions runs on every pull request and push to `main`: lint (does not block), `prettier --check .`, `tsc --noEmit` and `next build`. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository secrets so the build step can run.

## License

All rights reserved. This is a personal portfolio project; please ask before reusing the code or images.
