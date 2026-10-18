# Ammoun Sweets

Online ordering for **Ammoun Sweets**, a Lebanese sweets and pastry shop at
Shop 2, 972 Hume Highway, Bass Hill NSW 2197.

Customers browse the menu, pick sizes, see what their order weighs, and place
an order for collection. **Payment is taken in the shop** — there is no online
payment and no gateway.

The owner runs the shop from `/admin` — products, prices, stock, orders,
opening hours, delivery areas and promotions — without touching code.

```bash
pnpm install
cp .env.example .env.local     # then fill in SESSION_SECRET at minimum
pnpm db:migrate
pnpm db:seed --with-admin
pnpm dev                    # http://localhost:3000
```

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
PostgreSQL + Drizzle ORM.

**Use pnpm.** It is pinned in `package.json` (`packageManager`) so the deploy
platform cannot guess wrong — the repo previously carried both a
`package-lock.json` and a `pnpm-lock.yaml`, which drift apart silently and
break a CI install with `--frozen-lockfile`.

---

## How it fits together

```
src/
  app/              routes — public shop, /admin, /api/webhooks
  components/       presentation (the approved design)
  components/shop/  cart, checkout and product controls (client)
  server/           everything that touches the database or a secret
    db/             schema, connection, seed
    auth/           password hashing, sessions, role checks
    services/       pricing, orders, fulfilment, payments, settings, email
  lib/              helpers safe to import from either side (money, validation)
  data/             brand-level content: business facts, gallery, navigation
```

The boundary that matters: **`src/server/` is marked `server-only`.** Importing
any of it from a Client Component fails the build rather than shipping database
code to the browser. That is why order-status labels live in
`src/lib/order-status.ts` — the admin status buttons are a client component and
need the vocabulary without the queries.

### Next.js 16 specifics

This is not the Next.js most examples describe. Three differences bite:

- Middleware is **`src/proxy.ts`**, not `middleware.ts`.
- `params` and `searchParams` are **Promises**; `cookies()` and `headers()` are
  async.
- Native and WASM modules must be listed in `serverExternalPackages`
  (`next.config.ts`) or the bundler rewrites their file paths and they fail at
  runtime.

## The database

PostgreSQL, with Drizzle ORM and checked-in SQL migrations in `drizzle/`.

`DATABASE_URL` picks the driver:

| Value | Driver | Use |
| --- | --- | --- |
| `postgresql://…` | `pg` | production, staging |
| `file:./.pglite` | PGlite | local development |
| unset | PGlite, in memory | tests |

PGlite is real PostgreSQL 18 compiled to WebAssembly, running inside the Node
process — no server and no Docker to install before `pnpm dev` works.

> **PGlite is single-process.** Exactly one process may hold `./.pglite` open.
> Running `pnpm db:seed` while `pnpm dev` is up will corrupt the
> directory. Stop the dev server first, or run `pnpm db:reset` and re-seed.
> This limitation is the reason production uses a real PostgreSQL server; it is
> not a property of the application.

Money is stored as **integer cents**, never floating point. Order lines keep a
snapshot of the name, size and price at the time of sale, and the foreign key
back to the product is `ON DELETE SET NULL` — deleting a product from the menu
never rewrites what a customer was charged last month.

```bash
pnpm db:generate   # write a migration from a schema change
pnpm db:migrate    # apply pending migrations
pnpm db:seed       # menu content; add --with-admin for the first account
pnpm db:reset      # drop everything (development only)
```

## Ordering

The rule the whole checkout is built around: **the browser never sets a
price.**

The cart in `localStorage` holds variant IDs and quantities and nothing else
that is trusted. `src/server/services/pricing.ts` re-reads every price from the
database on each request and returns the discrepancies it finds — unavailable,
out of stock, price changed, below the minimum quantity. A forged cart does not
produce a cheap order; it produces a repriced one with the change shown.

Two further guarantees:

- **Stock cannot go negative.** The decrement is a conditional `UPDATE … WHERE
  stock_quantity >= :qty` inside the order transaction. Two customers racing
  for the last tray means one order and one clear "out of stock", not two
  orders and an apology.
- **Retries do not duplicate orders.** Every submission carries an idempotency
  key with a unique index behind it. A double-click or a flaky connection
  retrying both resolve to the same order.

### Payment — in the shop, not online

There is **no payment gateway**. No card number, expiry or CVC can reach this
application, because nothing ever asks for one.

A placed order is saved as `paymentStatus: PENDING` and
`orderStatus: CONFIRMED` — unpaid, but confirmed. There is no pre-payment
limbo to sit in, so the shop can start preparing straight away.

Staff mark an order paid from the admin order page once the customer has paid:
**Paid — cash**, **Paid — card**, or **Paid — over the phone**. That is the only
thing in the system that ever sets `PAID`.

Two deliberate choices there:

- **One-way.** There is no "mark unpaid" button. The fix for a mis-tap is a
  note on the order, not quietly rewriting whether the shop was paid.
- **Idempotent.** `markOrderPaid` only matches an order that is not already
  paid, so a second tap writes no second `paidAt` and no duplicate timeline
  entry, and never drops a prepared order back to Confirmed.

`PENDING_PAYMENT` remains in the `order_status` enum but nothing writes it.
Removing a value from a PostgreSQL enum means rebuilding the type and every
column that uses it, which is not worth it for a value no code sets.

Delivery is a separate question and is **off by default** in store settings; the
owner can switch it on with postcodes, a fee and a minimum if they ever want
it.

## Weight

Most of the menu is sold by the half kilo, so the cart, checkout and
confirmation all show what the order **weighs** as well as what it costs — the
figure a customer ordering for a family is actually judging.

Weights are integers of grams, for the same reason money is integers of cents.
`src/lib/weight.ts` owns the arithmetic and the formatting (`500 g`, `1.5 kg`).

Items sold by the piece have **no weight**, and the column is null rather than
a guess: nobody has weighed a piece of baklava. When a cart mixes the two, the
total is labelled "weighed items" instead of quietly under-reporting. Order
lines snapshot the weight at the time of sale, like the price.

## Admin

`/admin`, protected in three layers: `src/proxy.ts` redirects visitors with no
session cookie, the `(dashboard)` route group re-checks the session on the
server for every page, and each Server Action checks the caller's role again.
The proxy is a convenience, not the authorisation — it only reads a cookie's
presence.

Sessions are opaque random tokens; only their SHA-256 hash is stored, so a
database leak does not hand over live sessions. Passwords use scrypt with
per-password salts. Accounts lock for 15 minutes after five failed attempts,
and the login endpoint throttles per IP and per email.

There is **no default account**. `pnpm db:seed --with-admin` reads
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the environment and refuses a
password under 12 characters.

Staff and admin are separate roles: staff can work through orders, only an
admin can change prices or settings.

## Testing

```bash
pnpm typecheck
pnpm lint
pnpm test          # unit + integration (Vitest, PGlite in memory)
pnpm test:e2e      # Playwright, against a production build
```

Unit and integration tests run against a real PostgreSQL in memory, so
constraints, transactions and the conditional stock update are genuinely
exercised rather than mocked.

The E2E suite signs in **once** and reuses the session (`e2e/auth.setup.ts`).
The earlier version signed in before every admin test and tripped the login
throttle it was meant to be protected by.

For a local E2E run against an already-running server, raise the per-IP
throttles on that server first. Every request in the suite comes from one
address, and it places several orders per run — at the production ceilings a
second run inside the window is rejected by the throttle doing its job:

```bash
pnpm build
RATE_LIMIT_CHECKOUT_PER_IP=500 RATE_LIMIT_LOGIN_PER_IP=500 pnpm start

E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
```

`pnpm test:e2e` on its own starts its own server and sets these for you
(`E2E_SERVER_ENV` in `playwright.config.ts`). The ceilings themselves are
covered in the integration suite, where the window can be controlled.

## Design

The visual identity was approved before the shop was built and has not been
changed. Colours, type and motion are defined once in `src/app/globals.css`.

- **Greens** `#123b2a` and `#1f5138`; **gold** `#c9a45c`; warm neutrals cream
  `#faf7f0`, ivory `#fffdf8`, sand `#f2ead9`.
- Gold is for decoration, display type and small labels on dark surfaces. Small
  gold text on cream uses `--color-gold-700` (`#7c5f26`), which clears WCAG AA;
  the brand gold does not.
- **Cormorant Garamond** for headings, **Manrope** for body, both self-hosted by
  `next/font`.

Contrast notes for every text colour sit next to the tokens in the `@theme`
block.

### Logo

`src/components/Logo.tsx` — a baklava lozenge cut into three filo bands, in
`horizontal`, `stacked` and `mark` lockups from one component. **This is a
proposed identity, not the shop's existing one**; if the owner has artwork,
replace `LogoMark` and every usage site stays as it is.

The `arabic` prop adds **حلويات عمون**. That is the standard literal rendering
of the name, not a spelling we have seen the business use — confirm it or drop
the prop.

### Images

Everything goes through `src/components/Photo.tsx`: a 16px blur placeholder
paints immediately and the real file sharpens in. Load detection checks
`complete` at attach time as well as listening for `load`, because a cached
image can finish before React attaches the handler and would otherwise stay
blurred forever.

`public/images/` holds **free-licence Unsplash photos standing in for real
Ammoun Sweets photography**. They match the shop's actual products rather than
generic Western cakes, but they are not photos of this business. Replace a file
of the same name and update its dimensions in `src/data/images.ts`.

### Motion

CSS transitions and keyframes driven by data attributes; no animation library.
`prefers-reduced-motion` turns all of it, including the JavaScript parallax,
into a plain cut.

Two notes for anyone changing it:

- `Reveal` treats "already scrolled past" as revealed, not merely
  "intersecting" — IntersectionObserver coalesces callbacks, and a fast scroll
  would otherwise leave a section permanently invisible.
- Horizontal reveals (`anim="left"` / `"right"`) drop to vertical motion below
  `lg`. The page container is edge to edge on a phone, so a sideways offset
  starts outside the viewport and widens the document.

## Deploying

Needs a Node runtime (not an edge-only one): scrypt and the PostgreSQL driver
both require Node built-ins. No route opts into the edge runtime, so a default
Vercel/Node deployment is correct as-is.

### Migrations are a deploy step, not a runtime one

`runMigrations` reads the SQL files from `process.cwd()/drizzle` with `fs`.
That works in a build container or on your machine, but **not inside a
serverless function**, where the working directory differs and those files are
not bundled. Nothing migrates itself on boot.

So run migrations deliberately, pointed at the production database:

```bash
DATABASE_URL="postgresql://…" pnpm db:migrate
DATABASE_URL="postgresql://…" SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=…   pnpm db:seed --with-admin      # first deploy only
```

Migrations are recorded in `__drizzle_migrations`, so re-running is a no-op and
safe. If you would rather not remember, set the platform's build command to
`pnpm db:migrate && pnpm build` — but note it then runs on every deploy,
including preview builds, against whatever `DATABASE_URL` that environment has.

### Order of operations

1. Provision PostgreSQL and set `DATABASE_URL`. **Make it available at build
   time as well as runtime** — `sitemap.xml` is statically generated and reads
   products from the database. It degrades to the static routes if the database
   is unreachable, so a missing value costs you product URLs in the sitemap
   rather than a failed build.
2. Set `SESSION_SECRET` (`openssl rand -base64 32`). The app refuses to start
   in production without it.
3. Set `APP_URL` to the real origin — used in the links inside order emails.
4. Run the migration and seed commands above.
5. Verify a sending domain with the email provider and set `EMAIL_FROM`,
   `RESEND_API_KEY` and `EMAIL_PROVIDER=resend`.
6. Open the site to search engines — see below.

There is nothing to configure for payments. Orders are paid in the shop, and
staff tick them off from the admin.

`.env.example` documents every variable. No secret has a default.

### A note on serverless and PGlite

`@electric-sql/pglite` stays a dependency because the tests and local
development use it, and it is listed in `serverExternalPackages`. It is never
loaded when `DATABASE_URL` is a `postgresql://` URL. Do not point a deployed
instance at `file:./.pglite` — a serverless filesystem is ephemeral and
single-process, so it would lose data between invocations.

### Rate limits behind a proxy

`clientIp()` reads `x-forwarded-for`. That is correct behind Vercel,
Cloudflare or any load balancer that overwrites the header, and **wrong if the
app is ever exposed directly** — a client could then set the header itself and
sidestep every per-IP throttle. Confirm the edge in front of this app strips
client-supplied copies.

## Still to confirm with the owner

The application is complete; these are business facts nobody on the build side
can invent. Each is a setting, not a code change — except the first two.

- **`src/app/robots.ts` disallows all crawling**, and `metadata.robots` in
  `src/app/layout.tsx` is `index: false`. Both were set so the demo could not
  be indexed. **Change them at launch or the site will not appear in Google.**
- **`business.siteUrl`** is a placeholder domain. It feeds canonical URLs, Open
  Graph, the sitemap and the structured data.
- **GST.** `/admin/settings` currently treats prices as GST-free. Whether the
  business is registered, and which items are taxable, needs the owner's
  accountant — Australian GST on food is not uniform. Nothing is hardcoded; the
  setting is there and deliberately unset.
- **Delivery.** Postcodes, fee, minimum spend and any free-delivery threshold
  are all empty until the owner sets them. Delivery is off by default.
- **Opening hours and pickup slots**, including public holidays.
- **Refund policy** text, and the official contact email for order
  notifications.
- **Allergens and dietary labels.** Nothing is marked gluten-free, nut-free,
  vegan or halal. These are safety and compliance claims and must come from the
  business, not from a description.
- **Prices and product names** were seeded from publicly listed information and
  need checking line by line before launch.

## Deliberate omissions

Nothing claims a founding year, family history, owner's name, award, halal
certification, ingredient sourcing or delivery radius. None of it could be
verified, so none of it is stated.

The `Bakery` structured data in `src/components/JsonLd.tsx` omits
`aggregateRating` on purpose: republishing a Google rating as your own
structured data is against Google's guidelines. The rating is shown visually
and attributed to Google instead.
