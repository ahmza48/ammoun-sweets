import Link from "next/link";
import { addressLines, business, groupedHours } from "@/data/business";
import { footerNav } from "@/data/navigation";
import { Logo } from "./Logo";
import { Ornament } from "./Ornament";

export function Footer() {
  const year = new Date().getFullYear();
  const hours = groupedHours();

  return (
    <footer className="relative bg-forest-900 text-cream/80">
      {/* Gold hairline cap */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/45 to-transparent"
      />

      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* — Brand ———————————————————————————————————————— */}
          <div className="lg:col-span-4">
            {/* `arabic` is opt-in and flagged in Logo.tsx — confirm the
                spelling with the owner before this goes live. */}
            <Logo
              tone="light"
              variant="stacked"
              asLink={false}
              arabic
              className="items-start"
            />
            <p className="mt-6 max-w-[34ch] text-[0.92rem] leading-[1.75] text-cream/70">
              Traditional Lebanese sweets, pastries and celebration platters,
              made for sharing — on the Hume Highway at Bass Hill.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <SocialLink href={business.links.instagram} label="Instagram">
                <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2a3.8 3.8 0 0 1-.9 1.4 3.8 3.8 0 0 1-1.4.9c-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2a3.8 3.8 0 0 1 .9-1.4 3.8 3.8 0 0 1 1.4-.9c.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1 0-1.7.2-2.1.35-.5.2-.9.4-1.2.8-.4.3-.6.7-.8 1.2-.2.4-.3 1-.4 2.1C2.7 9.7 2.7 10.1 2.7 12s0 2.3.1 3.5c0 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.3.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.06 1.6.07 4.7.07s3.5 0 4.7-.07c1.1 0 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.3.6-.7.8-1.2.2-.4.3-1 .4-2.1.06-1.2.07-1.6.07-3.5s0-2.3-.07-3.5c0-1.1-.2-1.7-.4-2.1a3 3 0 0 0-.8-1.2 3 3 0 0 0-1.2-.8c-.4-.2-1-.3-2.1-.35C15.5 4 15.1 4 12 4Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm6.2-8.2a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
              </SocialLink>
              <SocialLink href={business.links.facebook} label="Facebook">
                <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.5V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
              </SocialLink>
            </div>
          </div>

          {/* — Explore ————————————————————————————————————— */}
          <nav aria-label="Footer — explore" className="lg:col-span-2">
            <FooterHeading>Explore</FooterHeading>
            <ul className="mt-5 space-y-3">
              {footerNav.explore.map((item) => (
                <li key={item.href}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>

            <FooterHeading className="mt-8">More</FooterHeading>
            <ul className="mt-5 space-y-3">
              {footerNav.more.map((item) => (
                <li key={item.href}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
              <li>
                <a
                  href={business.links.order}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.92rem] text-cream/75 transition-colors duration-300 hover:text-gold-300"
                >
                  Order Online
                </a>
              </li>
            </ul>
          </nav>

          {/* — Visit ———————————————————————————————————————— */}
          <div className="lg:col-span-3">
            <FooterHeading>Visit</FooterHeading>
            <address className="mt-5 not-italic text-[0.92rem] leading-[1.8] text-cream/75">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={business.links.directions}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-[0.92rem] text-gold-300 underline-offset-4 transition-colors duration-300 hover:text-gold-200 hover:underline"
            >
              Get directions
            </a>

            <FooterHeading className="mt-8">Hours</FooterHeading>
            <dl className="mt-5 space-y-2 text-[0.92rem] text-cream/75">
              {hours.map((group) => (
                <div key={group.label} className="flex flex-wrap gap-x-2">
                  <dt className="text-cream/60">{group.label}</dt>
                  <dd>{group.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* — Contact ——————————————————————————————————————— */}
          <div className="lg:col-span-3">
            <FooterHeading>Contact</FooterHeading>
            <ul className="mt-5 space-y-3 text-[0.92rem]">
              <li>
                <a
                  href={`tel:${business.phone}`}
                  className="text-cream/75 transition-colors duration-300 hover:text-gold-300"
                >
                  {business.displayPhone}
                </a>
              </li>
              <li className="text-cream/55">
                For large orders and platters, call the shop or send an enquiry.
              </li>
              <li>
                <Link
                  href="/catering#enquiry"
                  className="text-gold-300 underline-offset-4 transition-colors duration-300 hover:text-gold-200 hover:underline"
                >
                  Enquire about a large order
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Ornament tone="light" width="full" className="mt-12" />

        <div className="mt-8 flex flex-col gap-4 text-[0.78rem] text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} {business.name}. All rights reserved.</p>
          <p>
            {business.address.suburb}, {business.address.state} &middot;{" "}
            <a
              href={`tel:${business.phone}`}
              className="transition-colors duration-300 hover:text-gold-300"
            >
              {business.displayPhone}
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}

function FooterHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`eyebrow text-gold-400 ${className}`}>{children}</h2>;
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[0.92rem] text-cream/75 transition-colors duration-300 hover:text-gold-300"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — opens in a new tab`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/30 text-gold-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/70 hover:bg-gold-400/10"
    >
      <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="currentColor" aria-hidden="true">
        {children}
      </svg>
    </a>
  );
}
