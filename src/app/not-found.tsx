import { ButtonLink } from "@/components/Button";
import { Ornament } from "@/components/Ornament";

export default function NotFound() {
  return (
    <section className="flex min-h-[70dvh] items-center bg-forest-900 pt-[4.5rem] lg:pt-[5.25rem]">
      <div className="container-narrow py-20 text-center">
        <p className="eyebrow text-gold-400">404</p>
        <h1 className="mt-5 text-[2.2rem] leading-tight text-ivory sm:text-[3rem]">
          We couldn&rsquo;t find that page.
        </h1>
        <Ornament tone="light" width="sm" className="mx-auto mt-6" />
        <p className="mt-6 text-[1rem] leading-[1.75] text-cream/70">
          It may have moved. The menu, the gallery and our shop details are all
          still here.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="gold" size="lg">
            Back Home
          </ButtonLink>
          <ButtonLink href="/menu" variant="outline" size="lg">
            See the Menu
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
