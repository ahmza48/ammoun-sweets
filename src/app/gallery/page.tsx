import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { CTASection } from "@/components/CTASection";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Gallery — Our Sweets, Platters & Shop",
  description:
    "See the sweets, platters and counter at Ammoun Sweets in Bass Hill: baklava, knafeh, ashta desserts, gift trays and celebration selections.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title={
          <>
            A Look at
            <span className="block font-normal italic text-gold-300">
              What We Make.
            </span>
          </>
        }
        subtitle="Sweets, platters and the counter itself — the best way to decide what you feel like."
        image="in-store-display"
      />

      <section className="texture-paper bg-cream py-14 sm:py-18 lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Browse"
            title="Our Sweets in Pictures"
            subtitle="Tap any photo to see it larger."
            className="mb-12"
          />
          <GalleryGrid />
        </div>
      </section>

      <CTASection />

      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ]}
      />
    </>
  );
}
