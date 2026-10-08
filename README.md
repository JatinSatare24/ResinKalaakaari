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

**Admin** (the shop owner manages everything herself)

- Dashboard with a card each for Orders, Products and Categories, and a tab strip on every admin page.
- Orders list (newest first, 20 per page) with customer, total, UTR and status. Change a status from a dropdown (pending, in-process, confirmed, shipped, delivered).
- Products list (A to Z, search by name, 20 per page). Add or edit a product: name, price, description, category, up to 5 photos (add several at once, move them up or down, choose the main one) and "featured" and "gallery" switches. Photos are shrunk in the browser and uploaded straight to storage.
- Categories: add a category or rename one.
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
- **Admin role.** Admins are rows in an `admin_users` table that no API role can read or write. A `SECURITY DEFINER` function, `is_admin()`, answers "is the caller an admin?". Every admin write (order status, products, categories) goes through a Postgres function that re-checks the role, so the admin has no direct write access to the tables.

## Project structure

```text
src/
  app/          routes, layouts, loading / error / not-found files, Server Actions
  components/   UI components, each with its own CSS Module
  context/      CartContext (cart state: guest and signed-in)
  lib/          pure helpers (cart, checkout, orders, auth, search params, product admin rules, photo resizing)
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Edge function secrets

The `send-order-email` function reads `SUPABASE_URL`, `RESEND_API_KEY` and the project's admin key from the Supabase function environment (`SUPABASE_SECRET_KEYS`, with `SUPABASE_SERVICE_ROLE_KEY` as the fallback on older projects). Never put an admin key in `.env.local`, in client code or in the repo. The website itself only uses the project URL and the publishable key.

## Scripts

| Command                | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the dev server               |
| `npm run build`        | Production build                   |
| `npm run start`        | Run the production build           |
| `npm run lint`         | ESLint                             |
| `npm run lint:fix`     | ESLint, fixing what it can         |
| `npm run format`       | Prettier, rewriting files          |
| `npm run format:check` | Prettier check (markdown included) |
| `npm run type-check`   | TypeScript check, no output        |

## Continuous integration

GitHub Actions runs on every pull request and push to `main`: lint (does not block), `prettier --check .`, `tsc --noEmit` and `next build`. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository secrets so the build step can run.

## License

All rights reserved. This is a personal portfolio project; please ask before reusing the code or images.
