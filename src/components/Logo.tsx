import Link from "next/link";

/**
 * TEMPORARY LOGOTYPE — replace with the official Ammoun Sweets logo.
 *
 * This is a type-only wordmark, deliberately not an invented emblem: a
 * two-line serif lockup with a small ornamental mark between the words.
 * When the owner supplies artwork, swap the inner markup for an <Image>
 * (or inline SVG) and keep the same props — every usage site stays put.
 */

type LogoProps = {
  /** "light" = gold-on-dark (header over hero, footer). "dark" = on cream. */
  tone?: "light" | "dark";
  /** Render as a link to home. Off for the footer's non-interactive lockup. */
  asLink?: boolean;
  className?: string;
};

export function Logo({ tone = "light", asLink = true, className = "" }: LogoProps) {
  const wordmarkColor = tone === "light" ? "text-gold-300" : "text-forest-800";
  const ruleColor =
    tone === "light"
      ? "bg-gold-400/50"
      : "bg-gold-500/55";
  const markColor = tone === "light" ? "text-gold-400" : "text-gold-500";

  // `w-fit` keeps the ornamental rule the width of the wordmark — without it
  // the rule stretches to fill whatever column the lockup sits in.
  const inner = (
    <span className={`inline-flex w-fit flex-col items-center leading-none ${className}`}>
      <span
        className={`font-display text-[1.05rem] font-semibold tracking-[0.34em] sm:text-[1.2rem] ${wordmarkColor}`}
      >
        AMMOUN
      </span>

      {/* Ornamental rule: hairline — four-point star — hairline */}
      <span className="mt-[0.3rem] flex w-full items-center gap-1.5" aria-hidden="true">
        <span className={`h-px flex-1 ${ruleColor}`} />
        <svg viewBox="0 0 12 12" className={`h-2 w-2 ${markColor}`} fill="currentColor">
          <path d="M6 0c.5 3.2 2.3 5 5.5 6C8.3 7 6.5 8.8 6 12c-.5-3.2-2.3-5-5.5-6C3.7 5 5.5 3.2 6 0Z" />
        </svg>
        <span className={`h-px flex-1 ${ruleColor}`} />
      </span>

      <span
        className={`mt-[0.3rem] font-display text-[0.7rem] font-medium tracking-[0.46em] sm:text-[0.78rem] ${wordmarkColor}`}
      >
        SWEETS
      </span>
    </span>
  );

  if (!asLink) return inner;

  return (
    <Link
      href="/"
      aria-label="Ammoun Sweets — home"
      className="inline-block rounded-sm transition-opacity duration-300 hover:opacity-85"
    >
      {inner}
    </Link>
  );
}
