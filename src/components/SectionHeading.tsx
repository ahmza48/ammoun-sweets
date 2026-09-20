import type { ReactNode } from "react";
import { Ornament } from "./Ornament";
import { Reveal } from "./Reveal";

/**
 * The recurring section header: gold eyebrow, serif title, supporting line.
 * `tone` flips the whole thing for dark (green) sections.
 */

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: "light" | "dark";
  align?: "center" | "left";
  /** Heading level — keeps the document outline correct per page. */
  as?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  tone = "dark",
  align = "center",
  as: Tag = "h2",
  className = "",
}: SectionHeadingProps) {
  const isDarkSurface = tone === "light";

  const eyebrowColor = isDarkSurface ? "text-gold-400" : "text-gold-700";
  const titleColor = isDarkSurface ? "text-ivory" : "text-forest-800";
  const subtitleColor = isDarkSurface ? "text-gold-100/75" : "text-ink-soft";
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <Reveal className={`flex flex-col ${alignment} ${className}`}>
      {eyebrow ? (
        <p className={`eyebrow ${eyebrowColor}`}>{eyebrow}</p>
      ) : null}

      <Tag
        className={`mt-4 text-[2rem] leading-[1.06] sm:text-[2.6rem] lg:text-[3.1rem] ${titleColor}`}
      >
        {title}
      </Tag>

      <Ornament
        tone={isDarkSurface ? "light" : "dark"}
        width="sm"
        className={`mt-5 ${align === "center" ? "mx-auto" : ""}`}
      />

      {subtitle ? (
        <p
          className={`mt-5 max-w-[46ch] text-[0.98rem] leading-[1.7] ${subtitleColor}`}
        >
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}
