import type { Metadata } from "next";
import { CTASection } from "@/components/CTASection";
import { Hero } from "@/components/Hero";
import { LocationSection } from "@/components/LocationSection";
import { OccasionsSection } from "@/components/OccasionsSection";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SignatureSweets } from "@/components/SignatureSweets";
import { StorySection } from "@/components/StorySection";

export const metadata: Metadata = {
  title: "Ammoun Sweets | Lebanese Sweets & Desserts in Bass Hill",
  description:
    "Discover traditional Lebanese sweets, baklava, knafeh, ashta desserts and celebration platters at Ammoun Sweets in Bass Hill, NSW.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <SignatureSweets />
      <StorySection />
      <OccasionsSection />
      <ReviewsSection />
      <CTASection />
      <LocationSection />
    </>
  );
}
