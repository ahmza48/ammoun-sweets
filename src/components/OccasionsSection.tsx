import { occasions } from "@/data/occasions";
import { ButtonLink } from "./Button";
import { CategoryCard } from "./CategoryCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/** Occasion cards — the commercial case for the site, in pictures. */

export function OccasionsSection() {
  return (
    <section className="relative bg-sand/45 py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="For Every Table"
          title="From an Afternoon Treat to a Table Full of Sweets"
          subtitle="Whatever the occasion, we can help you put together the right selection."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {occasions.map((occasion, index) => (
            <Reveal key={occasion.id} delay={index * 60}>
              <CategoryCard
                title={occasion.title}
                description={occasion.description}
                image={occasion.image}
                href={
                  occasion.id === "everyday"
                    ? "/menu"
                    : `/catering#${occasion.id}`
                }
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <ButtonLink href="/catering#enquiry" variant="ghost" size="lg">
            Enquire About a Large Order
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
