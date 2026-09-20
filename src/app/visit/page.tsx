import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { CTASection } from "@/components/CTASection";
import { LocationSection } from "@/components/LocationSection";
import { PageHero } from "@/components/PageHero";
import { addressLines } from "@/data/business";

export const metadata: Metadata = {
  title: "Visit Us — 972 Hume Highway, Bass Hill NSW",
  description:
    "Find Ammoun Sweets at 972 Hume Highway, Bass Hill NSW 2197. Opening hours, directions, parking and phone number for our Lebanese sweets shop.",
  alternates: { canonical: "/visit" },
};

export default function VisitPage() {
  return (
    <>
      <PageHero
        eyebrow="Visit Us"
        title={
          <>
            Come and See
            <span className="block font-normal italic text-gold-300">
              the Counter.
            </span>
          </>
        }
        subtitle={`${addressLines.join(", ")} — on the Hume Highway, with parking out the front.`}
        image="in-store-counter"
      />

      <LocationSection variant="full" />

      <CTASection />

      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Visit Us", path: "/visit" },
        ]}
      />
    </>
  );
}
