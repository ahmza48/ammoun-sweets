import Link from "next/link";

/**
 * AMMOUN SWEETS — logotype.
 *
 * ── The mark ──────────────────────────────────────────────────────────────
 * A lozenge cut into three filo bands: the diamond is how baklava is cut, and
 * the horizontal cuts are its layers. It was chosen over the obvious
 * alternatives — an "A" monogram (generic), an arch (read as a doorway), a
 * plain diamond (read as a gem) — because it says *this* category of shop at a
 * glance and still holds together at 16px.
 *
 * It is drawn as three filled paths rather than one shape with an SVG mask, so
 * there are no element ids to collide when the logo appears more than once on
 * a page, and no need for `useId` — which would force this to be a Client
 * Component for no reason. `stroke-linejoin: round` on each band softens the
 * points so it reads as confectionery rather than as a warning sign.
 *
 * ── Status ────────────────────────────────────────────────────────────────
 * This is a PROPOSED identity, not the shop's existing one. No official
 * Ammoun Sweets logo could be found in their public material. If the owner has
 * artwork, replace `LogoMark` with an <Image> or an inline SVG of it and keep
 * these props — every usage site stays as it is.
 */

type LogoTone = "light" | "dark";

type LogoProps = {
  /** "light" = gold on a dark surface. "dark" = deep green on cream. */
  tone?: LogoTone;
  /** Mark beside the wordmark (header) or above it (footer, large use). */
  variant?: "horizontal" | "stacked" | "mark";
  /** Render as a link to home. Off for the footer's non-interactive lockup. */
  asLink?: boolean;
  /**
   * Adds "حلويات عمون" under the wordmark.
   *
   * NEEDS OWNER CONFIRMATION: this is the standard literal rendering of the
   * name, not a spelling we have seen the business use themselves. Remove the
   * prop if they write it differently.
   */
  arabic?: boolean;
  /** Mark size in pixels. Defaults suit the header and footer respectively. */
  markSize?: number;
  className?: string;
};

/** The bare mark — also used for the favicon and any square icon slot. */
export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Top band */}
      <path d="M32 8 42.9 18.9 21.1 18.9Z" />
      {/* Middle band — the widest layer, through the lozenge's points */}
      <path d="M47.5 23.5 56 32 47.5 40.5 16.5 40.5 8 32 16.5 23.5Z" />
      {/* Bottom band */}
      <path d="M42.9 45.1 32 56 21.1 45.1Z" />
    </svg>
  );
}

function Wordmark({
  tone,
  scale = 1,
  arabic = false,
}: {
  tone: LogoTone;
  scale?: number;
  arabic?: boolean;
}) {
  const ink = tone === "light" ? "text-gold-300" : "text-forest-800";
  const rule = tone === "light" ? "bg-gold-400/45" : "bg-forest-800/30";

  return (
    <span className={`flex flex-col leading-none ${ink}`} style={{ gap: 5 * scale }}>
      <span
        className="font-display font-semibold"
        style={{
          fontSize: 22 * scale,
          // The trailing letterspace would otherwise push the word off-centre.
          letterSpacing: `${0.3 * scale}em`,
          textIndent: `${0.3 * scale}em`,
        }}
      >
        AMMOUN
      </span>

      <span className="flex items-center" style={{ gap: 7 * scale }}>
        <span aria-hidden="true" className={`h-px flex-1 ${rule}`} />
        <span
          className="font-display font-medium"
          style={{
            fontSize: 11 * scale,
            letterSpacing: `${0.42 * scale}em`,
            textIndent: `${0.42 * scale}em`,
          }}
        >
          SWEETS
        </span>
        <span aria-hidden="true" className={`h-px flex-1 ${rule}`} />
      </span>

      {arabic ? (
        <span
          lang="ar"
          dir="rtl"
          className="text-center opacity-65"
          style={{ fontSize: 12 * scale, marginTop: 3 * scale }}
        >
          حلويات عمون
        </span>
      ) : null}
    </span>
  );
}

export function Logo({
  tone = "light",
  variant = "horizontal",
  asLink = true,
  arabic = false,
  markSize,
  className = "",
}: LogoProps) {
  const markColor = tone === "light" ? "text-gold-300" : "text-forest-800";
  const divider = tone === "light" ? "bg-gold-400/30" : "bg-forest-800/22";

  let inner: React.ReactNode;

  if (variant === "mark") {
    inner = <LogoMark size={markSize ?? 32} className={markColor} />;
  } else if (variant === "stacked") {
    inner = (
      <span className={`inline-flex w-fit flex-col items-center gap-3.5 ${className}`}>
        <LogoMark size={markSize ?? 42} className={markColor} />
        <Wordmark tone={tone} scale={1} arabic={arabic} />
      </span>
    );
  } else {
    inner = (
      <span className={`inline-flex w-fit items-center gap-3 ${className}`}>
        <LogoMark size={markSize ?? 32} className={`shrink-0 ${markColor}`} />
        <span aria-hidden="true" className={`h-7 w-px shrink-0 ${divider}`} />
        <Wordmark tone={tone} scale={0.9} />
      </span>
    );
  }

  if (variant === "mark" && className) {
    inner = <span className={className}>{inner}</span>;
  }

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
