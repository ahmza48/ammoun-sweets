/**
 * Customer reviews.
 *
 * These are short verbatim snippets from Ammoun Sweets' public Google reviews
 * as republished on public directory listings. Nothing here is written by us.
 *
 * RULES for adding more:
 *  - copy the wording exactly, don't tidy it up or change its meaning;
 *  - only use reviews that are publicly visible;
 *  - keep `source` accurate;
 *  - if a reviewer's full name isn't public, leave `author` as a first name or
 *    "Google reviewer". Never invent a name, a photo or a rating.
 */

export type Review = {
  id: string;
  quote: string;
  author: string;
  source: "Google";
  /** Star rating if the source shows one for that individual review. */
  rating?: number;
};

export const reviews: Review[] = [
  {
    id: "r1",
    quote:
      "Love Ammoun Sweets. Very clean place, feels very homey. The workers are very generous people.",
    author: "Google reviewer",
    source: "Google",
  },
  {
    id: "r2",
    quote: "The best sweets I've ever tasted, amazing customer service.",
    author: "Google reviewer",
    source: "Google",
  },
  {
    id: "r3",
    quote: "The best place to be having the taste of a real Lebanese sweets.",
    author: "Google reviewer",
    source: "Google",
  },
];
