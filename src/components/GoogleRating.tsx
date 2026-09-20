import type { CSSProperties } from "react";
import { business } from "@/data/business";

/**
 * The ONLY place the Google rating is rendered.
 * Both numbers come from `business.google` — change them there, once.
 */

type GoogleRatingProps = {
  tone?: "light" | "dark";
  /** Compact = stars + one line. Full adds the review count chip. */
  variant?: "compact" | "full";
  className?: string;
  style?: CSSProperties;
};

export function GoogleRating({
  tone = "light",
  variant = "compact",
  className = "",
  style,
}: GoogleRatingProps) {
  const { rating, reviewCount, reviewCountIsApproximate } = business.google;
  const onDark = tone === "light";

  const countLabel = reviewCountIsApproximate
    ? `${reviewCount}+ Google reviews`
    : `${reviewCount} Google reviews`;

  return (
    <div style={style} className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <Stars rating={rating} tone={tone} />

      <p
        className={`text-[0.82rem] font-medium ${
          onDark ? "text-gold-100/85" : "text-ink-soft"
        }`}
      >
        <span className={onDark ? "text-gold-200" : "text-forest-800 font-semibold"}>
          {rating.toFixed(1)}
        </span>{" "}
        {variant === "full" ? (
          <>&middot; {countLabel}</>
        ) : (
          <>&middot; loved by our local community</>
        )}
      </p>
    </div>
  );
}

function Stars({ rating, tone }: { rating: number; tone: "light" | "dark" }) {
  const empty = tone === "light" ? "text-gold-400/25" : "text-forest-800/20";
  const full = tone === "light" ? "text-gold-400" : "text-gold-500";
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));

  return (
    <span
      className="relative inline-flex"
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5 on Google`}
    >
      {/* Empty track */}
      <span className={`flex gap-0.5 ${empty}`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} />
        ))}
      </span>
      {/* Filled overlay, clipped to the rating */}
      <span
        className={`absolute inset-0 flex gap-0.5 overflow-hidden ${full}`}
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} />
        ))}
      </span>
    </span>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" className="h-[0.95rem] w-[0.95rem] shrink-0" fill="currentColor">
      <path d="M10 1.2l2.47 5.42 5.93.62-4.43 3.98 1.24 5.83L10 14.1l-5.21 2.97 1.24-5.83L1.6 7.24l5.93-.62L10 1.2z" />
    </svg>
  );
}
