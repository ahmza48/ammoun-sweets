import { business } from "@/data/business";
import { Photo } from "./Photo";
import { ButtonLink } from "./Button";
import { Ornament } from "./Ornament";
import { Reveal } from "./Reveal";

/**
 * Ordering call-to-action.
 *
 * Deliberately points at the real external ordering platform rather than
 * faking an in-house checkout — see `business.links.order`.
 */

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-cream py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-lg-card)] bg-forest-900">
            {/* Sits at 30% behind a near-opaque gradient — low quality is
                invisible here and roughly halves the transfer size. */}
            <Photo
              image="mixed-platter"
              decorative
              fill
              quality={45}
              sizes="(min-width: 1280px) 76rem, 100vw"
              className="object-cover opacity-30"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/88 to-forest-900/65"
            />

            <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
              <div className="max-w-xl">
                <p className="eyebrow text-gold-400">Order Online</p>
                <h2 className="mt-5 text-[2rem] leading-[1.08] text-ivory sm:text-[2.6rem] lg:text-[2.9rem]">
                  Sweets on the way,
                  <span className="block font-normal italic text-gold-300">
                    or ready when you arrive.
                  </span>
                </h2>

                <Ornament tone="light" width="sm" className="mt-6" />

                <p className="mt-6 max-w-[44ch] text-[0.98rem] leading-[1.75] text-cream/75">
                  Order for delivery through{" "}
                  {business.links.orderPlatform}, or call the shop and we will
                  have your order boxed and waiting.
                </p>

                <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                  <ButtonLink
                    href={business.links.order}
                    variant="gold"
                    size="lg"
                    external
                  >
                    Order on {business.links.orderPlatform}
                  </ButtonLink>
                  <ButtonLink
                    href={`tel:${business.phone}`}
                    variant="outline"
                    size="lg"
                  >
                    Call to Order
                  </ButtonLink>
                </div>

                <p className="mt-6 text-[0.8rem] text-cream/45">
                  Delivery hours are set by the platform and are shorter than
                  our shop hours.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
