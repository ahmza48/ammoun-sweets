import {
  addressLines,
  business,
  formatTimeRange,
  groupedHours,
} from "@/data/business";
import { ButtonLink } from "./Button";
import { Ornament } from "./Ornament";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/**
 * Visit-us block: address, hours, actions and an embedded Google map.
 *
 * The map iframe is `loading="lazy"` so it never competes with the hero for
 * bandwidth, and it carries a title for screen readers.
 */

type LocationSectionProps = {
  /** Home page uses "compact"; the Visit page uses the full treatment. */
  variant?: "compact" | "full";
};

export function LocationSection({ variant = "compact" }: LocationSectionProps) {
  const hours = groupedHours();
  const mapQuery = encodeURIComponent(
    `${business.name}, ${business.address.street}, ${business.address.suburb} ${business.address.state} ${business.address.postcode}`,
  );

  return (
    <section
      id="visit"
      className="relative overflow-hidden bg-forest-800 py-16 sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(95%_70%_at_12%_10%,rgba(201,164,92,0.14),transparent_60%)]"
      />

      <div className="container-page relative">
        <SectionHeading
          eyebrow="Find Us"
          title="Visit Ammoun Sweets"
          subtitle="On the Hume Highway at Bass Hill — walk in, take a look at the counter, and pick what you feel like."
          tone="light"
        />

        <div className="mt-12 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-12">
          {/* — Details ——————————————————————————————————————— */}
          <Reveal className="flex flex-col justify-center">
            <div className="rounded-[var(--radius-lg-card)] border border-gold-400/25 bg-forest-900/55 p-7 backdrop-blur-sm sm:p-9">
              <h3 className="eyebrow text-gold-400">Address</h3>
              <address className="mt-4 not-italic font-display text-[1.5rem] leading-[1.35] text-ivory sm:text-[1.7rem]">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>

              <Ornament tone="light" width="full" className="my-7" />

              <h3 className="eyebrow text-gold-400">Opening Hours</h3>
              <dl className="mt-4 space-y-2.5">
                {hours.map((group) => (
                  <div
                    key={group.label}
                    className="flex items-baseline gap-3 text-[0.95rem]"
                  >
                    <dt className="text-cream/65">{group.label}</dt>
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 translate-y-[-0.2em] bg-gold-400/20"
                    />
                    <dd className="font-medium text-ivory">{group.hours}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-[0.82rem] leading-relaxed text-cream/55">
                {business.hours.note}
              </p>

              <Ornament tone="light" width="full" className="my-7" />

              <h3 className="eyebrow text-gold-400">Phone</h3>
              <a
                href={`tel:${business.phone}`}
                className="mt-3 inline-block font-display text-[1.6rem] text-gold-300 transition-colors duration-300 hover:text-gold-200 sm:text-[1.8rem]"
              >
                {business.displayPhone}
              </a>

              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                <ButtonLink
                  href={business.links.directions}
                  variant="gold"
                  size="lg"
                  external
                >
                  Get Directions
                </ButtonLink>
                <ButtonLink href={`tel:${business.phone}`} variant="outline" size="lg">
                  Call Us
                </ButtonLink>
              </div>
            </div>
          </Reveal>

          {/* — Map ———————————————————————————————————————————— */}
          <Reveal delay={90} className="min-h-[20rem]">
            <div className="h-full overflow-hidden rounded-[var(--radius-lg-card)] border border-gold-400/25">
              <iframe
                title={`Google map showing ${business.name} at ${addressLines.join(", ")}`}
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="h-full min-h-[20rem] w-full border-0 lg:min-h-[32rem]"
              />
            </div>
          </Reveal>
        </div>

        {variant === "full" ? (
          <Reveal className="mt-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoTile label="Getting here">
                Directly on the Hume Highway at Bass Hill, a short drive from
                Bankstown, Yagoona and Chester Hill.
              </InfoTile>
              <InfoTile label="Ordering ahead">
                Call the shop for larger quantities and platters so we can have
                them ready for you.
              </InfoTile>
              <InfoTile label="Delivery">
                Delivery is handled through {business.links.orderPlatform}.
                Delivery windows are shorter than our shop hours
                {business.hours.days[0].open && business.hours.days[0].close
                  ? ` (${formatTimeRange(
                      business.hours.days[0].open,
                      business.hours.days[0].close,
                    )} in store)`
                  : ""}
                .
              </InfoTile>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-gold-400/18 bg-forest-900/40 p-6">
      <h3 className="eyebrow text-gold-400">{label}</h3>
      <p className="mt-3 text-[0.9rem] leading-[1.7] text-cream/70">{children}</p>
    </div>
  );
}
