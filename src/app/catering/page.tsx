import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { ButtonLink } from "@/components/Button";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Ornament } from "@/components/Ornament";
import { PageHero } from "@/components/PageHero";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { business } from "@/data/business";
import { occasions } from "@/data/occasions";

export const metadata: Metadata = {
  title: "Catering & Events — Sweet Platters for Every Celebration",
  description:
    "Planning an event? Enquire about larger orders, gift platters and mixed Lebanese sweet selections from Ammoun Sweets in Bass Hill, NSW.",
  alternates: { canonical: "/catering" },
};

/**
 * IMPORTANT: no specific catering capability is promised anywhere on this
 * page — no minimum order, no lead time, no delivery radius, no setup
 * service. Everything is phrased as "tell us and we'll see what we can do",
 * because none of that has been confirmed with the owner.
 */

export default function CateringPage() {
  return (
    <>
      <PageHero
        eyebrow="Catering & Large Orders"
        title={
          <>
            Sweets for Every
            <span className="block font-normal italic text-gold-300">
              Celebration.
            </span>
          </>
        }
        subtitle="Planning an event or need a larger order? Tell us what you have in mind and our team can help you organise the right selection."
        image="celebration-table"
      />

      {/* — Intro ——————————————————————————————————————————— */}
      <section className="bg-ivory py-16 sm:py-20">
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="eyebrow text-gold-700">How It Works</p>
              <h2 className="mt-5 text-[1.9rem] leading-[1.08] text-forest-800 sm:text-[2.4rem]">
                Tell us the occasion, and we&rsquo;ll help you build the tray
              </h2>
              <Ornament width="sm" className="mt-6" />

              <div className="mt-7 space-y-5 text-[1rem] leading-[1.8] text-ink-soft">
                <p>
                  Most large orders start with a conversation: how many people,
                  what sort of event, and whether you want a mix or one or two
                  things in quantity.
                </p>
                <p>
                  From there we can talk through which sweets travel well,
                  which are best served fresh on the day, and how to put
                  together a selection that looks generous on the table.
                </p>
              </div>

              <ol className="mt-9 space-y-5">
                {[
                  {
                    step: "Get in touch",
                    body: "Call the shop or send an enquiry with your date and rough numbers.",
                  },
                  {
                    step: "Talk through the selection",
                    body: "We'll suggest what works for the occasion and the size of your group.",
                  },
                  {
                    step: "Collect or arrange delivery",
                    body: "We'll confirm what's possible for your date when you enquire.",
                  },
                ].map((item, index) => (
                  <li key={item.step} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/45 font-display text-[1.05rem] font-semibold text-forest-800"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-[1.15rem] leading-snug text-forest-800">
                        {item.step}
                      </h3>
                      <p className="mt-1 text-[0.92rem] leading-[1.65] text-ink-soft">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                <ButtonLink href="#enquiry" variant="gold" size="lg">
                  Enquire About a Large Order
                </ButtonLink>
                <ButtonLink href={`tel:${business.phone}`} variant="ghost" size="lg">
                  Call {business.displayPhone}
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal anim="rise" delay={80}>
              <div className="arch-top relative aspect-[4/4.4] overflow-hidden shadow-[0_28px_60px_-34px_rgba(18,59,42,0.6)]">
                <Photo
                  image="celebration-table"
                  fill
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* — Occasions ——————————————————————————————————————— */}
      <section className="texture-paper bg-cream py-16 sm:py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="What People Order For"
            title="Every Kind of Occasion"
            subtitle="A few of the reasons people come to us for a larger order. If yours isn't here, ask anyway."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occasion, index) => (
                <Reveal key={occasion.id} anim="rise" delay={index * 60}>
                  <article
                    id={occasion.id}
                    className="group h-full scroll-mt-32 overflow-hidden rounded-[var(--radius-lg-card)] border border-sand-dark/70 bg-ivory transition-all duration-500 ease-[var(--ease-soft)] hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-[0_24px_50px_-30px_rgba(18,59,42,0.4)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Photo
                        image={occasion.image}
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                        className="object-cover group-hover:scale-[1.05]"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-[1.3rem] leading-tight text-forest-800">
                        {occasion.title}
                      </h3>
                      <Ornament width="sm" className="mt-3.5" />
                      <p className="mt-3.5 text-[0.9rem] leading-[1.65] text-ink-soft">
                        {occasion.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* — Enquiry ————————————————————————————————————————— */}
      <section
        id="enquiry"
        className="scroll-mt-28 bg-sand/45 py-16 sm:py-20 lg:py-24"
      >
        <div className="container-page">
          <SectionHeading
            eyebrow="Get in Touch"
            title="Enquire About a Large Order"
            subtitle="Send us the details and we'll come back to you with what we can put together."
          />

          <Reveal className="mx-auto mt-12 max-w-3xl">
            <div className="rounded-[var(--radius-lg-card)] border border-sand-dark bg-ivory p-6 shadow-[0_20px_50px_-36px_rgba(18,59,42,0.5)] sm:p-9">
              <EnquiryForm />
            </div>
          </Reveal>
        </div>
      </section>

      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Catering & Events", path: "/catering" },
        ]}
      />
    </>
  );
}
