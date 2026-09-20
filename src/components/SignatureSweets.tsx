import { menu, featuredItems } from "@/data/menu";
import { ButtonLink } from "./Button";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/**
 * Home page menu preview.
 *
 * One list, two layouts: a snap-scrolling rail on phones (a genuinely
 * intuitive gesture for a short horizontal set) and a plain grid from 640px.
 *
 * Deliberately NOT two copies of the markup with `sm:hidden` / `hidden sm:grid`
 * — browsers still download images inside a `display: none` subtree, and a
 * hidden element has no layout width, so `sizes` resolves to the largest
 * srcset candidate. That would have meant six oversized image requests on
 * every desktop visit.
 */

export function SignatureSweets() {
  const categoryByItemId = new Map(
    menu.flatMap((category) => category.items.map((item) => [item.id, category.name])),
  );

  return (
    <section
      id="signature-sweets"
      className="texture-paper relative bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="container-page">
        <SectionHeading
          eyebrow="From Our Counter"
          title="Our Signature Sweets"
          subtitle="Traditional favourites, prepared for everyday treats, family gatherings and special occasions."
        />

        <ul
          className={[
            // Phone: horizontal snap rail that bleeds into the page gutter.
            "swipe-rail mt-11 -mx-4 px-4",
            // Tablet and up: a regular grid, no scrolling.
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0",
            "lg:grid-cols-3 lg:gap-6",
          ].join(" ")}
        >
          {featuredItems.map((item, index) => (
            <li
              key={item.id}
              className="w-[78vw] max-w-[20rem] shrink-0 sm:w-auto sm:max-w-none"
            >
              <Reveal delay={index * 70} className="h-full">
                <ProductCard
                  item={item}
                  categoryLabel={categoryByItemId.get(item.id)}
                  priority={index < 2}
                />
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-[0.75rem] text-ink-faint sm:hidden">
          Swipe to see more
        </p>

        <Reveal className="mt-12 flex justify-center">
          <ButtonLink href="/menu" variant="ghost" size="lg">
            See the Full Menu
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
