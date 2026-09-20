import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * The site's three button treatments.
 *  - gold      primary action (Order Online, Explore Our Sweets)
 *  - outline   secondary on a dark surface
 *  - ghost     secondary on cream
 *
 * All of them are links in practice; `ButtonBase` keeps the styling in one
 * place so a <button> in the enquiry form matches exactly.
 */

export type ButtonVariant = "gold" | "outline" | "ghost";
export type ButtonSize = "md" | "lg";

/**
 * `relative overflow-hidden` and `isolate` are here for the gold variant's
 * shine sweep — a pseudo-element that travels across the button on hover.
 * Keeping them on the base means every variant clips its own effects.
 */
const base =
  "group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden " +
  "rounded-full font-sans font-semibold tracking-[0.1em] uppercase " +
  "transition-all duration-300 ease-[var(--ease-soft)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  gold:
    "bg-gold-400 text-forest-900 shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset] " +
    "hover:bg-gold-300 hover:shadow-[0_6px_20px_-8px_rgba(201,164,92,0.75)] hover:-translate-y-px " +
    "active:translate-y-0 " +
    // Light sweeps across the face on hover — the gold equivalent of a sheen
    // on foil packaging. Pure CSS, one composited layer, no JS.
    "before:pointer-events-none before:absolute before:inset-y-0 before:-left-1/3 before:-z-10 " +
    "before:w-1/3 before:bg-[linear-gradient(100deg,transparent,rgba(255,253,248,0.65),transparent)] " +
    "before:opacity-0 hover:before:animate-[shimmer_0.85s_var(--ease-soft)] hover:before:opacity-100",
  outline:
    "border border-gold-400/55 text-gold-200 hover:border-gold-400 hover:bg-gold-400/10 " +
    "hover:text-gold-100 hover:-translate-y-px active:translate-y-0",
  ghost:
    "border border-forest-800/25 text-forest-800 hover:border-forest-800/50 " +
    "hover:bg-forest-800/5 hover:-translate-y-px active:translate-y-0",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-[0.7rem] sm:text-[0.73rem]",
  lg: "px-6 py-3.5 text-[0.73rem] sm:px-8 sm:text-[0.78rem]",
};

function classesFor(variant: ButtonVariant, size: ButtonSize, className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Set for off-site destinations (ordering platform, Google Maps). */
  external?: boolean;
} & Omit<ComponentProps<"a">, "href" | "className" | "children">;

export function ButtonLink({
  href,
  children,
  variant = "gold",
  size = "md",
  className,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const cls = classesFor(variant, size, className);

  if (external || href.startsWith("http") || href.startsWith("tel:")) {
    return (
      <a
        href={href}
        className={cls}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ComponentProps<"button">;

export function Button({
  children,
  variant = "gold",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
