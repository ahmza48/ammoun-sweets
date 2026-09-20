import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

    // Photos are content, not chrome — a long cache is safe because a new
    // photo means a new file and a new build.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
