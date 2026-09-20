# Ammoun Sweets — website demo

A sales demo for **Ammoun Sweets**, a Lebanese sweets and pastry shop at
972 Hume Highway, Bass Hill NSW. Built to show the owner what their site could
look like, and structured so it can become the production site rather than
being thrown away.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint
npm run typecheck
```

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.

---

## Everything an owner would want to change lives in `src/data/`

No business fact, price or photo is hard-coded in a component. To update the
site you edit one of these files and nothing else:

| File | Holds |
| --- | --- |
| `src/data/business.ts` | Name, address, phone, coordinates, opening hours, Google rating, all external links |
| `src/data/menu.ts` | Every category, item, description, size and price |
| `src/data/navigation.ts` | Header and footer navigation |
| `src/data/gallery.ts` | Gallery photos, categories and captions |
| `src/data/reviews.ts` | Public review snippets |
| `src/data/occasions.ts` | Occasion cards and enquiry-form options |
| `src/data/images.ts` | The image registry (generated — see below) |

The Google rating appears in exactly one component (`GoogleRating`), which
reads `business.google`. Opening hours are rendered from `business.hours` in
both the footer and the Visit page, and feed the search-engine structured data,
so they can never disagree.

## Pages

| Route | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/our-story` | `src/app/our-story/page.tsx` |
| `/menu` | `src/app/menu/page.tsx` |
| `/gallery` | `src/app/gallery/page.tsx` |
| `/catering` | `src/app/catering/page.tsx` |
| `/visit` | `src/app/visit/page.tsx` |
| `/robots.txt`, `/sitemap.xml` | generated from the nav + business data |

All pages are statically prerendered.

## Brand system

Defined once as CSS custom properties in `src/app/globals.css`:

- **Greens** `#123b2a` (primary) and `#1f5138` (secondary), plus darker shades
  for the header, footer and overlays.
- **Gold** `#c9a45c`. Used for decoration, large display type and small labels
  on dark surfaces. On cream, small text uses `--color-gold-700` (`#7c5f26`),
  which clears WCAG AA; the brand gold does not.
- **Warm neutrals** cream `#faf7f0`, ivory `#fffdf8`, sand `#f2ead9`.
- **Type** Cormorant Garamond for headings, Manrope for body — both self-hosted
  by `next/font`, so there is no render-blocking request to Google Fonts.

Every text colour on the site was checked against its real background; the
contrast notes are in the `@theme` block.

## Logo

`src/components/Logo.tsx`. The mark is a **baklava lozenge cut into three filo
bands** — the diamond is how baklava is cut, the horizontal cuts are its
layers. It was picked over an "A" monogram (generic), an arch (read as a
doorway) and a plain diamond (read as a gem) because it says *this* category of
shop at a glance and still holds together at 16px.

Three lockups, all from the same component:

| `variant` | Used for |
| --- | --- |
| `horizontal` | Header — mark, gold hairline divider, stacked wordmark |
| `stacked` | Footer and large use — mark above the wordmark |
| `mark` | Any square icon slot; the same paths are in `public/favicon.svg` |

The wordmark is Cormorant Garamond with wide tracking and a rule either side of
"SWEETS". Two implementation notes:

- The mark is three filled paths, not one shape behind an SVG mask. A mask
  needs an element `id`, which collides when the logo appears twice on a page
  and would otherwise mean `useId` — forcing this into a Client Component for
  no reason.
- `arabic` adds **حلويات عمون** under the wordmark (on in the footer). This is
  the standard literal rendering of the name, **not** a spelling we have seen
  the business use — confirm it with the owner or drop the prop.

**This is a proposed identity, not the shop's existing one.** No official
Ammoun Sweets logo appears in their public material. If the owner has artwork,
replace `LogoMark` and keep the props — every usage site stays as it is.

## Images

Every photo on the site goes through one component, `src/components/Photo.tsx`,
so loading behaviour is tuned in a single place:

- **Nothing ever renders as an empty box.** A 16px blur placeholder paints
  immediately, then the real file arrives and sharpens into focus over ~800ms.
  Load detection listens on the DOM node *and* checks `complete` at attach
  time, because an image served from cache can finish before React attaches a
  handler — and an image that never reports back would stay blurred forever.
- **Nothing is downloaded larger than it is displayed.** Every call site passes
  an honest `sizes`, and `next.config.ts` caps `deviceSizes` at 1600px so Next
  never upscales past the source files.
- **Dimmed background imagery is requested at `quality={45}`.** At 25–30%
  opacity behind a gradient the difference is invisible and it roughly halves
  the bytes. Any quality used has to be listed in `images.qualities`.
- **AVIF first, WebP second**, both generated on demand and cached for 30 days.

The home page loads ~95KB of imagery above the fold and measures **CLS 0.000**.

### The photography is a placeholder — replace it

`public/images/` contains free-licence Unsplash photos standing in for real
Ammoun Sweets photography. They were chosen to match the shop's actual products
(pistachio baklava, knafeh, ashta sweets, gift trays) rather than generic
Western cakes, but **they are not photos of this business.**

To replace one: drop a file with the same name into `public/images/`, then
update its `width`, `height` and `alt` in `src/data/images.ts`. See
`public/images/README.md` for the full list. The `credit` fields there record
provenance and are not rendered anywhere — the Unsplash License does not
require attribution.

`scripts/` holds the tooling used to assemble the placeholder set
(`gen-images-ts.mjs` regenerates `src/data/images.ts` and the image README from
`scripts/images.manifest.json`). It is not part of the build.

## Motion

All of it is CSS transitions and keyframes driven by data attributes; there is
no animation library. The rules live together at the bottom of
`src/app/globals.css`.

| Effect | Where |
| --- | --- |
| Staggered entrance on the hero, running at load rather than on scroll | `Hero.tsx`, `hero-enter` |
| Scroll reveals with `up` / `fade` / `left` / `right` / `rise` variants | `Reveal.tsx`, `[data-anim]` |
| Gold ornament rules drawing outwards from their centre star | `Ornament.tsx`, `[data-ornament-rule]` |
| Photos sharpening into focus as they load | `Photo.tsx`, `[data-photo]` |
| Gentle parallax inside fixed picture frames | `Parallax.tsx` |
| Reading-progress rule and logotype settle in the header | `Header.tsx` |
| Shine sweep across the primary button | `Button.tsx` |
| Fade-up on route change | `src/app/template.tsx` |
| Lightbox scale-in, restarting per photo | `GalleryGrid.tsx` |

Two things worth knowing if you change any of it:

- `prefers-reduced-motion` turns **all** of it into a plain cut, including the
  JavaScript-driven parallax, which checks the media query itself via
  `src/lib/useReducedMotion.ts`. Verified: with reduced motion on, all 28
  reveals are visible before any scrolling and parallax never runs.
- `Reveal` treats "already scrolled past" as revealed, not just
  "intersecting". IntersectionObserver coalesces its callbacks, so a fast flick
  of the wheel can carry an element from below the fold to above it between two
  deliveries — without that fallback, the section would stay invisible.

## Before this goes live

These are wired up but deliberately flagged:

- `src/app/robots.ts` currently **disallows all crawling** so the demo can't be
  indexed. Swap `disallow` for `allow: "/"` at launch.
- `metadata.robots` in `src/app/layout.tsx` is `index: false` for the same
  reason.
- `business.siteUrl` is a placeholder domain. It feeds canonical URLs, Open
  Graph, the sitemap and the structured data.
- The catering enquiry form composes an email in the visitor's mail client
  because no enquiry inbox has been confirmed. `handleSubmit` in
  `src/components/EnquiryForm.tsx` is the one place to swap in a real POST.
- The logo is a proposal and the Arabic wordmark is unconfirmed — see **Logo**.
- The photography is placeholder stock — see **Images**.

## Deliberate omissions

Nothing on this site claims a founding year, a family history, an owner's name,
an award, halal certification, ingredient sourcing, a delivery radius or a
specific catering capability. None of that could be verified, so it is not
stated — the copy uses safe marketing language instead.

The `Bakery` structured data in `src/components/JsonLd.tsx` deliberately omits
`aggregateRating`: republishing a Google rating as your own structured data is
against Google's guidelines. The rating is shown visually and attributed to
Google instead.
