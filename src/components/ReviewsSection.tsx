import { business } from "@/data/business";
import { reviews } from "@/data/reviews";
import { GoogleRating } from "./GoogleRating";
import { ReviewCard } from "./ReviewCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function ReviewsSection() {
  return (
    <section className="relative overflow-hidden bg-forest-900 py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_60%_at_50%_0%,rgba(201,164,92,0.12),transparent_62%)]"
      />

      <div className="container-page relative">
        <SectionHeading
          eyebrow="Social Proof"
          title="Loved by Our Community"
          subtitle="A few words from our Google reviews."
          tone="light"
        />

        <Reveal className="mt-9 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-full border border-gold-400/25 bg-forest-800/50 px-6 py-3.5">
            <GoogleRating tone="light" variant="full" />
          </div>
        </Reveal>

        <div className="mt-11 grid gap-5 md:grid-cols-3 lg:gap-6">
          {reviews.map((review, index) => (
            <Reveal key={review.id} delay={index * 80} className="h-full">
              <ReviewCard review={review} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <a
            href={business.links.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline eyebrow inline-block px-2 py-2 text-gold-300 transition-colors duration-300 hover:text-gold-200"
          >
            Read all reviews on Google
          </a>
        </Reveal>
      </div>
    </section>
  );
}
