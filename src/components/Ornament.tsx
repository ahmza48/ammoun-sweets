import type { CSSProperties } from "react";

/**
 * Gold hairline divider with a small four-point star. Decorative only.
 *
 * The two rules draw outwards from the star when a surrounding <Reveal> flips
 * `data-revealed`. An ornament with no Reveal around it — the footer, the page
 * heroes, the 404 — is simply drawn, with no animation. See the
 * `[data-ornament-rule]` rules in globals.css.
 */

type OrnamentProps = {
  tone?: "light" | "dark";
  /** Constrain the rule width; `full` spans the container. */
  width?: "sm" | "md" | "full";
  className?: string;
  style?: CSSProperties;
};

const widths = {
  sm: "max-w-[7rem]",
  md: "max-w-[18rem]",
  full: "max-w-none",
} as const;

export function Ornament({
  tone = "dark",
  width = "md",
  className = "",
  style,
}: OrnamentProps) {
  const rule = tone === "light" ? "bg-gold-400/40" : "bg-gold-500/40";
  const star = tone === "light" ? "text-gold-400" : "text-gold-500";

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`flex w-full items-center gap-3 ${widths[width]} ${className}`}
    >
      <span data-ornament-rule="left" className={`h-px flex-1 ${rule}`} />
      <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 shrink-0 ${star}`} fill="currentColor">
        <path d="M6 0c.5 3.2 2.3 5 5.5 6C8.3 7 6.5 8.8 6 12c-.5-3.2-2.3-5-5.5-6C3.7 5 5.5 3.2 6 0Z" />
      </svg>
      <span data-ornament-rule="right" className={`h-px flex-1 ${rule}`} />
    </div>
  );
}

/** Three descending dots — a lighter-weight separator for card interiors. */
export function OrnamentDots({
  tone = "dark",
  className = "",
}: Pick<OrnamentProps, "tone" | "className">) {
  const dot = tone === "light" ? "bg-gold-400/70" : "bg-gold-500/60";
  return (
    <div aria-hidden="true" className={`flex items-center gap-1.5 ${className}`}>
      <span className={`h-1 w-1 rounded-full ${dot}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className={`h-1 w-1 rounded-full ${dot}`} />
    </div>
  );
}
