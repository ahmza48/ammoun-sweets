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

## Photography is a placeholder — replace it

`public/images/` contains free-licence Unsplash photos standing in for real
Ammoun Sweets photography. They were chosen to match the shop's actual products
(pistachio baklava, knafeh, ashta sweets, gift trays) rather than generic
Western cakes, but **they are not photos of this business.**

To replace one: drop a file with the same name into `public/images/`, then
update its `width`, `height` and `alt` in `src/data/images.ts` and delete its
`credit` fields. When no entry has a `credit`, the placeholder attribution note
at the bottom of the footer disappears by itself. See
`public/images/README.md` for the full list.

`scripts/` holds the tooling used to assemble that set
(`gen-images-ts.mjs` regenerates `src/data/images.ts` and the image README from
`scripts/images.manifest.json`). It is not part of the build.

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

## Deliberate omissions

Nothing on this site claims a founding year, a family history, an owner's name,
an award, halal certification, ingredient sourcing, a delivery radius or a
specific catering capability. None of that could be verified, so it is not
stated — the copy uses safe marketing language instead.

The `Bakery` structured data in `src/components/JsonLd.tsx` deliberately omits
`aggregateRating`: republishing a Google rating as your own structured data is
against Google's guidelines. The rating is shown visually and attributed to
Google instead.
