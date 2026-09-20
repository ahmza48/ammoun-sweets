import type { Review } from "@/data/reviews";

/** A single public review snippet, attributed to its source. */

export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col rounded-[var(--radius-lg-card)] border border-gold-400/22 bg-forest-800/55 p-7 backdrop-blur-sm transition-colors duration-500 hover:border-gold-400/45 sm:p-8">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0 text-gold-400/55"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.4 5.5c-3.3 1.6-5.4 4.6-5.4 8.3 0 2.9 1.7 4.7 4 4.7 2 0 3.6-1.5 3.6-3.5 0-1.9-1.4-3.3-3.2-3.3-.3 0-.7 0-1 .2.5-1.8 1.9-3.4 3.7-4.4l-1.7-2Zm9.3 0c-3.3 1.6-5.4 4.6-5.4 8.3 0 2.9 1.7 4.7 4 4.7 2 0 3.6-1.5 3.6-3.5 0-1.9-1.4-3.3-3.2-3.3-.3 0-.7 0-1 .2.5-1.8 1.9-3.4 3.7-4.4l-1.7-2Z" />
      </svg>

      <blockquote className="mt-5 flex-1">
        <p className="font-display text-[1.32rem] leading-[1.45] text-ivory sm:text-[1.42rem]">
          &ldquo;{review.quote}&rdquo;
        </p>
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-gold-400/18 pt-5">
        <span className="text-[0.85rem] font-medium text-cream/75">
          {review.author}
        </span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold-400/50" />
        <span className="eyebrow text-gold-400">via {review.source}</span>
      </figcaption>
    </figure>
  );
}
