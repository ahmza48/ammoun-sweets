# Image tooling (not part of the build)

These scripts assembled the demo's placeholder photography set. They are kept
so the set can be regenerated or extended, and are excluded from lint and the
Next build.

| Script | Purpose |
| --- | --- |
| `search-unsplash.mjs` | Searches Unsplash and caches results in `unsplash.json`. |
| `download-images.mjs` | Downloads the chosen photos into `public/images` and writes `images.manifest.json`. |
| `finalize-images.mjs` | Adds intrinsic dimensions and the 16px blur placeholders to the manifest. |
| `optimise-sources.mjs` | Caps each source file's long edge and file size. |
| `replace-images.mjs` / `swap-one.mjs` | Swap an individual photo for another. |
| `gen-images-ts.mjs` | **Run this after any change** — regenerates `src/data/images.ts` and `public/images/README.md` from the manifest. |

```bash
node scripts/gen-images-ts.mjs
```

## One rule when adding photos

Only use photos served from `images.unsplash.com`. Anything on
`plus.unsplash.com` (or with `premium_photo` in the URL) is Unsplash+: it is
watermarked for non-subscribers and is not free to reuse. `replace-images.mjs`
asserts this; do the same for anything added by hand.
