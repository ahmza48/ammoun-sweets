import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Database drivers must not be bundled.
   *
   * PGlite ships a WebAssembly runtime plus a `.data` file it locates relative
   * to its own module path; bundling rewrites that path to a placeholder and
   * the driver fails at runtime with ERR_INVALID_FILE_URL_PATH — only in a
   * production build, which is exactly where you don't want to find out. `pg`
   * has native bindings with the same problem. Leaving both external makes
   * Next require them from node_modules at runtime.
   */
  serverExternalPackages: ["@electric-sql/pglite", "pg"],

  images: {
    // AVIF first, WebP as the fallback — both are a lot smaller than the
    // source JPEGs for food photography.
    formats: ["image/avif", "image/webp"],

    /**
     * Next's defaults go up to 3840px. Our source photos are at most 1600px on
     * the long edge (see scripts/optimise-sources.mjs), so the larger
     * candidates would just upscale — costing build/optimisation time and
     * bandwidth for no extra detail. The `src` fallback attribute is always the
     * largest entry here, so capping it also keeps non-srcset browsers sane.
     *
     * If the owner supplies higher-resolution photography later, raise these.
     */
    deviceSizes: [384, 640, 750, 828, 1080, 1280, 1600],
    imageSizes: [96, 128, 200, 256, 320],

    /**
     * Next only generates the quality levels listed here, so every value used
     * by a <Photo> has to appear:
     *   45 — dimmed background imagery (page heroes, the order CTA panel),
     *        where the photo sits at 25–30% opacity under a gradient and the
     *        drop in quality is invisible but roughly halves the bytes;
     *   60 — the full-width band on Our Story, partly covered by a scrim;
     *   75 — everything the visitor actually looks at.
     */
    qualities: [45, 60, 75],

    // Photos are content, not chrome — a long cache is safe because a new
    // photo means a new file and a new build.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
